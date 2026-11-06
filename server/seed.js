// Carga usuarios y publicaciones de ejemplo. Uso: npm run seed
// Contraseña de todas las cuentas demo: demo1234
import './env.js';
import crypto from 'node:crypto';
import { get, ready, transaction } from './db.js';
import { storeSeedSvg } from './photos.js';

await ready();

if (await get("SELECT 1 FROM users WHERE email LIKE '%@demo.test'")) {
  console.log('Los datos demo ya están cargados.');
  process.exit(0);
}

const PASSWORD = 'demo1234';
const users = [
  { name: 'Lorena Benítez', email: 'lorena@demo.test', city: 'Asunción', phone: '595981123456' },
  { name: 'Diego Ortiz', email: 'diego@demo.test', city: 'Ciudad del Este', phone: '595971654321' },
  { name: 'Fátima Gauto', email: 'fatima@demo.test', city: 'Encarnación', phone: '' },
];

const items = [
  [0, 'Vestido floral de verano', 'Usado dos veces, tela fresca ideal para el calor de Asunción.', 85000, 'mujer', 'muy_bueno', 'M', 'Zara', '👗', '#f9a8d4', '#fb7185'],
  [0, 'Cartera de cuero marrón', 'Cuero legítimo, con correa regulable. Sin detalles.', 150000, 'accesorios', 'muy_bueno', '', 'Prüne', '👜', '#fcd34d', '#d97706'],
  [0, 'Remera de Cerro Porteño 2025', 'Original, comprada en la tienda oficial. Talle L.', 220000, 'deportes', 'nuevo_etiqueta', 'L', 'Puma', '⚽', '#93c5fd', '#dc2626'],
  [1, 'Zapatillas Nike Air Max', 'Talle 42, poco uso. Se entregan con caja.', 450000, 'calzados', 'muy_bueno', '42', 'Nike', '👟', '#a5b4fc', '#4f46e5'],
  [1, 'iPhone 13 128 GB', 'Batería al 87 %. Sin rayaduras, con funda y cargador.', 2900000, 'electronica', 'bueno', '', 'Apple', '📱', '#cbd5e1', '#334155'],
  [1, 'Camisa de lino blanca', 'Ideal para eventos. Talle M, corte slim.', 120000, 'hombre', 'nuevo', 'M', 'Lacoste', '👔', '#e2e8f0', '#64748b'],
  [2, 'Lote de ropa para bebé 0-6 meses', '15 prendas en buen estado: bodies, enteritos y medias.', 180000, 'ninos', 'bueno', '0-6 m', '', '🧸', '#bbf7d0', '#16a34a'],
  [2, 'Termo Stanley 1,2 L con guampa', 'Para el tereré de todos los días. Mantiene el frío 24 h.', 260000, 'hogar', 'muy_bueno', '', 'Stanley', '🧉', '#86efac', '#15803d'],
  [2, 'Colección de libros de Roa Bastos', 'Yo el Supremo, Hijo de hombre y El trueno entre las hojas.', 140000, 'libros', 'bueno', '', '', '📚', '#fde68a', '#b45309'],
  [0, 'Bolso de ao po’i bordado', 'Artesanía de Yataity, hecho a mano. Nuevo.', 95000, 'accesorios', 'nuevo', '', 'Artesanal', '🧵', '#fef3c7', '#ca8a04'],
];

function svgPhoto(emoji, from, to) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <circle cx="400" cy="500" r="250" fill="#ffffff" fill-opacity="0.25"/>
  <text x="400" y="500" font-size="260" text-anchor="middle" dominant-baseline="central">${emoji}</text>
</svg>`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { hash: crypto.scryptSync(password, salt, 64).toString('hex'), salt };
}

// Las fotos se guardan primero, después se insertan las filas
const photos = [];
for (const [, , , , , , , , emoji, from, to] of items) photos.push(await storeSeedSvg(svgPhoto(emoji, from, to)));

await transaction(async (tx) => {
  const userIds = [];
  for (const [idx, u] of users.entries()) {
    const { hash, salt } = hashPassword(PASSWORD);
    const created = new Date(Date.now() - (60 - idx) * 86400000).toISOString();
    const r = await tx.run(
      'INSERT INTO users (name, email, password_hash, password_salt, city, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.name, u.email, hash, salt, u.city, u.phone, created]
    );
    userIds.push(r.lastInsertRowid);
  }

  for (const [idx, [owner, title, description, price, category, condition, size, brand]] of items.entries()) {
    const created = new Date(Date.now() - (items.length - idx) * 3 * 3600000).toISOString();
    const r = await tx.run(
      `INSERT INTO items (user_id, title, description, price, category, condition, size, brand, city, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userIds[owner], title, description, price, category, condition, size, brand, users[owner].city, created]
    );
    await tx.run('INSERT INTO item_photos (item_id, filename, public_id, position) VALUES (?, ?, ?, 0)', [r.lastInsertRowid, photos[idx].filename, photos[idx].publicId]);
  }
});

console.log(`Listo: ${users.length} usuarios y ${items.length} publicaciones demo.`);
console.log(`Ingresá con lorena@demo.test, diego@demo.test o fatima@demo.test (contraseña: ${PASSWORD}).`);
