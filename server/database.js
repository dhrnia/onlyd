import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'onlyd.sqlite');

let dbInstance = null;

// Save SQLite database file to disk
export function saveDbToDisk() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

// Helper to run queries with params and auto-save
export async function dbRun(sql, params = []) {
  if (!dbInstance) await initDb();
  dbInstance.run(sql, params);
  saveDbToDisk();
}

// Helper to query all matching rows as objects
export async function dbAll(sql, params = []) {
  if (!dbInstance) await initDb();
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper to get first matching row as object
export async function dbGet(sql, params = []) {
  const rows = await dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Initialize tables
export async function initDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Could not load existing sqlite file, creating fresh:', err.message);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS shelf_items (
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
    );

    CREATE TABLE IF NOT EXISTS shelf_genres (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS shelf_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      targetAmount REAL DEFAULT 0,
      currentAmount REAL DEFAULT 0,
      targetDate TEXT,
      createdAt TEXT,
      history TEXT
    );

    CREATE TABLE IF NOT EXISTS budget_expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      category TEXT,
      paymentMethod TEXT,
      date TEXT,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      tag TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS vault_passwords (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT,
      email TEXT,
      password TEXT,
      url TEXT,
      category TEXT,
      notes TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS vault_links (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      tag TEXT,
      note TEXT,
      savedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
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
    );

    CREATE TABLE IF NOT EXISTS wishlist_categories (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS job_applications (
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
    );

    CREATE TABLE IF NOT EXISTS period_settings (
      id TEXT PRIMARY KEY,
      cycleDuration INTEGER DEFAULT 28,
      periodDuration INTEGER DEFAULT 5,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS period_logs (
      id TEXT PRIMARY KEY,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      flow TEXT DEFAULT 'Medium',
      notes TEXT,
      symptoms TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  saveDbToDisk();
  return dbInstance;
}

export async function getFullPayload() {
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
      version: '2.1-sqlite',
      database: 'SQLite (WebAssembly)',
      lastUpdated: lastUpdatedRow?.value || new Date().toISOString()
    }
  };
}

export async function importFullPayload(data) {
  if (!dbInstance) await initDb();
  const now = new Date().toISOString();

  // 1. Shelf
  if (Array.isArray(data.shelf?.items)) {
    dbInstance.run('DELETE FROM shelf_items');
    for (const item of data.shelf.items) {
      dbInstance.run(`
        INSERT INTO shelf_items 
        (id, title, creator, type, status, genre, rating, notes, coverUrl, favorite, collectionIds, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id,
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
        item.createdAt || now,
        item.updatedAt || now
      ]);
    }
  }

  if (Array.isArray(data.shelf?.genres)) {
    for (const g of data.shelf.genres) {
      if (g) dbInstance.run('INSERT OR IGNORE INTO shelf_genres (name) VALUES (?)', [g]);
    }
  }

  if (Array.isArray(data.shelf?.collections)) {
    for (const c of data.shelf.collections) {
      if (c?.id) dbInstance.run('INSERT OR REPLACE INTO shelf_collections (id, name) VALUES (?, ?)', [c.id, c.name]);
    }
  }

  // 2. Budget
  if (Array.isArray(data.budget?.goals)) {
    dbInstance.run('DELETE FROM budget_goals');
    for (const g of data.budget.goals) {
      dbInstance.run(`
        INSERT INTO budget_goals 
        (id, name, targetAmount, currentAmount, targetDate, createdAt, history)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        g.id,
        g.name,
        Number(g.targetAmount) || 0,
        Number(g.currentAmount) || 0,
        g.targetDate || '',
        g.createdAt || now,
        JSON.stringify(g.history || [])
      ]);
    }
  }

  if (Array.isArray(data.budget?.expenses)) {
    dbInstance.run('DELETE FROM budget_expenses');
    for (const exp of data.budget.expenses) {
      dbInstance.run(`
        INSERT INTO budget_expenses 
        (id, amount, category, paymentMethod, date, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        exp.id,
        Number(exp.amount) || 0,
        exp.category || '',
        exp.paymentMethod || 'UPI',
        exp.date || now,
        exp.note || ''
      ]);
    }
  }

  // 3. Contacts
  if (Array.isArray(data.contacts)) {
    dbInstance.run('DELETE FROM contacts');
    for (const c of data.contacts) {
      dbInstance.run(`
        INSERT INTO contacts 
        (id, name, phone, email, tag, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        c.id,
        c.name,
        c.phone || '',
        c.email || '',
        c.tag || '',
        c.notes || '',
        c.createdAt || now,
        c.updatedAt || now
      ]);
    }
  }

  // 4. Vault
  if (Array.isArray(data.vault?.passwords)) {
    dbInstance.run('DELETE FROM vault_passwords');
    for (const p of data.vault.passwords) {
      dbInstance.run(`
        INSERT INTO vault_passwords 
        (id, name, username, email, password, url, category, notes, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        p.id,
        p.name,
        p.username || '',
        p.email || '',
        p.password || '',
        p.url || '',
        p.category || 'Personal',
        p.notes || '',
        p.updatedAt || now
      ]);
    }
  }

  if (Array.isArray(data.vault?.links)) {
    dbInstance.run('DELETE FROM vault_links');
    for (const l of data.vault.links) {
      dbInstance.run(`
        INSERT INTO vault_links 
        (id, title, url, tag, note, savedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        l.id,
        l.title,
        l.url,
        l.tag || 'General',
        l.note || '',
        l.savedAt || now
      ]);
    }
  }

  // 5. Wishlist
  if (Array.isArray(data.wishlist?.items)) {
    dbInstance.run('DELETE FROM wishlist_items');
    for (const w of data.wishlist.items) {
      dbInstance.run(`
        INSERT INTO wishlist_items 
        (id, title, price, category, priority, url, notes, purchased, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        w.id,
        w.title,
        Number(w.price) || 0,
        w.category || 'Tech',
        w.priority || 'high',
        w.url || '',
        w.notes || '',
        w.purchased ? 1 : 0,
        w.createdAt || now,
        w.updatedAt || now
      ]);
    }
  }

  if (Array.isArray(data.wishlist?.categories)) {
    for (const cat of data.wishlist.categories) {
      if (cat) dbInstance.run('INSERT OR IGNORE INTO wishlist_categories (name) VALUES (?)', [cat]);
    }
  }

  // 6. Jobs
  if (Array.isArray(data.jobs)) {
    dbInstance.run('DELETE FROM job_applications');
    for (const job of data.jobs) {
      dbInstance.run(`
        INSERT INTO job_applications 
        (id, company, role, source, roundsReached, status, notes, appliedDate, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        job.id,
        job.company,
        job.role,
        job.source || '',
        job.roundsReached || 'Applied',
        job.status || 'Applied',
        job.notes || '',
        job.appliedDate || now,
        job.createdAt || now,
        job.updatedAt || now
      ]);
    }
  }

  // 7. Period Tracker
  if (data.period?.settings) {
    const s = data.period.settings;
    dbInstance.run(`
      INSERT OR REPLACE INTO period_settings (id, cycleDuration, periodDuration, updatedAt)
      VALUES ('default', ?, ?, ?)
    `, [Number(s.cycleDuration) || 28, Number(s.periodDuration) || 5, now]);
  }

  if (Array.isArray(data.period?.logs)) {
    dbInstance.run('DELETE FROM period_logs');
    for (const log of data.period.logs) {
      dbInstance.run(`
        INSERT INTO period_logs
        (id, startDate, endDate, flow, notes, symptoms, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        log.id,
        log.startDate,
        log.endDate,
        log.flow || 'Medium',
        log.notes || '',
        JSON.stringify(log.symptoms || []),
        log.createdAt || now,
        log.updatedAt || now
      ]);
    }
  }

  dbInstance.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('lastUpdated', ?)", [now]);
  saveDbToDisk();
}
