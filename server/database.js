import { createClient } from '@libsql/client';
import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TURSO_URL = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

export const isCloudDb = Boolean(TURSO_URL);

let cloudClient = null;
let sqlJsInstance = null;
let DB_FILE = null;

// Initialize connection
export async function initDb() {
  if (isCloudDb) {
    if (!cloudClient) {
      console.log('⚡ Connecting to Persistent Cloud Database (Turso LibSQL)...');
      cloudClient = createClient({
        url: TURSO_URL,
        authToken: TURSO_AUTH_TOKEN
      });
      await runSchema(cloudClient);
      console.log('✅ Connected to Persistent Cloud Database!');
    }
    return cloudClient;
  }

  // Local SQLite Fallback
  if (sqlJsInstance) return sqlJsInstance;

  const DATA_DIR = path.join(__dirname, 'data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  DB_FILE = path.join(DATA_DIR, 'onlyd.sqlite');

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      sqlJsInstance = new SQL.Database(fileBuffer);
    } catch {
      sqlJsInstance = new SQL.Database();
    }
  } else {
    sqlJsInstance = new SQL.Database();
  }

  await runLocalSchema(sqlJsInstance);
  saveLocalDbToDisk();
  return sqlJsInstance;
}

function saveLocalDbToDisk() {
  if (!sqlJsInstance || !DB_FILE) return;
  try {
    const data = sqlJsInstance.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  } catch (err) {
    console.error('Failed to save local SQLite file:', err);
  }
}

// DDL Table Schemas
const SCHEMA_TABLES = [
  `CREATE TABLE IF NOT EXISTS shelf_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    creator TEXT,
    type TEXT,
    status TEXT,
    genre TEXT,
    rating INTEGER DEFAULT 5,
    notes TEXT,
    coverUrl TEXT,
    favorite INTEGER DEFAULT 0,
    collectionIds TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS shelf_genres (name TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS shelf_collections (id TEXT PRIMARY KEY, name TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS budget_goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    targetAmount REAL DEFAULT 0,
    currentAmount REAL DEFAULT 0,
    targetDate TEXT,
    createdAt TEXT,
    history TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS budget_expenses (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    category TEXT,
    paymentMethod TEXT,
    date TEXT,
    note TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    tag TEXT,
    notes TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS vault_passwords (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT,
    email TEXT,
    password TEXT,
    url TEXT,
    category TEXT,
    notes TEXT,
    updatedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS vault_links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    tag TEXT,
    note TEXT,
    savedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS wishlist_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    price REAL DEFAULT 0,
    category TEXT,
    priority TEXT,
    url TEXT,
    notes TEXT,
    purchased INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS wishlist_categories (name TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    source TEXT,
    roundsReached TEXT,
    status TEXT,
    notes TEXT,
    appliedDate TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS period_settings (
    id TEXT PRIMARY KEY,
    cycleDuration INTEGER DEFAULT 28,
    periodDuration INTEGER DEFAULT 5,
    updatedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS period_logs (
    id TEXT PRIMARY KEY,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    flow TEXT DEFAULT 'Medium',
    notes TEXT,
    symptoms TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`
];

async function runSchema(client) {
  for (const tableSql of SCHEMA_TABLES) {
    await client.execute(tableSql);
  }
}

async function runLocalSchema(db) {
  for (const tableSql of SCHEMA_TABLES) {
    db.run(tableSql);
  }
}

// Unified Query Execution
export async function dbRun(sql, params = []) {
  await initDb();
  if (isCloudDb) {
    return await cloudClient.execute({ sql, args: params });
  } else {
    sqlJsInstance.run(sql, params);
    saveLocalDbToDisk();
  }
}

export async function dbAll(sql, params = []) {
  await initDb();
  if (isCloudDb) {
    const res = await cloudClient.execute({ sql, args: params });
    return res.rows.map(row => ({ ...row }));
  } else {
    const stmt = sqlJsInstance.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }
}

export async function dbGet(sql, params = []) {
  const rows = await dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Retrieve entire state for sync
export async function getFullPayload() {
  await initDb();

  const shelfItems = (await dbAll('SELECT * FROM shelf_items ORDER BY createdAt DESC')).map(item => ({
    ...item,
    favorite: Boolean(item.favorite),
    collectionIds: item.collectionIds ? JSON.parse(item.collectionIds) : []
  }));

  const shelfGenres = (await dbAll('SELECT name FROM shelf_genres')).map(g => g.name);
  const shelfCollections = await dbAll('SELECT * FROM shelf_collections');

  const budgetGoals = (await dbAll('SELECT * FROM budget_goals ORDER BY createdAt DESC')).map(g => ({
    ...g,
    history: g.history ? JSON.parse(g.history) : []
  }));
  const budgetExpenses = await dbAll('SELECT * FROM budget_expenses ORDER BY date DESC');

  const contacts = await dbAll('SELECT * FROM contacts ORDER BY name ASC');

  const vaultPasswords = await dbAll('SELECT * FROM vault_passwords ORDER BY name ASC');
  const vaultLinks = await dbAll('SELECT * FROM vault_links ORDER BY savedAt DESC');

  const wishlistItems = (await dbAll('SELECT * FROM wishlist_items ORDER BY createdAt DESC')).map(w => ({
    ...w,
    purchased: Boolean(w.purchased)
  }));
  const wishlistCategories = (await dbAll('SELECT name FROM wishlist_categories')).map(c => c.name);

  const jobApplications = await dbAll('SELECT * FROM job_applications ORDER BY createdAt DESC');

  const periodSettingsRow = await dbGet("SELECT * FROM period_settings WHERE id = 'default'");
  const periodSettings = periodSettingsRow ? {
    cycleDuration: Number(periodSettingsRow.cycleDuration) || 28,
    periodDuration: Number(periodSettingsRow.periodDuration) || 5
  } : {
    cycleDuration: 28,
    periodDuration: 5
  };

  const periodLogs = (await dbAll('SELECT * FROM period_logs ORDER BY startDate DESC')).map(l => ({
    ...l,
    symptoms: l.symptoms ? JSON.parse(l.symptoms) : []
  }));

  const lastUpdatedRow = await dbGet("SELECT value FROM meta WHERE key = 'lastUpdated'");

  return {
    shelf: {
      items: shelfItems,
      genres: shelfGenres.length > 0 ? shelfGenres : ["Self-Improvement", "Sci-Fi", "Productivity", "Thriller", "Design", "Philosophy", "Fiction"],
      collections: shelfCollections
    },
    budget: {
      goals: budgetGoals,
      expenses: budgetExpenses
    },
    contacts,
    vault: {
      passwords: vaultPasswords,
      links: vaultLinks
    },
    wishlist: {
      items: wishlistItems,
      categories: wishlistCategories.length > 0 ? wishlistCategories : ["Tech", "Workstation", "Books", "Lifestyle", "Fashion", "Other"]
    },
    jobs: jobApplications,
    period: {
      settings: periodSettings,
      logs: periodLogs
    },
    meta: {
      version: '3.0-persistent',
      database: isCloudDb ? 'Turso Cloud SQLite' : 'Local SQLite',
      lastUpdated: lastUpdatedRow?.value || null
    }
  };
}

// Atomically import or synchronize full state
export async function importFullPayload(data) {
  await initDb();
  const now = new Date().toISOString();

  if (isCloudDb) {
    // Cloud LibSQL Batch Transaction
    const batch = [];

    // 1. Shelf
    if (Array.isArray(data.shelf?.items)) {
      batch.push({ sql: 'DELETE FROM shelf_items', args: [] });
      for (const item of data.shelf.items) {
        batch.push({
          sql: `INSERT INTO shelf_items 
            (id, title, creator, type, status, genre, rating, notes, coverUrl, favorite, collectionIds, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            item.id, item.title, item.creator || '', item.type || 'Book', item.status || 'Currently Reading',
            item.genre || '', item.rating || 5, item.notes || '', item.coverUrl || '', item.favorite ? 1 : 0,
            JSON.stringify(item.collectionIds || []), item.createdAt || now, item.updatedAt || now
          ]
        });
      }
    }

    if (Array.isArray(data.shelf?.genres)) {
      for (const g of data.shelf.genres) {
        if (g) batch.push({ sql: 'INSERT OR IGNORE INTO shelf_genres (name) VALUES (?)', args: [g] });
      }
    }

    if (Array.isArray(data.shelf?.collections)) {
      for (const c of data.shelf.collections) {
        if (c?.id) batch.push({ sql: 'INSERT OR REPLACE INTO shelf_collections (id, name) VALUES (?, ?)', args: [c.id, c.name] });
      }
    }

    // 2. Budget
    if (Array.isArray(data.budget?.goals)) {
      batch.push({ sql: 'DELETE FROM budget_goals', args: [] });
      for (const g of data.budget.goals) {
        batch.push({
          sql: `INSERT INTO budget_goals (id, name, targetAmount, currentAmount, targetDate, createdAt, history)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [g.id, g.name, Number(g.targetAmount) || 0, Number(g.currentAmount) || 0, g.targetDate || '', g.createdAt || now, JSON.stringify(g.history || [])]
        });
      }
    }

    if (Array.isArray(data.budget?.expenses)) {
      batch.push({ sql: 'DELETE FROM budget_expenses', args: [] });
      for (const exp of data.budget.expenses) {
        batch.push({
          sql: `INSERT INTO budget_expenses (id, amount, category, paymentMethod, date, note) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [exp.id, Number(exp.amount) || 0, exp.category || '', exp.paymentMethod || 'UPI', exp.date || now, exp.note || '']
        });
      }
    }

    // 3. Contacts
    if (Array.isArray(data.contacts)) {
      batch.push({ sql: 'DELETE FROM contacts', args: [] });
      for (const c of data.contacts) {
        batch.push({
          sql: `INSERT INTO contacts (id, name, phone, email, tag, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [c.id, c.name, c.phone || '', c.email || '', c.tag || '', c.notes || '', c.createdAt || now, c.updatedAt || now]
        });
      }
    }

    // 4. Vault
    if (Array.isArray(data.vault?.passwords)) {
      batch.push({ sql: 'DELETE FROM vault_passwords', args: [] });
      for (const p of data.vault.passwords) {
        batch.push({
          sql: `INSERT INTO vault_passwords (id, name, username, email, password, url, category, notes, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [p.id, p.name, p.username || '', p.email || '', p.password || '', p.url || '', p.category || 'Personal', p.notes || '', p.updatedAt || now]
        });
      }
    }

    if (Array.isArray(data.vault?.links)) {
      batch.push({ sql: 'DELETE FROM vault_links', args: [] });
      for (const l of data.vault.links) {
        batch.push({
          sql: `INSERT INTO vault_links (id, title, url, tag, note, savedAt) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [l.id, l.title, l.url, l.tag || 'General', l.note || '', l.savedAt || now]
        });
      }
    }

    // 5. Wishlist
    if (Array.isArray(data.wishlist?.items)) {
      batch.push({ sql: 'DELETE FROM wishlist_items', args: [] });
      for (const w of data.wishlist.items) {
        batch.push({
          sql: `INSERT INTO wishlist_items (id, title, price, category, priority, url, notes, purchased, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [w.id, w.title, Number(w.price) || 0, w.category || 'Tech', w.priority || 'high', w.url || '', w.notes || '', w.purchased ? 1 : 0, w.createdAt || now, w.updatedAt || now]
        });
      }
    }

    if (Array.isArray(data.wishlist?.categories)) {
      for (const cat of data.wishlist.categories) {
        if (cat) batch.push({ sql: 'INSERT OR IGNORE INTO wishlist_categories (name) VALUES (?)', args: [cat] });
      }
    }

    // 6. Jobs
    if (Array.isArray(data.jobs)) {
      batch.push({ sql: 'DELETE FROM job_applications', args: [] });
      for (const job of data.jobs) {
        batch.push({
          sql: `INSERT INTO job_applications (id, company, role, source, roundsReached, status, notes, appliedDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [job.id, job.company, job.role, job.source || '', job.roundsReached || 'Applied', job.status || 'Applied', job.notes || '', job.appliedDate || now, job.createdAt || now, job.updatedAt || now]
        });
      }
    }

    // 7. Period
    if (data.period?.settings) {
      const s = data.period.settings;
      batch.push({
        sql: `INSERT OR REPLACE INTO period_settings (id, cycleDuration, periodDuration, updatedAt) VALUES ('default', ?, ?, ?)`,
        args: [Number(s.cycleDuration) || 28, Number(s.periodDuration) || 5, now]
      });
    }

    if (Array.isArray(data.period?.logs)) {
      batch.push({ sql: 'DELETE FROM period_logs', args: [] });
      for (const log of data.period.logs) {
        batch.push({
          sql: `INSERT INTO period_logs (id, startDate, endDate, flow, notes, symptoms, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [log.id, log.startDate, log.endDate, log.flow || 'Medium', log.notes || '', JSON.stringify(log.symptoms || []), log.createdAt || now, log.updatedAt || now]
        });
      }
    }

    batch.push({
      sql: `INSERT OR REPLACE INTO meta (key, value) VALUES ('lastUpdated', ?)`,
      args: [now]
    });

    await cloudClient.batch(batch, 'write');
  } else {
    // Local SQLite Batch Execution
    if (Array.isArray(data.shelf?.items)) {
      sqlJsInstance.run('DELETE FROM shelf_items');
      for (const item of data.shelf.items) {
        sqlJsInstance.run(`
          INSERT INTO shelf_items 
          (id, title, creator, type, status, genre, rating, notes, coverUrl, favorite, collectionIds, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          item.id, item.title, item.creator || '', item.type || 'Book', item.status || 'Currently Reading',
          item.genre || '', item.rating || 5, item.notes || '', item.coverUrl || '', item.favorite ? 1 : 0,
          JSON.stringify(item.collectionIds || []), item.createdAt || now, item.updatedAt || now
        ]);
      }
    }

    if (Array.isArray(data.shelf?.genres)) {
      for (const g of data.shelf.genres) {
        if (g) sqlJsInstance.run('INSERT OR IGNORE INTO shelf_genres (name) VALUES (?)', [g]);
      }
    }

    if (Array.isArray(data.shelf?.collections)) {
      for (const c of data.shelf.collections) {
        if (c?.id) sqlJsInstance.run('INSERT OR REPLACE INTO shelf_collections (id, name) VALUES (?, ?)', [c.id, c.name]);
      }
    }

    if (Array.isArray(data.budget?.goals)) {
      sqlJsInstance.run('DELETE FROM budget_goals');
      for (const g of data.budget.goals) {
        sqlJsInstance.run(`
          INSERT INTO budget_goals (id, name, targetAmount, currentAmount, targetDate, createdAt, history)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [g.id, g.name, Number(g.targetAmount) || 0, Number(g.currentAmount) || 0, g.targetDate || '', g.createdAt || now, JSON.stringify(g.history || [])]);
      }
    }

    if (Array.isArray(data.budget?.expenses)) {
      sqlJsInstance.run('DELETE FROM budget_expenses');
      for (const exp of data.budget.expenses) {
        sqlJsInstance.run(`
          INSERT INTO budget_expenses (id, amount, category, paymentMethod, date, note) VALUES (?, ?, ?, ?, ?, ?)
        `, [exp.id, Number(exp.amount) || 0, exp.category || '', exp.paymentMethod || 'UPI', exp.date || now, exp.note || '']);
      }
    }

    if (Array.isArray(data.contacts)) {
      sqlJsInstance.run('DELETE FROM contacts');
      for (const c of data.contacts) {
        sqlJsInstance.run(`
          INSERT INTO contacts (id, name, phone, email, tag, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [c.id, c.name, c.phone || '', c.email || '', c.tag || '', c.notes || '', c.createdAt || now, c.updatedAt || now]);
      }
    }

    if (Array.isArray(data.vault?.passwords)) {
      sqlJsInstance.run('DELETE FROM vault_passwords');
      for (const p of data.vault.passwords) {
        sqlJsInstance.run(`
          INSERT INTO vault_passwords (id, name, username, email, password, url, category, notes, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [p.id, p.name, p.username || '', p.email || '', p.password || '', p.url || '', p.category || 'Personal', p.notes || '', p.updatedAt || now]);
      }
    }

    if (Array.isArray(data.vault?.links)) {
      sqlJsInstance.run('DELETE FROM vault_links');
      for (const l of data.vault.links) {
        sqlJsInstance.run(`
          INSERT INTO vault_links (id, title, url, tag, note, savedAt) VALUES (?, ?, ?, ?, ?, ?)
        `, [l.id, l.title, l.url, l.tag || 'General', l.note || '', l.savedAt || now]);
      }
    }

    if (Array.isArray(data.wishlist?.items)) {
      sqlJsInstance.run('DELETE FROM wishlist_items');
      for (const w of data.wishlist.items) {
        sqlJsInstance.run(`
          INSERT INTO wishlist_items (id, title, price, category, priority, url, notes, purchased, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [w.id, w.title, Number(w.price) || 0, w.category || 'Tech', w.priority || 'high', w.url || '', w.notes || '', w.purchased ? 1 : 0, w.createdAt || now, w.updatedAt || now]);
      }
    }

    if (Array.isArray(data.wishlist?.categories)) {
      for (const cat of data.wishlist.categories) {
        if (cat) sqlJsInstance.run('INSERT OR IGNORE INTO wishlist_categories (name) VALUES (?)', [cat]);
      }
    }

    if (Array.isArray(data.jobs)) {
      sqlJsInstance.run('DELETE FROM job_applications');
      for (const job of data.jobs) {
        sqlJsInstance.run(`
          INSERT INTO job_applications (id, company, role, source, roundsReached, status, notes, appliedDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [job.id, job.company, job.role, job.source || '', job.roundsReached || 'Applied', job.status || 'Applied', job.notes || '', job.appliedDate || now, job.createdAt || now, job.updatedAt || now]);
      }
    }

    if (data.period?.settings) {
      const s = data.period.settings;
      sqlJsInstance.run(`
        INSERT OR REPLACE INTO period_settings (id, cycleDuration, periodDuration, updatedAt) VALUES ('default', ?, ?, ?)
      `, [Number(s.cycleDuration) || 28, Number(s.periodDuration) || 5, now]);
    }

    if (Array.isArray(data.period?.logs)) {
      sqlJsInstance.run('DELETE FROM period_logs');
      for (const log of data.period.logs) {
        sqlJsInstance.run(`
          INSERT INTO period_logs (id, startDate, endDate, flow, notes, symptoms, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [log.id, log.startDate, log.endDate, log.flow || 'Medium', log.notes || '', JSON.stringify(log.symptoms || []), log.createdAt || now, log.updatedAt || now]);
      }
    }

    sqlJsInstance.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('lastUpdated', ?)", [now]);
    saveLocalDbToDisk();
  }
}
