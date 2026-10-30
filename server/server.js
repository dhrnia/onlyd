import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDb,
  getFullPayload,
  importFullPayload,
  dbRun,
  dbGet,
  dbAll
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite database
await initDb();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Static client build
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ==========================================
// SYSTEM & DATA ENDPOINTS (SQLITE BACKED)
// ==========================================

// Server & Database status
app.get('/api/status', async (req, res) => {
  try {
    const payload = await getFullPayload();
    res.json({
      status: 'online',
      appName: 'OnlyD Hub',
      database: 'SQLite (ACID Compliant)',
      databasePath: 'server/data/onlyd.sqlite',
      serverTime: new Date().toISOString(),
      port: PORT,
      lastUpdated: payload.meta?.lastUpdated || null,
      counts: {
        shelf: payload.shelf?.items?.length || 0,
        budgetGoals: payload.budget?.goals?.length || 0,
        budgetExpenses: payload.budget?.expenses?.length || 0,
        contacts: payload.contacts?.length || 0,
        vaultPasswords: payload.vault?.passwords?.length || 0,
        vaultLinks: payload.vault?.links?.length || 0,
        wishlist: payload.wishlist?.items?.length || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full database payload for client sync hydration
app.get('/api/data', async (req, res) => {
  try {
    const payload = await getFullPayload();
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync Endpoint (Persists to SQLite)
app.post('/api/sync', async (req, res) => {
  try {
    const clientData = req.body;
    if (!clientData || typeof clientData !== 'object') {
      return res.status(400).json({ error: 'Invalid sync payload' });
    }
    await importFullPayload(clientData);
    const updated = await getFullPayload();
    res.json({
      success: true,
      syncedAt: updated.meta.lastUpdated,
      data: updated
    });
  } catch (err) {
    console.error('SQLite sync failed:', err);
    res.status(500).json({ error: 'Sync failed: ' + err.message });
  }
});

// Database Export (Full JSON backup from SQLite)
app.get('/api/backup/export', async (req, res) => {
  try {
    const payload = await getFullPayload();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=onlyd-database-backup-${new Date().toISOString().slice(0, 10)}.json`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database Import (Restore into SQLite)
app.post('/api/backup/import', async (req, res) => {
  try {
    const importData = req.body;
    if (!importData || typeof importData !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    await importFullPayload(importData);
    const updated = await getFullPayload();
    res.json({ success: true, message: 'Database restored successfully to SQLite', data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

// ==========================================
// APP SPECIFIC CRUD API (DIRECT SQLITE QUERIES)
// ==========================================

// 1. SHELF
app.get('/api/shelf', async (req, res) => {
  const payload = await getFullPayload();
  res.json(payload.shelf);
});

app.post('/api/shelf/items', async (req, res) => {
  const item = req.body;
  const id = item.id || `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  await dbRun(`
    INSERT INTO shelf_items 
    (id, title, creator, type, status, genre, rating, notes, coverUrl, favorite, collectionIds, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    item.title,
    item.creator || '',
    item.type || 'Book',
    item.status || 'Currently Reading',
    item.genre || '',
    item.rating || 5,
    item.notes || '',
    item.coverUrl || '',
    item.favorite ? 1 : 0,
    JSON.stringify(item.collectionIds || []),
    now,
    now
  ]);
  if (item.genre) {
    await dbRun('INSERT OR IGNORE INTO shelf_genres (name) VALUES (?)', [item.genre]);
  }
  res.json({ ...item, id, createdAt: now, updatedAt: now });
});

app.put('/api/shelf/items/:id', async (req, res) => {
  const id = req.params.id;
  const item = req.body;
  const now = new Date().toISOString();
  await dbRun(`
    UPDATE shelf_items SET
      title = ?, creator = ?, type = ?, status = ?, genre = ?, rating = ?, 
      notes = ?, coverUrl = ?, favorite = ?, collectionIds = ?, updatedAt = ?
    WHERE id = ?
  `, [
    item.title,
    item.creator || '',
    item.type || 'Book',
    item.status || 'Currently Reading',
    item.genre || '',
    item.rating || 5,
    item.notes || '',
    item.coverUrl || '',
    item.favorite ? 1 : 0,
    JSON.stringify(item.collectionIds || []),
    now,
    id
  ]);
  res.json({ ...item, id, updatedAt: now });
});

app.delete('/api/shelf/items/:id', async (req, res) => {
  await dbRun('DELETE FROM shelf_items WHERE id = ?', [req.params.id]);
  res.json({ success: true, id: req.params.id });
});

// 2. BUDGET
app.get('/api/budget', async (req, res) => {
  const payload = await getFullPayload();
  res.json(payload.budget);
});

app.post('/api/budget/goals', async (req, res) => {
  const g = req.body;
  const id = g.id || `goal-${Date.now()}`;
  const now = new Date().toISOString();
  await dbRun(`
    INSERT INTO budget_goals (id, name, targetAmount, currentAmount, targetDate, createdAt, history)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    g.name,
    Number(g.targetAmount) || 0,
    Number(g.currentAmount) || 0,
    g.targetDate || '',
    now,
    JSON.stringify(g.history || [])
  ]);
  res.json({ ...g, id, createdAt: now });
});

app.delete('/api/budget/goals/:id', async (req, res) => {
  await dbRun('DELETE FROM budget_goals WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/budget/expenses', async (req, res) => {
  const exp = req.body;
  const id = exp.id || `exp-${Date.now()}`;
  const now = new Date().toISOString();
  await dbRun(`
    INSERT INTO budget_expenses (id, amount, category, paymentMethod, date, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    Number(exp.amount) || 0,
    exp.category || 'Other',
    exp.paymentMethod || 'UPI',
    exp.date || now,
    exp.note || ''
  ]);
  res.json({ ...exp, id });
});

app.delete('/api/budget/expenses/:id', async (req, res) => {
  await dbRun('DELETE FROM budget_expenses WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// 3. CONTACTS
app.get('/api/contacts', async (req, res) => {
  const contacts = await dbAll('SELECT * FROM contacts ORDER BY name ASC');
  res.json(contacts);
});

app.post('/api/contacts', async (req, res) => {
  const c = req.body;
  const id = c.id || `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  await dbRun(`
    INSERT INTO contacts (id, name, phone, email, tag, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, c.name, c.phone || '', c.email || '', c.tag || '', c.notes || '', now, now]);
  res.json({ ...c, id, createdAt: now, updatedAt: now });
});

app.put('/api/contacts/:id', async (req, res) => {
  const id = req.params.id;
  const c = req.body;
  const now = new Date().toISOString();
  await dbRun(`
    UPDATE contacts SET name = ?, phone = ?, email = ?, tag = ?, notes = ?, updatedAt = ?
    WHERE id = ?
  `, [c.name, c.phone || '', c.email || '', c.tag || '', c.notes || '', now, id]);
  res.json({ ...c, id, updatedAt: now });
});

app.delete('/api/contacts/:id', async (req, res) => {
  await dbRun('DELETE FROM contacts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// 4. VAULT
app.get('/api/vault', async (req, res) => {
  const payload = await getFullPayload();
  res.json(payload.vault);
});

app.post('/api/vault/passwords', async (req, res) => {
  const p = req.body;
  const id = p.id || `v-pwd-${Date.now()}`;
  const now = new Date().toISOString();
  await dbRun(`
    INSERT INTO vault_passwords (id, name, username, email, password, url, category, notes, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, p.name, p.username || '', p.email || '', p.password, p.url || '', p.category || 'Personal', p.notes || '', now]);
  res.json({ ...p, id, updatedAt: now });
});

app.put('/api/vault/passwords/:id', async (req, res) => {
  const id = req.params.id;
  const p = req.body;
  const now = new Date().toISOString();
  await dbRun(`
    UPDATE vault_passwords SET name = ?, username = ?, email = ?, password = ?, url = ?, category = ?, notes = ?, updatedAt = ?
    WHERE id = ?
  `, [p.name, p.username || '', p.email || '', p.password, p.url || '', p.category || 'Personal', p.notes || '', now, id]);
  res.json({ ...p, id, updatedAt: now });
});

app.delete('/api/vault/passwords/:id', async (req, res) => {
  await dbRun('DELETE FROM vault_passwords WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/vault/links', async (req, res) => {
  const l = req.body;
  const id = l.id || `v-link-${Date.now()}`;
  const now = new Date().toISOString();
  await dbRun(`
    INSERT INTO vault_links (id, title, url, tag, note, savedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, l.title, l.url, l.tag || 'General', l.note || '', now]);
  res.json({ ...l, id, savedAt: now });
});

app.delete('/api/vault/links/:id', async (req, res) => {
  await dbRun('DELETE FROM vault_links WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// 5. WISHLIST
app.get('/api/wishlist', async (req, res) => {
  const payload = await getFullPayload();
  res.json(payload.wishlist);
});

app.post('/api/wishlist/items', async (req, res) => {
  const w = req.body;
  const id = w.id || `w-item-${Date.now()}`;
  const now = new Date().toISOString();
  await dbRun(`
    INSERT INTO wishlist_items (id, title, price, category, priority, url, notes, purchased, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    w.title,
    Number(w.price) || 0,
    w.category || 'Tech',
    w.priority || 'high',
    w.url || '',
    w.notes || '',
    w.purchased ? 1 : 0,
    now,
    now
  ]);
  res.json({ ...w, id, createdAt: now, updatedAt: now });
});

app.delete('/api/wishlist/items/:id', async (req, res) => {
  await dbRun('DELETE FROM wishlist_items WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// Client SPA fallback
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`  🚀 OnlyD Hub Started!`);
  console.log(`  Database:   SQLite (server/data/onlyd.sqlite)`);
  console.log(`  Server:     http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
