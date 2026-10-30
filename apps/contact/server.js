require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Local fallback data directory (uses tmpdir in serverless Vercel)
const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'contactcache_data') : path.join(__dirname, 'data');
const LOCAL_DATA_FILE = path.join(DATA_DIR, 'contacts.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(LOCAL_DATA_FILE)) {
  const initialContacts = [
    {
      id: 'c_' + Date.now() + '_1',
      name: 'Sarah Connor',
      email: 'sarah.connor@cyberdyne.org',
      phone: '+1 (555) 234-5678',
      tag: 'Work',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'c_' + Date.now() + '_2',
      name: 'Alex Johnson',
      email: 'alex.j@gmail.com',
      phone: '+1 (555) 876-5432',
      tag: 'Friends',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'c_' + Date.now() + '_3',
      name: 'Dr. Emily Carter',
      email: '',
      phone: '+1 (555) 990-1122',
      tag: 'VIP',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify({ contacts: initialContacts, lastUpdated: new Date().toISOString() }, null, 2));
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helpers for JSONBin
function getEnvConfig() {
  return {
    apiKey: (process.env.JSONBIN_API_KEY || '').trim(),
    binId: (process.env.JSONBIN_BIN_ID || '').trim()
  };
}

function isJsonBinConfigured() {
  const { apiKey, binId } = getEnvConfig();
  return Boolean(apiKey && binId && !apiKey.startsWith('your_') && !binId.startsWith('your_'));
}

// Read from JSONBin or Local
async function readContacts() {
  const { apiKey, binId } = getEnvConfig();

  if (isJsonBinConfigured()) {
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        method: 'GET',
        headers: {
          'X-Master-Key': apiKey
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`JSONBin error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      let contacts = [];

      // JSONBin returns { record: ... }
      const record = data.record;
      if (Array.isArray(record)) {
        contacts = record;
      } else if (record && Array.isArray(record.contacts)) {
        contacts = record.contacts;
      } else if (record && typeof record === 'object') {
        // If empty object or unexpected structure
        contacts = [];
      }

      return {
        mode: 'jsonbin',
        contacts,
        lastUpdated: (record && record.lastUpdated) || data.metadata?.createdAt || new Date().toISOString()
      };
    } catch (err) {
      console.error('[JSONBin Read Error]', err.message);
      // Fallback to local cache with error flag
      const local = readLocalContacts();
      return {
        mode: 'local_fallback',
        warning: `JSONBin error: ${err.message}. Using local storage.`,
        contacts: local.contacts,
        lastUpdated: local.lastUpdated
      };
    }
  }

  // Not configured: use local JSON file
  const local = readLocalContacts();
  return {
    mode: 'local',
    contacts: local.contacts,
    lastUpdated: local.lastUpdated
  };
}

function readLocalContacts() {
  try {
    const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const contacts = Array.isArray(data) ? data : (data.contacts || []);
    return {
      contacts,
      lastUpdated: data.lastUpdated || new Date().toISOString()
    };
  } catch (e) {
    return { contacts: [], lastUpdated: new Date().toISOString() };
  }
}

// Write to JSONBin or Local
async function writeContacts(contacts) {
  const { apiKey, binId } = getEnvConfig();
  const lastUpdated = new Date().toISOString();
  const payload = { contacts, lastUpdated };

  // Always keep local copy as backup
  try {
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error('Error writing local backup:', e);
  }

  if (isJsonBinConfigured()) {
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`JSONBin update error (${res.status}): ${errorText}`);
      }

      return { success: true, mode: 'jsonbin', lastUpdated };
    } catch (err) {
      console.error('[JSONBin Write Error]', err.message);
      return { success: true, mode: 'local_fallback', warning: err.message, lastUpdated };
    }
  }

  return { success: true, mode: 'local', lastUpdated };
}

// API Routes

// 1. Status & Config
app.get('/api/status', (req, res) => {
  const { binId } = getEnvConfig();
  const configured = isJsonBinConfigured();
  const maskedBin = binId ? (binId.slice(0, 4) + '...' + binId.slice(-4)) : null;

  res.json({
    configured,
    mode: configured ? 'jsonbin' : 'local',
    binId: maskedBin,
    fullBinId: binId || '',
    timestamp: new Date().toISOString()
  });
});

// 2. Get all contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const result = await readContacts();
    res.json({
      success: true,
      mode: result.mode,
      warning: result.warning || null,
      contacts: result.contacts,
      lastUpdated: result.lastUpdated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Add Contact (Name is required, Mail, Phone, Tag are optional)
app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, phone, tag } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const { contacts } = await readContacts();

    const newContact = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      email: (email || '').trim(),
      phone: (phone || '').trim(),
      tag: (tag || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Prepend new contact
    const updatedList = [newContact, ...contacts];
    const writeResult = await writeContacts(updatedList);

    res.status(201).json({
      success: true,
      contact: newContact,
      mode: writeResult.mode,
      warning: writeResult.warning || null,
      lastUpdated: writeResult.lastUpdated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update Contact
app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, tag } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const { contacts } = await readContacts();
    const index = contacts.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const updatedContact = {
      ...contacts[index],
      name: name.trim(),
      email: email !== undefined ? (email || '').trim() : contacts[index].email,
      phone: phone !== undefined ? (phone || '').trim() : contacts[index].phone,
      tag: tag !== undefined ? (tag || '').trim() : contacts[index].tag,
      updatedAt: new Date().toISOString()
    };

    contacts[index] = updatedContact;
    const writeResult = await writeContacts(contacts);

    res.json({
      success: true,
      contact: updatedContact,
      mode: writeResult.mode,
      warning: writeResult.warning || null,
      lastUpdated: writeResult.lastUpdated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete Contact
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { contacts } = await readContacts();

    const initialLength = contacts.length;
    const filtered = contacts.filter(c => c.id !== id);

    if (filtered.length === initialLength) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const writeResult = await writeContacts(filtered);

    res.json({
      success: true,
      deletedId: id,
      mode: writeResult.mode,
      warning: writeResult.warning || null,
      lastUpdated: writeResult.lastUpdated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Update JSONBin configuration dynamically
app.post('/api/config', async (req, res) => {
  try {
    const { apiKey, binId } = req.body;

    if (!apiKey || !binId) {
      return res.status(400).json({ success: false, error: 'Both API Key and Bin ID are required' });
    }

    // Test JSONBin connection
    const testRes = await fetch(`https://api.jsonbin.io/v3/b/${binId.trim()}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': apiKey.trim()
      }
    });

    if (!testRes.ok) {
      const errorText = await testRes.text();
      return res.status(400).json({
        success: false,
        error: `Could not connect to JSONBin (${testRes.status}): ${errorText}`
      });
    }

    // Update in memory
    process.env.JSONBIN_API_KEY = apiKey.trim();
    process.env.JSONBIN_BIN_ID = binId.trim();

    // Persist to .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Replace or append
    if (/^JSONBIN_API_KEY=/m.test(envContent)) {
      envContent = envContent.replace(/^JSONBIN_API_KEY=.*/m, `JSONBIN_API_KEY=${apiKey.trim()}`);
    } else {
      envContent += `\nJSONBIN_API_KEY=${apiKey.trim()}`;
    }

    if (/^JSONBIN_BIN_ID=/m.test(envContent)) {
      envContent = envContent.replace(/^JSONBIN_BIN_ID=.*/m, `JSONBIN_BIN_ID=${binId.trim()}`);
    } else {
      envContent += `\nJSONBIN_BIN_ID=${binId.trim()}`;
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

    // Optionally migrate local contacts if remote bin is empty
    const testData = await testRes.json();
    const record = testData.record;
    let remoteContacts = [];
    if (Array.isArray(record)) {
      remoteContacts = record;
    } else if (record && Array.isArray(record.contacts)) {
      remoteContacts = record.contacts;
    }

    const localData = readLocalContacts();
    let migrated = false;
    if (remoteContacts.length === 0 && localData.contacts.length > 0) {
      await writeContacts(localData.contacts);
      migrated = true;
    }

    res.json({
      success: true,
      message: 'JSONBin connected successfully!',
      migrated,
      binId: binId.trim()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to get local network IP addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

// Start server (only if run directly or not on Vercel)
if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    const ips = getNetworkIps();
    console.log('==================================================');
    console.log(`🚀 ContactCache is live at:`);
    console.log(`   - Local:    http://localhost:${PORT}`);
    ips.forEach(ip => {
      console.log(`   - Network:  http://${ip}:${PORT} (Open on phones/tablets to install)`);
    });
    console.log(`📁 Mode: ${isJsonBinConfigured() ? 'Cloud Sync (JSONbin.io)' : 'Local JSON Mode (Configure .env for Cloud Sync)'}`);
    console.log('==================================================');
  });
}

module.exports = app;
