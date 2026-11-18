const defaults = () => ({ items: [], genres: [], collections: [], operations: [] });
const endpoint = () => `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`;

function sanitize(record) {
  const defs = defaults();
  const raw = record || {};
  return {
    items: Array.isArray(raw.items) ? raw.items : defs.items,
    genres: Array.isArray(raw.genres) ? raw.genres : defs.genres,
    collections: Array.isArray(raw.collections) ? raw.collections : defs.collections,
    operations: Array.isArray(raw.operations) ? raw.operations : defs.operations,
  };
}

async function read() {
  const r = await fetch(`${endpoint()}/latest`, {
    headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY },
  });
  if (!r.ok) throw Error(`JSONBin read failed (${r.status})`);
  const b = await r.json();
  return sanitize(b.record || b);
}

async function write(data) {
  const r = await fetch(endpoint(), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': process.env.JSONBIN_API_KEY,
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw Error(`JSONBin write failed (${r.status})`);
}

export function apply(lib, op) {
  const current = sanitize(lib);
  if (current.operations.some((x) => x.id === op.id)) return current;
  const p = op.payload || {};

  let items = [...current.items];
  let genres = [...current.genres];
  let collections = [...current.collections];

  const ensureGenre = (g) => {
    if (g && typeof g === 'string' && g.trim() && !genres.includes(g.trim())) {
      genres.push(g.trim());
    }
  };

  if (op.type === 'ADD_ITEM') {
    if (p.item) {
      items.push(p.item);
      ensureGenre(p.item.genre);
    }
  }

  if (op.type === 'UPDATE_ITEM') {
    if (p.item) {
      const exists = items.some((x) => x.id === p.item.id);
      items = exists
        ? items.map((x) => (x.id === p.item.id ? { ...x, ...p.item, updatedAt: op.timestamp } : x))
        : [...items, p.item];
      ensureGenre(p.item.genre);
    }
  }

  if (op.type === 'DELETE_ITEM') {
    items = items.filter((x) => x.id !== p.id);
  }

  if (op.type === 'TOGGLE_FAVORITE') {
    items = items.map((x) => (x.id === p.id ? { ...x, favorite: !x.favorite, updatedAt: op.timestamp } : x));
  }

  if (op.type === 'ADD_GENRE') {
    ensureGenre(p.genre);
  }

  if (op.type === 'DELETE_GENRE') {
    genres = genres.filter((x) => x !== p.genre);
  }

  if (op.type === 'ADD_COLLECTION') {
    if (p.collection) {
      collections.push(p.collection);
    }
  }

  if (op.type === 'DELETE_COLLECTION') {
    collections = collections.filter((x) => x.id !== p.id);
    items = items.map((x) => ({
      ...x,
      collectionIds: (x.collectionIds || []).filter((y) => y !== p.id),
    }));
  }

  const operations = [...current.operations, op].slice(-500);

  return {
    items,
    genres,
    collections,
    operations,
  };
}

export default async function handler(req, res) {
  if (!process.env.JSONBIN_API_KEY || !process.env.JSONBIN_BIN_ID) {
    return res.status(500).json({ error: 'JSONBin environment variables are not configured.' });
  }

  try {
    if (req.method === 'GET') return res.status(200).json(await read());
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const op = req.body?.operation;
    if (!op?.id || !op?.type || !op?.timestamp) {
      return res.status(400).json({ error: 'A valid operation is required.' });
    }
    const lib = apply(await read(), op);
    await write(lib);
    return res.status(200).json(lib);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

