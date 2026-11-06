import express from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { all, get, ready, REMOTE, run, transaction } from './db.js';
import { removePhotos, storePhotos, UPLOAD_DIR, USE_CLOUDINARY } from './photos.js';
import { CATEGORIES, CITIES, CONDITIONS, STATUSES } from './constants.js';

// La app de Express. index.js la arranca en un puerto; en Vercel la usa api/index.js.
const CLIENT_DIST = path.join(import.meta.dirname, '..', 'client', 'dist');
const PAGE_SIZE = 24;
const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 8;

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const CONDITION_IDS = new Set(CONDITIONS.map((c) => c.id));
const STATUS_IDS = new Set(STATUSES.map((s) => s.id));
const CITY_SET = new Set(CITIES);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Ingreso con Google (opcional): el ID de cliente es público, no es una clave secreta
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

// En Vercel no hay disco: sin estas claves no se puede guardar nada
const MISSING_CONFIG = process.env.VERCEL ? ['DB_URL', 'DB_AUTH_TOKEN', 'CLOUDINARY_URL'].filter((k) => !process.env[k]) : [];

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

// Dirección pública del sitio (ej. https://pasalo.com.py). Con ella las fotos locales se
// devuelven con URL absoluta, necesario para la app de celular.
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const photoUrl = (filename) => {
  if (!filename) return null;
  return /^https?:/.test(filename) ? filename : `${PUBLIC_URL}/uploads/${filename}`;
};

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

// Acepta true/false, 1/0 y los strings que manda un formulario
const parseBool = (v) => (v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { hash: crypto.scryptSync(password, salt, 64).toString('hex'), salt };
}

function verifyPassword(password, salt, hash) {
  if (!hash) return false; // cuentas creadas con Google, sin contraseña
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  return stored.length === candidate.length && crypto.timingSafeEqual(candidate, stored);
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await run('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)', [sha256(token), userId, now()]);
  return token;
}

// Las primeras cuentas reciben la insignia de Fundador/a para siempre
const FOUNDERS = 100;
const foundersLeft = async () => Math.max(0, FOUNDERS - (await get('SELECT COUNT(*) AS n FROM users')).n);

const publicUser = (u) => ({ id: u.id, name: u.name, city: u.city, createdAt: u.created_at, founder: u.id <= FOUNDERS });
const selfUser = (u) => ({ ...publicUser(u), email: u.email, phone: u.phone });

function auth(required) {
  return async (req, res, next) => {
    const header = req.get('authorization') || '';
    if (header.startsWith('Bearer ')) {
      const tokenHash = sha256(header.slice(7));
      const user = await get('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?', [tokenHash]);
      if (user) {
        req.user = user;
        req.tokenHash = tokenHash;
      }
    }
    if (required && !req.user) return res.status(401).json({ error: 'Tenés que iniciar sesión' });
    next();
  };
}

// ---------------------------------------------------------------- fotos

// Las fotos llegan a memoria y después van a Cloudinary o al disco (ver photos.js)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_MB * 1024 * 1024, files: MAX_PHOTOS, fields: 20 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Solo se aceptan fotos JPG, PNG o WEBP'));
  },
});

const itemPhotos = (itemId, conn) => all('SELECT filename, public_id FROM item_photos WHERE item_id = ? ORDER BY position', [itemId], conn);

// ---------------------------------------------------------------- artículos

const LIST_SELECT = `
  SELECT i.*, u.name AS seller_name,
    (SELECT filename FROM item_photos p WHERE p.item_id = i.id ORDER BY position LIMIT 1) AS cover,
    (SELECT COUNT(*) FROM favorites f WHERE f.item_id = i.id) AS fav_count
  FROM items i JOIN users u ON u.id = i.user_id`;

async function favoriteSet(user, ids) {
  if (!user || ids.length === 0) return new Set();
  const rows = await all(`SELECT item_id FROM favorites WHERE user_id = ? AND item_id IN (${ids.map(() => '?').join(',')})`, [user.id, ...ids]);
  return new Set(rows.map((r) => r.item_id));
}

async function toListItems(rows, user) {
  const favs = await favoriteSet(user, rows.map((r) => r.id));
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

async function getOwnedItem(id, user) {
  const item = await get('SELECT * FROM items WHERE id = ?', [id]);
  if (!item) fail(404, 'Esta publicación no existe');
  if (item.user_id !== user.id) fail(403, 'Solo el vendedor puede modificar esta publicación');
  return item;
}

// Borra un artículo y todo lo que cuelga de él (sin depender de ON DELETE CASCADE)
async function deleteItemRows(tx, itemId) {
  await tx.run('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE item_id = ?)', [itemId]);
  await tx.run('DELETE FROM conversations WHERE item_id = ?', [itemId]);
  await tx.run('DELETE FROM favorites WHERE item_id = ?', [itemId]);
  await tx.run('DELETE FROM reports WHERE item_id = ?', [itemId]);
  await tx.run('DELETE FROM item_photos WHERE item_id = ?', [itemId]);
  await tx.run('DELETE FROM items WHERE id = ?', [itemId]);
}

// ---------------------------------------------------------------- app

const app = express();
app.disable('x-powered-by');
// Detrás del proxy del hosting (Render, Railway, Nginx) para que req.protocol sea https
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

// Estado del servidor. Con ?db=1 también prueba la conexión a la base (sirve para diagnosticar).
app.get('/api/health', async (req, res) => {
  const status = { ok: MISSING_CONFIG.length === 0, db: REMOTE ? 'turso' : 'archivo local', photos: USE_CLOUDINARY ? 'cloudinary' : 'disco' };
  if (MISSING_CONFIG.length) status.missing = MISSING_CONFIG;
  if (req.query.db) {
    try {
      await ready();
      status.dbReady = true;
    } catch (err) {
      status.ok = false;
      status.dbError = String(err.message || err).slice(0, 200);
    }
  }
  res.status(status.ok ? 200 : 503).json(status);
});

// Antes de cualquier otro pedido: configuración completa y tablas creadas
app.use(async (req, res, next) => {
  if (MISSING_CONFIG.length) {
    return res.status(503).json({ error: `Falta configurar en Vercel: ${MISSING_CONFIG.join(', ')}` });
  }
  try {
    await ready();
  } catch (err) {
    console.error('No se pudo preparar la base de datos:', err);
    return res.status(503).json({ error: 'No se pudo conectar con la base de datos. Probá de nuevo en un rato.' });
  }
  next();
});

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
if (!USE_CLOUDINARY) app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false }));

app.get('/api/meta', async (req, res) => {
  res.json({
    categories: CATEGORIES,
    conditions: CONDITIONS,
    statuses: STATUSES,
    cities: CITIES,
    maxPhotos: MAX_PHOTOS,
    maxPhotoMb: MAX_PHOTO_MB,
    founders: FOUNDERS,
    foundersLeft: await foundersLeft(),
    googleClientId: GOOGLE_CLIENT_ID || null,
  });
});

// --- autenticación

app.post('/api/auth/register', registerLimit, async (req, res) => {
  const body = req.body ?? {};
  const name = text(body.name, { field: 'Nombre', min: 2, max: 60, required: true });
  const email = text(body.email, { field: 'Email', max: 120, required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Ingresá un email válido');
  const password = String(body.password ?? '');
  if (password.length < 8) fail(400, 'La contraseña debe tener al menos 8 caracteres');
  if (password.length > 200) fail(400, 'La contraseña es demasiado larga');
  const city = oneOf(body.city, CITY_SET, 'Ciudad');
  const phone = normalizePhone(body.phone);

  if (await get('SELECT 1 FROM users WHERE email = ?', [email])) {
    fail(409, 'Ya existe una cuenta con ese email. Ingresá con tu contraseña o con Google.');
  }

  const { hash, salt } = hashPassword(password);
  const result = await run(
    'INSERT INTO users (name, email, password_hash, password_salt, city, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email, hash, salt, city, phone, now()]
  );
  const user = await get('SELECT * FROM users WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ token: await createSession(user.id), user: selfUser(user) });
});

app.post('/api/auth/login', loginLimit, async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (user && !user.password_hash && user.google_sub) fail(401, 'Esta cuenta entra con Google. Tocá "Continuar con Google".');
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    fail(401, 'Email o contraseña incorrectos');
  }
  res.json({ token: await createSession(user.id), user: selfUser(user) });
});

// "Continuar con Google": el navegador recibe de Google una credencial firmada (JWT) y
// acá se verifica la firma, que sea para nuestra app y que el correo esté verificado.
// Si ya hay una cuenta con ese correo, se entra a esa; si no, se crea una sin contraseña.
app.post('/api/auth/google', loginLimit, async (req, res) => {
  if (!GOOGLE_CLIENT_ID) fail(400, 'El ingreso con Google todavía no está activado');
  const credential = String(req.body?.credential ?? '');
  if (!credential) fail(400, 'Falta la credencial de Google');

  let payload;
  try {
    ({ payload } = await jwtVerify(credential, googleKeys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: GOOGLE_CLIENT_ID,
    }));
  } catch {
    fail(401, 'No se pudo verificar tu cuenta de Google. Probá de nuevo.');
  }
  if (!payload.email || payload.email_verified !== true) fail(401, 'Tu correo de Google no está verificado');

  const email = String(payload.email).toLowerCase();
  let user = (await get('SELECT * FROM users WHERE google_sub = ?', [payload.sub])) ?? (await get('SELECT * FROM users WHERE email = ?', [email]));
  let created = false;
  if (user) {
    if (!user.google_sub) await run('UPDATE users SET google_sub = ? WHERE id = ?', [payload.sub, user.id]);
  } else {
    // Sin contraseña (no se puede entrar con una vacía) y sin ciudad: se elige al publicar
    const name = String(payload.name || email.split('@')[0]).trim().slice(0, 60);
    const result = await run(
      'INSERT INTO users (name, email, password_hash, password_salt, city, phone, google_sub, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, '', '', '', '', payload.sub, now()]
    );
    user = await get('SELECT * FROM users WHERE id = ?', [result.lastInsertRowid]);
    created = true;
  }
  res.status(created ? 201 : 200).json({ token: await createSession(user.id), user: selfUser(user), created });
});

app.post('/api/auth/logout', auth(true), async (req, res) => {
  await run('DELETE FROM sessions WHERE token_hash = ?', [req.tokenHash]);
  res.status(204).end();
});

app.get('/api/auth/me', auth(true), (req, res) => {
  res.json({ user: selfUser(req.user) });
});

// Borrar la cuenta y todo lo asociado (lo exigen Google Play y App Store)
app.delete('/api/me', auth(true), async (req, res) => {
  const uid = req.user.id;
  const photos = await all('SELECT p.filename, p.public_id FROM item_photos p JOIN items i ON i.id = p.item_id WHERE i.user_id = ?', [uid]);
  await transaction(async (tx) => {
    const items = await tx.all('SELECT id FROM items WHERE user_id = ?', [uid]);
    for (const it of items) await deleteItemRows(tx, it.id);
    await tx.run('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE buyer_id = ? OR seller_id = ?)', [uid, uid]);
    await tx.run('DELETE FROM conversations WHERE buyer_id = ? OR seller_id = ?', [uid, uid]);
    await tx.run('DELETE FROM favorites WHERE user_id = ?', [uid]);
    await tx.run('DELETE FROM reports WHERE user_id = ?', [uid]);
    await tx.run('DELETE FROM sessions WHERE user_id = ?', [uid]);
    await tx.run('DELETE FROM users WHERE id = ?', [uid]);
  });
  await removePhotos(photos);
  res.status(204).end();
});

app.patch('/api/me', auth(true), async (req, res) => {
  const body = req.body ?? {};
  const name = text(body.name, { field: 'Nombre', min: 2, max: 60, required: true });
  const city = oneOf(body.city, CITY_SET, 'Ciudad');
  const phone = normalizePhone(body.phone);
  await run('UPDATE users SET name = ?, city = ?, phone = ? WHERE id = ?', [name, city, phone, req.user.id]);
  res.json({ user: selfUser(await get('SELECT * FROM users WHERE id = ?', [req.user.id])) });
});

app.get('/api/me/unread', auth(true), async (req, res) => {
  const { n } = await get(
    `SELECT COUNT(*) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id
     WHERE (c.buyer_id = ? OR c.seller_id = ?) AND m.sender_id <> ? AND m.read_at IS NULL`,
    [req.user.id, req.user.id, req.user.id]
  );
  res.json({ count: n });
});

// --- artículos

app.get('/api/items', auth(false), async (req, res) => {
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

  const { n: total } = await get(`SELECT COUNT(*) AS n FROM items i ${whereSql}`, params);
  const rows = await all(`${LIST_SELECT} ${whereSql} ORDER BY ${order}, i.id DESC LIMIT ? OFFSET ?`, [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]);

  res.json({ items: await toListItems(rows, req.user), total, page, hasMore: page * PAGE_SIZE < total });
});

app.get('/api/items/:id', auth(false), async (req, res) => {
  const id = idParam(req.params.id);
  const item = await get('SELECT * FROM items WHERE id = ?', [id]);
  if (!item) fail(404, 'Esta publicación no existe');
  const seller = await get('SELECT * FROM users WHERE id = ?', [item.user_id]);
  const photos = await itemPhotos(id);
  const { n: favorites } = await get('SELECT COUNT(*) AS n FROM favorites WHERE item_id = ?', [id]);
  const { n: sellerItems } = await get('SELECT COUNT(*) AS n FROM items WHERE user_id = ?', [seller.id]);

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
    isFavorite: (await favoriteSet(req.user, [id])).has(id),
    isOwner: req.user?.id === item.user_id,
    seller: { ...publicUser(seller), phone: seller.phone, itemCount: sellerItems },
  });
});

app.post('/api/items', auth(true), publishLimit, upload.array('photos', MAX_PHOTOS), async (req, res) => {
  const files = req.files ?? [];
  if (files.length === 0) fail(400, 'Subí al menos una foto');
  const data = validateItem(req.body ?? {});
  const stored = await storePhotos(files);
  try {
    const id = await transaction(async (tx) => {
      const result = await tx.run(
        `INSERT INTO items (user_id, title, description, price, category, condition, size, brand, city, swap, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, data.title, data.description, data.price, data.category, data.condition, data.size, data.brand, data.city, data.swap, now()]
      );
      const itemId = result.lastInsertRowid;
      for (const [i, p] of stored.entries()) {
        await tx.run('INSERT INTO item_photos (item_id, filename, public_id, position) VALUES (?, ?, ?, ?)', [itemId, p.filename, p.publicId, i]);
      }
      return itemId;
    });
    res.status(201).json({ id });
  } catch (err) {
    await removePhotos(stored);
    throw err;
  }
});

app.patch('/api/items/:id', auth(true), async (req, res) => {
  const id = idParam(req.params.id);
  await getOwnedItem(id, req.user);
  const body = req.body ?? {};
  const updates = {};
  if ('status' in body) updates.status = oneOf(body.status, STATUS_IDS, 'Estado de la publicación');
  if ('price' in body) updates.price = parsePrice(body.price);
  if ('title' in body) updates.title = text(body.title, { field: 'Título', min: 3, max: 80, required: true });
  if ('description' in body) updates.description = text(body.description, { field: 'Descripción', max: 2000 });
  if ('swap' in body) updates.swap = parseBool(body.swap);
  const keys = Object.keys(updates);
  if (keys.length === 0) fail(400, 'No hay cambios para guardar');
  await run(`UPDATE items SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => updates[k]), id]);
  res.json({ ok: true, ...updates });
});

// Denunciar una publicación (las tiendas exigen un mecanismo para contenido inapropiado)
const REPORT_REASONS = new Set(['estafa', 'prohibido', 'ofensivo', 'spam', 'otro']);
app.post('/api/items/:id/report', auth(true), reportLimit, async (req, res) => {
  const id = idParam(req.params.id);
  if (!(await get('SELECT 1 FROM items WHERE id = ?', [id]))) fail(404, 'Esta publicación no existe');
  const reason = oneOf(req.body?.reason, REPORT_REASONS, 'Motivo');
  const detail = text(req.body?.detail, { field: 'Detalle', max: 500 });
  if (await get('SELECT 1 FROM reports WHERE item_id = ? AND user_id = ?', [id, req.user.id])) {
    return res.json({ ok: true, already: true });
  }
  await run('INSERT INTO reports (item_id, user_id, reason, detail, created_at) VALUES (?, ?, ?, ?, ?)', [id, req.user.id, reason, detail, now()]);
  res.status(201).json({ ok: true });
});

app.delete('/api/items/:id', auth(true), async (req, res) => {
  const id = idParam(req.params.id);
  await getOwnedItem(id, req.user);
  const photos = await itemPhotos(id);
  await transaction((tx) => deleteItemRows(tx, id));
  await removePhotos(photos);
  res.status(204).end();
});

// --- favoritos

app.post('/api/items/:id/favorite', auth(true), async (req, res) => {
  const id = idParam(req.params.id);
  if (!(await get('SELECT 1 FROM items WHERE id = ?', [id]))) fail(404, 'Esta publicación no existe');
  const exists = await get('SELECT 1 FROM favorites WHERE user_id = ? AND item_id = ?', [req.user.id, id]);
  if (exists) await run('DELETE FROM favorites WHERE user_id = ? AND item_id = ?', [req.user.id, id]);
  else await run('INSERT INTO favorites (user_id, item_id, created_at) VALUES (?, ?, ?)', [req.user.id, id, now()]);
  const { n } = await get('SELECT COUNT(*) AS n FROM favorites WHERE item_id = ?', [id]);
  res.json({ isFavorite: !exists, favorites: n });
});

app.get('/api/favorites', auth(true), async (req, res) => {
  const rows = await all(`${LIST_SELECT} JOIN favorites fv ON fv.item_id = i.id AND fv.user_id = ? ORDER BY fv.created_at DESC`, [req.user.id]);
  res.json({ items: await toListItems(rows, req.user) });
});

// --- perfiles

app.get('/api/users/:id', async (req, res) => {
  const id = idParam(req.params.id);
  const user = await get('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) fail(404, 'Este usuario no existe');
  const stats = await get(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold FROM items WHERE user_id = ?`,
    [id]
  );
  res.json({ user: { ...publicUser(user), itemCount: stats.total, soldCount: stats.sold ?? 0 } });
});

// --- mensajes

async function addMessage(conn, conversationId, senderId, body) {
  const t = now();
  const result = await conn.run('INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)', [conversationId, senderId, body, t]);
  await conn.run('UPDATE conversations SET updated_at = ? WHERE id = ?', [t, conversationId]);
  return { id: result.lastInsertRowid, mine: true, body, createdAt: t, read: false };
}

async function getConversation(id, user) {
  const conv = await get('SELECT * FROM conversations WHERE id = ?', [id]);
  if (!conv || (conv.buyer_id !== user.id && conv.seller_id !== user.id)) fail(404, 'Conversación no encontrada');
  return conv;
}

app.post('/api/items/:id/conversations', auth(true), async (req, res) => {
  const itemId = idParam(req.params.id);
  const item = await get('SELECT id, user_id, status FROM items WHERE id = ?', [itemId]);
  if (!item) fail(404, 'Esta publicación no existe');
  if (item.user_id === req.user.id) fail(400, 'No podés enviarte mensajes a vos mismo');
  const body = text(req.body?.body, { field: 'Mensaje', min: 1, max: 1000, required: true });

  const conversationId = await transaction(async (tx) => {
    const t = now();
    await tx.run(
      `INSERT INTO conversations (item_id, buyer_id, seller_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (item_id, buyer_id) DO NOTHING`,
      [item.id, req.user.id, item.user_id, t, t]
    );
    const conv = await tx.get('SELECT id FROM conversations WHERE item_id = ? AND buyer_id = ?', [item.id, req.user.id]);
    await addMessage(tx, conv.id, req.user.id, body);
    return conv.id;
  });
  res.status(201).json({ id: conversationId });
});

app.get('/api/conversations', auth(true), async (req, res) => {
  const uid = req.user.id;
  const rows = await all(
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
     ORDER BY c.updated_at DESC`,
    [uid, uid, uid, uid]
  );
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

app.get('/api/conversations/:id', auth(true), async (req, res) => {
  const conv = await getConversation(idParam(req.params.id), req.user);
  const uid = req.user.id;
  await run('UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id <> ? AND read_at IS NULL', [now(), conv.id, uid]);

  const item = await get('SELECT id, title, price, status FROM items WHERE id = ?', [conv.item_id]);
  const cover = await get('SELECT filename FROM item_photos WHERE item_id = ? ORDER BY position LIMIT 1', [conv.item_id]);
  const otherId = conv.buyer_id === uid ? conv.seller_id : conv.buyer_id;
  const other = await get('SELECT * FROM users WHERE id = ?', [otherId]);
  const messages = await all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id', [conv.id]);

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

app.post('/api/conversations/:id/messages', auth(true), async (req, res) => {
  const conv = await getConversation(idParam(req.params.id), req.user);
  const body = text(req.body?.body, { field: 'Mensaje', min: 1, max: 1000, required: true });
  res.status(201).json(await addMessage({ run }, conv.id, req.user.id, body));
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// --- frontend compilado (modo producción: npm run build && npm start)
//
// La página base (index.html) sale del build local, o en Vercel Services del servicio
// "client", cuya dirección interna Vercel inyecta en CLIENT_URL (binding en vercel.json).

const HAS_DIST = fs.existsSync(CLIENT_DIST);
const CLIENT_URL = process.env.CLIENT_URL;
let indexHtmlCache = null;

async function indexHtml() {
  if (indexHtmlCache) return indexHtmlCache;
  if (HAS_DIST) {
    indexHtmlCache = fs.readFileSync(path.join(CLIENT_DIST, 'index.html'), 'utf8');
  } else {
    const base = CLIENT_URL.endsWith('/') ? CLIENT_URL : `${CLIENT_URL}/`;
    const r = await fetch(new URL('index.html', base));
    if (!r.ok) throw new Error(`No se pudo leer index.html del servicio client (HTTP ${r.status})`);
    indexHtmlCache = await r.text();
  }
  return indexHtmlCache;
}

if (HAS_DIST) app.use(express.static(CLIENT_DIST, { index: false }));

if (HAS_DIST || CLIENT_URL) {
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Vista previa (Open Graph) cuando se comparte un artículo en WhatsApp, Facebook, etc.
  app.get('/articulo/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const item = id > 0 ? await get('SELECT id, title, price, description FROM items WHERE id = ?', [id]) : null;
    const html = await indexHtml();
    if (!item) return res.type('html').send(html);
    const cover = await get('SELECT filename FROM item_photos WHERE item_id = ? ORDER BY position LIMIT 1', [id]);
    const base = `${req.protocol}://${req.get('host')}`;
    const image = cover ? photoUrl(cover.filename) : null;
    const description = (item.description || 'Mirá esta publicación en PasalO.').slice(0, 160);
    const tags = [
      `<meta property="og:type" content="product" />`,
      `<meta property="og:site_name" content="PasalO" />`,
      `<meta property="og:title" content="${escapeHtml(item.title)} · Gs. ${item.price.toLocaleString('es-PY')}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      `<meta property="og:url" content="${base}/articulo/${item.id}" />`,
      image ? `<meta property="og:image" content="${/^https?:/.test(image) ? image : base + image}" />` : '',
      `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    ]
      .filter(Boolean)
      .join('\n    ');
    res.type('html').send(html.replace('</head>', `    ${tags}\n  </head>`));
  });
}

if (HAS_DIST) {
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

export default app;
