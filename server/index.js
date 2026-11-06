import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, transaction } from './db.js';
import { CATEGORIES, CITIES, CONDITIONS, STATUSES } from './constants.js';

const PORT = Number(process.env.PORT) || 3001;
// En producción conviene apuntar UPLOAD_DIR (y DB_FILE, ver db.js) a un disco persistente
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(import.meta.dirname, 'uploads');
const CLIENT_DIST = path.join(import.meta.dirname, '..', 'client', 'dist');
const PAGE_SIZE = 24;
const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 8;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const CONDITION_IDS = new Set(CONDITIONS.map((c) => c.id));
const STATUS_IDS = new Set(STATUSES.map((s) => s.id));
const CITY_SET = new Set(CITIES);
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// ---------------------------------------------------------------- utilidades

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};
const now = () => new Date().toISOString();
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Dirección pública del sitio (ej. https://pasalo.com.py). Con ella las fotos se
// devuelven con URL absoluta, necesario para la app de celular.
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const photoUrl = (filename) => (filename ? `${PUBLIC_URL}/uploads/${filename}` : null);

function idParam(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) fail(404, 'No encontrado');
  return id;
}

function text(value, { field, min = 0, max, required = false }) {
  const s = value == null ? '' : String(value).trim();
  if (required && !s) fail(400, `Completá el campo "${field}"`);
  if (s && s.length < min) fail(400, `"${field}" debe tener al menos ${min} caracteres`);
  if (s.length > max) fail(400, `"${field}" puede tener como máximo ${max} caracteres`);
  return s;
}

function oneOf(value, set, field) {
  if (!set.has(value)) fail(400, `Elegí una opción válida para "${field}"`);
  return value;
}

function parsePrice(value) {
  const n = Number(String(value ?? '').replace(/[.\s]/g, ''));
  if (!Number.isInteger(n) || n < 1000 || n > 1_000_000_000) {
    fail(400, 'El precio debe estar entre Gs. 1.000 y Gs. 1.000.000.000');
  }
  return n;
}

// Celulares de Paraguay: 09XX XXX XXX -> 5959XXXXXXXX (formato de WhatsApp)
function normalizePhone(value) {
  let n = String(value ?? '').replace(/\D/g, '');
  if (!n) return '';
  if (n.startsWith('0')) n = '595' + n.slice(1);
  else if (n.startsWith('9')) n = '595' + n;
  if (!/^5959\d{8}$/.test(n)) fail(400, 'Ingresá un celular paraguayo válido, por ejemplo 0981 123 456');
  return n;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { hash: crypto.scryptSync(password, salt, 64).toString('hex'), salt };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  return stored.length === candidate.length && crypto.timingSafeEqual(candidate, stored);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)').run(sha256(token), userId, now());
  return token;
}

// Las primeras cuentas reciben la insignia de Fundador/a para siempre
const FOUNDERS = 100;
const foundersLeft = () => Math.max(0, FOUNDERS - db.prepare('SELECT COUNT(*) AS n FROM users').get().n);

const publicUser = (u) => ({ id: u.id, name: u.name, city: u.city, createdAt: u.created_at, founder: u.id <= FOUNDERS });
const selfUser = (u) => ({ ...publicUser(u), email: u.email, phone: u.phone });

function auth(required) {
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    if (header.startsWith('Bearer ')) {
      const user = db
        .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
        .get(sha256(header.slice(7)));
      if (user) {
        req.user = user;
        req.tokenHash = sha256(header.slice(7));
      }
    }
    if (required && !req.user) return res.status(401).json({ error: 'Tenés que iniciar sesión' });
    next();
  };
}

// ---------------------------------------------------------------- fotos

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + IMAGE_TYPES[file.mimetype]),
  }),
  limits: { fileSize: MAX_PHOTO_MB * 1024 * 1024, files: MAX_PHOTOS, fields: 20 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'Solo se aceptan fotos JPG, PNG o WEBP'));
  },
});

function removeFiles(filenames) {
  for (const f of filenames) fs.rm(path.join(UPLOAD_DIR, path.basename(f)), { force: true }, () => {});
}

// ---------------------------------------------------------------- artículos

const LIST_SELECT = `
  SELECT i.*, u.name AS seller_name,
    (SELECT filename FROM item_photos p WHERE p.item_id = i.id ORDER BY position LIMIT 1) AS cover,
    (SELECT COUNT(*) FROM favorites f WHERE f.item_id = i.id) AS fav_count
  FROM items i JOIN users u ON u.id = i.user_id`;

function favoriteSet(user, ids) {
  if (!user || ids.length === 0) return new Set();
  const rows = db
    .prepare(`SELECT item_id FROM favorites WHERE user_id = ? AND item_id IN (${ids.map(() => '?').join(',')})`)
    .all(user.id, ...ids);
  return new Set(rows.map((r) => r.item_id));
}

function toListItems(rows, user) {
  const favs = favoriteSet(user, rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    price: r.price,
    size: r.size,
    brand: r.brand,
    condition: r.condition,
    category: r.category,
    city: r.city,
    status: r.status,
    swap: Boolean(r.swap),
    createdAt: r.created_at,
    cover: photoUrl(r.cover),
    favorites: r.fav_count,
    isFavorite: favs.has(r.id),
    seller: { id: r.user_id, name: r.seller_name },
  }));
}

function validateItem(body) {
  return {
    title: text(body.title, { field: 'Título', min: 3, max: 80, required: true }),
    description: text(body.description, { field: 'Descripción', max: 2000 }),
    price: parsePrice(body.price),
    category: oneOf(body.category, CATEGORY_IDS, 'Categoría'),
    condition: oneOf(body.condition, CONDITION_IDS, 'Estado'),
    city: oneOf(body.city, CITY_SET, 'Ciudad'),
    brand: text(body.brand, { field: 'Marca', max: 40 }),
    size: text(body.size, { field: 'Talle', max: 20 }),
    swap: parseBool(body.swap),
  };
}

// Acepta true/false, 1/0 y los strings que manda un formulario
const parseBool = (v) => (v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0);

function getOwnedItem(id, user) {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!item) fail(404, 'Esta publicación no existe');
  if (item.user_id !== user.id) fail(403, 'Solo el vendedor puede modificar esta publicación');
  return item;
}

// ---------------------------------------------------------------- app

const app = express();
app.disable('x-powered-by');
// Detrás del proxy del hosting (Railway, Render, Nginx) para que req.protocol sea https
app.set('trust proxy', 1);

// Límite de intentos por IP, en memoria. Frena fuerza bruta y spam sin dependencias.
function rateLimit({ max, windowMs, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const t = Date.now();
    const entry = hits.get(key);
    if (!entry || t > entry.reset) {
      hits.set(key, { count: 1, reset: t + windowMs });
      if (hits.size > 10000) for (const [k, v] of hits) if (t > v.reset) hits.delete(k);
      return next();
    }
    if (++entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - t) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
const MIN = 60 * 1000;
const loginLimit = rateLimit({ max: 15, windowMs: 15 * MIN, message: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' });
const registerLimit = rateLimit({ max: 5, windowMs: 60 * MIN, message: 'Demasiadas cuentas creadas desde esta conexión. Probá más tarde.' });
const publishLimit = rateLimit({ max: 30, windowMs: 60 * MIN, message: 'Publicaste muchas cosas seguidas. Esperá un rato.' });
const reportLimit = rateLimit({ max: 10, windowMs: 60 * MIN, message: 'Demasiadas denuncias seguidas.' });

app.get('/api/health', (req, res) => res.json({ ok: true }));

// CORS: la app de celular (Capacitor) llama a la API desde su propio origen
const APP_ORIGINS = new Set(['capacitor://localhost', 'http://localhost', 'https://localhost', PUBLIC_URL].filter(Boolean));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (APP_ORIGINS.has(origin) || /^http:\/\/localhost:\d+$/.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false }));

app.get('/api/meta', (req, res) => {
  res.json({
    categories: CATEGORIES,
    conditions: CONDITIONS,
    statuses: STATUSES,
    cities: CITIES,
    maxPhotos: MAX_PHOTOS,
    maxPhotoMb: MAX_PHOTO_MB,
    founders: FOUNDERS,
    foundersLeft: foundersLeft(),
  });
});

// --- autenticación

app.post('/api/auth/register', registerLimit, (req, res) => {
  const body = req.body ?? {};
  const name = text(body.name, { field: 'Nombre', min: 2, max: 60, required: true });
  const email = text(body.email, { field: 'Email', max: 120, required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Ingresá un email válido');
  const password = String(body.password ?? '');
  if (password.length < 8) fail(400, 'La contraseña debe tener al menos 8 caracteres');
  if (password.length > 200) fail(400, 'La contraseña es demasiado larga');
  const city = oneOf(body.city, CITY_SET, 'Ciudad');
  const phone = normalizePhone(body.phone);

  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) fail(409, 'Ya existe una cuenta con ese email');

  const { hash, salt } = hashPassword(password);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, password_salt, city, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(name, email, hash, salt, city, phone, now());
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ token: createSession(user.id), user: selfUser(user) });
});

app.post('/api/auth/login', loginLimit, (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    fail(401, 'Email o contraseña incorrectos');
  }
  res.json({ token: createSession(user.id), user: selfUser(user) });
});

app.post('/api/auth/logout', auth(true), (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.tokenHash);
  res.status(204).end();
});

app.get('/api/auth/me', auth(true), (req, res) => {
  res.json({ user: selfUser(req.user) });
});

// Borrar la cuenta y todo lo asociado (lo exigen Google Play y App Store)
app.delete('/api/me', auth(true), (req, res) => {
  const uid = req.user.id;
  const photos = db
    .prepare('SELECT p.filename FROM item_photos p JOIN items i ON i.id = p.item_id WHERE i.user_id = ?')
    .all(uid)
    .map((p) => p.filename);
  transaction(() => {
    db.prepare('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE buyer_id = ? OR seller_id = ?)').run(uid, uid);
    db.prepare('DELETE FROM conversations WHERE buyer_id = ? OR seller_id = ?').run(uid, uid);
    db.prepare('DELETE FROM favorites WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM reports WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM item_photos WHERE item_id IN (SELECT id FROM items WHERE user_id = ?)').run(uid);
    db.prepare('DELETE FROM items WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM users WHERE id = ?').run(uid);
  });
  removeFiles(photos);
  res.status(204).end();
});

app.patch('/api/me', auth(true), (req, res) => {
  const body = req.body ?? {};
  const name = text(body.name, { field: 'Nombre', min: 2, max: 60, required: true });
  const city = oneOf(body.city, CITY_SET, 'Ciudad');
  const phone = normalizePhone(body.phone);
  db.prepare('UPDATE users SET name = ?, city = ?, phone = ? WHERE id = ?').run(name, city, phone, req.user.id);
  res.json({ user: selfUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

app.get('/api/me/unread', auth(true), (req, res) => {
  const { n } = db
    .prepare(
      `SELECT COUNT(*) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE (c.buyer_id = ? OR c.seller_id = ?) AND m.sender_id <> ? AND m.read_at IS NULL`
    )
    .get(req.user.id, req.user.id, req.user.id);
  res.json({ count: n });
});

// --- artículos

app.get('/api/items', auth(false), (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 80);
  const { category = '', city = '', sort = 'recent' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const where = [];
  const params = [];

  const sellerId = parseInt(req.query.user, 10);
  if (sellerId > 0) {
    where.push('i.user_id = ?');
    params.push(sellerId);
  } else {
    where.push("i.status <> 'sold'");
  }
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
    where.push("(i.title LIKE ? ESCAPE '\\' OR i.description LIKE ? ESCAPE '\\' OR i.brand LIKE ? ESCAPE '\\')");
    params.push(like, like, like);
  }
  if (CATEGORY_IDS.has(category)) {
    where.push('i.category = ?');
    params.push(category);
  }
  if (CITY_SET.has(city)) {
    where.push('i.city = ?');
    params.push(city);
  }
  const min = parseInt(req.query.min, 10);
  if (min > 0) {
    where.push('i.price >= ?');
    params.push(min);
  }
  const max = parseInt(req.query.max, 10);
  if (max > 0) {
    where.push('i.price <= ?');
    params.push(max);
  }
  if (req.query.swap === '1') where.push('i.swap = 1');

  const order =
    {
      recent: 'i.created_at DESC',
      price_asc: 'i.price ASC',
      price_desc: 'i.price DESC',
      popular: 'fav_count DESC, i.created_at DESC',
    }[sort] ?? 'i.created_at DESC';
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { n: total } = db.prepare(`SELECT COUNT(*) AS n FROM items i ${whereSql}`).get(...params);
  const rows = db
    .prepare(`${LIST_SELECT} ${whereSql} ORDER BY ${order}, i.id DESC LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  res.json({ items: toListItems(rows, req.user), total, page, hasMore: page * PAGE_SIZE < total });
});

app.get('/api/items/:id', auth(false), (req, res) => {
  const id = idParam(req.params.id);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!item) fail(404, 'Esta publicación no existe');
  const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(item.user_id);
  const photos = db.prepare('SELECT filename FROM item_photos WHERE item_id = ? ORDER BY position').all(id);
  const { n: favorites } = db.prepare('SELECT COUNT(*) AS n FROM favorites WHERE item_id = ?').get(id);
  const { n: sellerItems } = db.prepare('SELECT COUNT(*) AS n FROM items WHERE user_id = ?').get(seller.id);

  res.json({
    id: item.id,
    title: item.title,
    description: item.description,
    price: item.price,
    category: item.category,
    condition: item.condition,
    size: item.size,
    brand: item.brand,
    city: item.city,
    status: item.status,
    swap: Boolean(item.swap),
    createdAt: item.created_at,
    photos: photos.map((p) => photoUrl(p.filename)),
    favorites,
    isFavorite: favoriteSet(req.user, [id]).has(id),
    isOwner: req.user?.id === item.user_id,
    seller: { ...publicUser(seller), phone: seller.phone, itemCount: sellerItems },
  });
});

app.post('/api/items', auth(true), publishLimit, upload.array('photos', MAX_PHOTOS), (req, res) => {
  const files = req.files ?? [];
  try {
    if (files.length === 0) fail(400, 'Subí al menos una foto');
    const data = validateItem(req.body ?? {});
    const id = transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO items (user_id, title, description, price, category, condition, size, brand, city, swap, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(req.user.id, data.title, data.description, data.price, data.category, data.condition, data.size, data.brand, data.city, data.swap, now());
      const itemId = Number(result.lastInsertRowid);
      const insertPhoto = db.prepare('INSERT INTO item_photos (item_id, filename, position) VALUES (?, ?, ?)');
      files.forEach((f, i) => insertPhoto.run(itemId, f.filename, i));
      return itemId;
    });
    res.status(201).json({ id });
  } catch (err) {
    removeFiles(files.map((f) => f.filename));
    throw err;
  }
});

app.patch('/api/items/:id', auth(true), (req, res) => {
  const id = idParam(req.params.id);
  getOwnedItem(id, req.user);
  const body = req.body ?? {};
  const updates = {};
  if ('status' in body) updates.status = oneOf(body.status, STATUS_IDS, 'Estado de la publicación');
  if ('price' in body) updates.price = parsePrice(body.price);
  if ('title' in body) updates.title = text(body.title, { field: 'Título', min: 3, max: 80, required: true });
  if ('description' in body) updates.description = text(body.description, { field: 'Descripción', max: 2000 });
  if ('swap' in body) updates.swap = parseBool(body.swap);
  const keys = Object.keys(updates);
  if (keys.length === 0) fail(400, 'No hay cambios para guardar');
  db.prepare(`UPDATE items SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => updates[k]), id);
  res.json({ ok: true, ...updates });
});

// Denunciar una publicación (las tiendas exigen un mecanismo para contenido inapropiado)
const REPORT_REASONS = new Set(['estafa', 'prohibido', 'ofensivo', 'spam', 'otro']);
app.post('/api/items/:id/report', auth(true), reportLimit, (req, res) => {
  const id = idParam(req.params.id);
  if (!db.prepare('SELECT 1 FROM items WHERE id = ?').get(id)) fail(404, 'Esta publicación no existe');
  const reason = oneOf(req.body?.reason, REPORT_REASONS, 'Motivo');
  const detail = text(req.body?.detail, { field: 'Detalle', max: 500 });
  if (db.prepare('SELECT 1 FROM reports WHERE item_id = ? AND user_id = ?').get(id, req.user.id)) {
    return res.json({ ok: true, already: true });
  }
  db.prepare('INSERT INTO reports (item_id, user_id, reason, detail, created_at) VALUES (?, ?, ?, ?, ?)').run(id, req.user.id, reason, detail, now());
  res.status(201).json({ ok: true });
});

app.delete('/api/items/:id', auth(true), (req, res) => {
  const id = idParam(req.params.id);
  getOwnedItem(id, req.user);
  const photos = db.prepare('SELECT filename FROM item_photos WHERE item_id = ?').all(id);
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  removeFiles(photos.map((p) => p.filename));
  res.status(204).end();
});

// --- favoritos

app.post('/api/items/:id/favorite', auth(true), (req, res) => {
  const id = idParam(req.params.id);
  if (!db.prepare('SELECT 1 FROM items WHERE id = ?').get(id)) fail(404, 'Esta publicación no existe');
  const exists = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND item_id = ?').get(req.user.id, id);
  if (exists) db.prepare('DELETE FROM favorites WHERE user_id = ? AND item_id = ?').run(req.user.id, id);
  else db.prepare('INSERT INTO favorites (user_id, item_id, created_at) VALUES (?, ?, ?)').run(req.user.id, id, now());
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM favorites WHERE item_id = ?').get(id);
  res.json({ isFavorite: !exists, favorites: n });
});

app.get('/api/favorites', auth(true), (req, res) => {
  const rows = db
    .prepare(`${LIST_SELECT} JOIN favorites fv ON fv.item_id = i.id AND fv.user_id = ? ORDER BY fv.created_at DESC`)
    .all(req.user.id);
  res.json({ items: toListItems(rows, req.user) });
});

// --- perfiles

app.get('/api/users/:id', (req, res) => {
  const id = idParam(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) fail(404, 'Este usuario no existe');
  const stats = db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold FROM items WHERE user_id = ?`
    )
    .get(id);
  res.json({ user: { ...publicUser(user), itemCount: stats.total, soldCount: stats.sold ?? 0 } });
});

// --- mensajes

function addMessage(conversationId, senderId, body) {
  const t = now();
  const result = db
    .prepare('INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)')
    .run(conversationId, senderId, body, t);
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(t, conversationId);
  return { id: Number(result.lastInsertRowid), mine: true, body, createdAt: t, read: false };
}

function getConversation(id, user) {
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  if (!conv || (conv.buyer_id !== user.id && conv.seller_id !== user.id)) fail(404, 'Conversación no encontrada');
  return conv;
}

app.post('/api/items/:id/conversations', auth(true), (req, res) => {
  const itemId = idParam(req.params.id);
  const item = db.prepare('SELECT id, user_id, status FROM items WHERE id = ?').get(itemId);
  if (!item) fail(404, 'Esta publicación no existe');
  if (item.user_id === req.user.id) fail(400, 'No podés enviarte mensajes a vos mismo');
  const body = text(req.body?.body, { field: 'Mensaje', min: 1, max: 1000, required: true });

  const conversationId = transaction(() => {
    const t = now();
    db.prepare(
      `INSERT INTO conversations (item_id, buyer_id, seller_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (item_id, buyer_id) DO NOTHING`
    ).run(item.id, req.user.id, item.user_id, t, t);
    const conv = db.prepare('SELECT id FROM conversations WHERE item_id = ? AND buyer_id = ?').get(item.id, req.user.id);
    addMessage(conv.id, req.user.id, body);
    return conv.id;
  });
  res.status(201).json({ id: conversationId });
});

app.get('/api/conversations', auth(true), (req, res) => {
  const uid = req.user.id;
  const rows = db
    .prepare(
      `SELECT c.id, c.item_id, c.updated_at, i.title AS item_title, i.price AS item_price, i.status AS item_status,
         (SELECT filename FROM item_photos p WHERE p.item_id = c.item_id ORDER BY position LIMIT 1) AS cover,
         o.id AS other_id, o.name AS other_name,
         (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_body,
         (SELECT sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_sender,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.read_at IS NULL) AS unread
       FROM conversations c
       JOIN items i ON i.id = c.item_id
       JOIN users o ON o.id = CASE WHEN c.buyer_id = ? THEN c.seller_id ELSE c.buyer_id END
       WHERE c.buyer_id = ? OR c.seller_id = ?
       ORDER BY c.updated_at DESC`
    )
    .all(uid, uid, uid, uid);
  res.json({
    conversations: rows.map((r) => ({
      id: r.id,
      updatedAt: r.updated_at,
      unread: r.unread,
      lastMessage: r.last_body,
      lastFromMe: r.last_sender === uid,
      item: { id: r.item_id, title: r.item_title, price: r.item_price, status: r.item_status, cover: photoUrl(r.cover) },
      other: { id: r.other_id, name: r.other_name },
    })),
  });
});

app.get('/api/conversations/:id', auth(true), (req, res) => {
  const conv = getConversation(idParam(req.params.id), req.user);
  const uid = req.user.id;
  db.prepare('UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id <> ? AND read_at IS NULL').run(now(), conv.id, uid);

  const item = db.prepare('SELECT id, title, price, status FROM items WHERE id = ?').get(conv.item_id);
  const cover = db.prepare('SELECT filename FROM item_photos WHERE item_id = ? ORDER BY position LIMIT 1').get(conv.item_id);
  const otherId = conv.buyer_id === uid ? conv.seller_id : conv.buyer_id;
  const other = db.prepare('SELECT * FROM users WHERE id = ?').get(otherId);
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id').all(conv.id);

  res.json({
    id: conv.id,
    role: conv.seller_id === uid ? 'seller' : 'buyer',
    item: { ...item, cover: photoUrl(cover?.filename) },
    other: publicUser(other),
    messages: messages.map((m) => ({
      id: m.id,
      mine: m.sender_id === uid,
      body: m.body,
      createdAt: m.created_at,
      read: Boolean(m.read_at),
    })),
  });
});

app.post('/api/conversations/:id/messages', auth(true), (req, res) => {
  const conv = getConversation(idParam(req.params.id), req.user);
  const body = text(req.body?.body, { field: 'Mensaje', min: 1, max: 1000, required: true });
  res.status(201).json(addMessage(conv.id, req.user.id, body));
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// --- frontend compilado (modo producción: npm run build && npm start)

if (fs.existsSync(CLIENT_DIST)) {
  const indexHtml = fs.readFileSync(path.join(CLIENT_DIST, 'index.html'), 'utf8');
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  app.use(express.static(CLIENT_DIST, { index: false }));

  // Vista previa (Open Graph) cuando se comparte un artículo en WhatsApp, Facebook, etc.
  app.get('/articulo/:id', (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    const item = id > 0 ? db.prepare('SELECT id, title, price, description FROM items WHERE id = ?').get(id) : null;
    if (!item) return next();
    const cover = db.prepare('SELECT filename FROM item_photos WHERE item_id = ? ORDER BY position LIMIT 1').get(id);
    const base = `${req.protocol}://${req.get('host')}`;
    const description = (item.description || 'Mirá esta publicación en PasalO.').slice(0, 160);
    const tags = [
      `<meta property="og:type" content="product" />`,
      `<meta property="og:site_name" content="PasalO" />`,
      `<meta property="og:title" content="${escapeHtml(item.title)} · Gs. ${item.price.toLocaleString('es-PY')}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      `<meta property="og:url" content="${base}/articulo/${item.id}" />`,
      cover ? `<meta property="og:image" content="${base}${photoUrl(cover.filename)}" />` : '',
      `<meta name="twitter:card" content="${cover ? 'summary_large_image' : 'summary'}" />`,
    ]
      .filter(Boolean)
      .join('\n    ');
    res.type('html').send(indexHtml.replace('</head>', `    ${tags}\n  </head>`));
  });

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// --- errores

app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: `Cada foto puede pesar hasta ${MAX_PHOTO_MB} MB`,
      LIMIT_FILE_COUNT: `Podés subir hasta ${MAX_PHOTOS} fotos`,
      LIMIT_UNEXPECTED_FILE: `Podés subir hasta ${MAX_PHOTOS} fotos`,
    };
    return res.status(400).json({ error: messages[err.code] ?? 'No se pudieron subir las fotos' });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Datos inválidos' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`API de pasalo escuchando en http://localhost:${PORT}`);
});
