import sqlite3 from 'sqlite3';
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
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(DB_FILE);

// Promisified helpers
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// Initialize tables
export async function initDb() {
  await dbRun(`
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
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS shelf_genres (
      name TEXT PRIMARY KEY
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS shelf_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS budget_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      targetAmount REAL DEFAULT 0,
      currentAmount REAL DEFAULT 0,
      targetDate TEXT,
      createdAt TEXT,
      history TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS budget_expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      category TEXT,
      paymentMethod TEXT,
      date TEXT,
      note TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      tag TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `);

  await dbRun(`
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
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS vault_links (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      tag TEXT,
      note TEXT,
      savedAt TEXT
    )
  `);

  await dbRun(`
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
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS wishlist_categories (
      name TEXT PRIMARY KEY
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Migrate existing data from db.json if database is freshly created
  const countRow = await dbGet('SELECT COUNT(*) as count FROM shelf_items');
  if (countRow.count === 0) {
    const jsonPath = path.join(DATA_DIR, 'db.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        await importFullPayload(raw);
        console.log('✅ Successfully migrated db.json data into SQLite Database!');
      } catch (err) {
        console.warn('Could not migrate initial db.json:', err.message);
      }
    }
  }
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
    meta: {
      version: '2.0-sqlite',
      database: 'SQLite',
      lastUpdated: lastUpdatedRow?.value || new Date().toISOString()
    }
  };
}

export async function importFullPayload(data) {
  const now = new Date().toISOString();

  // Shelf
  for (const item of (data.shelf?.items || [])) {
    await dbRun(`
      INSERT OR REPLACE INTO shelf_items 
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

  for (const g of (data.shelf?.genres || [])) {
    if (g) await dbRun('INSERT OR IGNORE INTO shelf_genres (name) VALUES (?)', [g]);
  }

  for (const c of (data.shelf?.collections || [])) {
    if (c?.id) await dbRun('INSERT OR REPLACE INTO shelf_collections (id, name) VALUES (?, ?)', [c.id, c.name]);
  }

  // Budget
  for (const g of (data.budget?.goals || [])) {
    await dbRun(`
      INSERT OR REPLACE INTO budget_goals 
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

  for (const exp of (data.budget?.expenses || [])) {
    await dbRun(`
      INSERT OR REPLACE INTO budget_expenses 
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

  // Contacts
  for (const c of (data.contacts || [])) {
    await dbRun(`
      INSERT OR REPLACE INTO contacts 
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

  // Vault
  for (const p of (data.vault?.passwords || [])) {
    await dbRun(`
      INSERT OR REPLACE INTO vault_passwords 
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

  for (const l of (data.vault?.links || [])) {
    await dbRun(`
      INSERT OR REPLACE INTO vault_links 
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

  // Wishlist
  for (const w of (data.wishlist?.items || [])) {
    await dbRun(`
      INSERT OR REPLACE INTO wishlist_items 
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

  for (const cat of (data.wishlist?.categories || [])) {
    if (cat) await dbRun('INSERT OR IGNORE INTO wishlist_categories (name) VALUES (?)', [cat]);
  }

  await dbRun("INSERT OR REPLACE INTO meta (key, value) VALUES ('lastUpdated', ?)", [now]);
}

export default db;
