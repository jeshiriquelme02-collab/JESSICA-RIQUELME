// Base de datos SQLite vía libsql: un archivo local en desarrollo, o Turso en la nube
// (gratis) cuando están definidas DB_URL y DB_AUTH_TOKEN.
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(import.meta.dirname, 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'cheropero.db');
const REMOTE = Boolean(process.env.DB_URL);

if (!REMOTE) fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

export const db = createClient(
  REMOTE
    ? { url: process.env.DB_URL, authToken: process.env.DB_AUTH_TOKEN }
    : { url: `file:${DB_FILE.replace(/\\/g, '/')}` }
);

// Atajos: get (una fila), all (varias), run (escritura). `conn` puede ser db o una transacción.
export const get = async (sql, args = [], conn = db) => (await conn.execute({ sql, args })).rows[0];
export const all = async (sql, args = [], conn = db) => (await conn.execute({ sql, args })).rows;
export const run = async (sql, args = [], conn = db) => {
  const r = await conn.execute({ sql, args });
  return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.rowsAffected };
};

// Ejecuta fn(tx) dentro de una transacción; tx tiene get/all/run propios.
export async function transaction(fn) {
  const t = await db.transaction('write');
  try {
    const tx = {
      get: (sql, args) => get(sql, args, t),
      all: (sql, args) => all(sql, args, t),
      run: (sql, args) => run(sql, args, t),
    };
    const result = await fn(tx);
    await t.commit();
    return result;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    city          TEXT NOT NULL,
    phone         TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price       INTEGER NOT NULL,
    category    TEXT NOT NULL,
    condition   TEXT NOT NULL,
    size        TEXT NOT NULL DEFAULT '',
    brand       TEXT NOT NULL DEFAULT '',
    city        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'available',
    swap        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at);
  CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);

  CREATE TABLE IF NOT EXISTS item_photos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id   INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    filename  TEXT NOT NULL,
    public_id TEXT NOT NULL DEFAULT '',
    position  INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_photos_item ON item_photos(item_id);

  CREATE TABLE IF NOT EXISTS favorites (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    buyer_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (item_id, buyer_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body            TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    read_at         TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

  CREATE TABLE IF NOT EXISTS reports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason     TEXT NOT NULL,
    detail     TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
`;

async function init() {
  if (!REMOTE) await db.execute('PRAGMA journal_mode = WAL');
  await db.executeMultiple(SCHEMA);

  // Migraciones para bases creadas antes de que existiera cada columna
  const columns = async (table) => (await all(`PRAGMA table_info(${table})`)).map((c) => c.name);
  if (!(await columns('items')).includes('swap')) await db.execute('ALTER TABLE items ADD COLUMN swap INTEGER NOT NULL DEFAULT 0');
  if (!(await columns('item_photos')).includes('public_id')) {
    await db.execute("ALTER TABLE item_photos ADD COLUMN public_id TEXT NOT NULL DEFAULT ''");
  }
}

// Esperar `ready` antes de atender peticiones
export const ready = init();
