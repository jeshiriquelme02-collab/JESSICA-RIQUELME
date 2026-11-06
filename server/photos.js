// Fotos en el disco del servidor. Cada foto pasa por sharp: se comprueba el formato real
// (no la extensión ni el tipo que declara el navegador), se gira según la orientación de
// la cámara, se achica a 1600 px como máximo y se recodifica en WebP. Al recodificar se
// descartan todos los metadatos (EXIF, incluida la ubicación GPS).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const PHOTOS_DIR = process.env.PHOTOS_DIR || path.join(import.meta.dirname, 'uploads');
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

// Una sola foto a la vez: el servidor tiene 1 procesador y 768 MB
sharp.concurrency(1);
sharp.cache(false);

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_SIDE = 1600;
const MAX_PIXELS = 40_000_000; // ~ foto de 40 megapíxeles

export class PhotoError extends Error {}

async function toWebp(buffer) {
  let format;
  try {
    ({ format } = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata());
  } catch {
    throw new PhotoError('Una de las fotos no se pudo leer. Probá con otra.');
  }
  if (!ACCEPTED_FORMATS.has(format)) throw new PhotoError('Solo se aceptan fotos JPG, PNG o WEBP');
  try {
    return await sharp(buffer, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new PhotoError('Una de las fotos no se pudo procesar. Probá con otra.');
  }
}

// Guarda un archivo con un nombre aleatorio (nunca el nombre que mandó el navegador)
async function saveFile(buffer, ext) {
  const filename = crypto.randomBytes(16).toString('hex') + ext;
  await fs.promises.writeFile(path.join(PHOTOS_DIR, filename), buffer, { flag: 'wx' });
  return { filename, publicId: '' };
}

// Recibe [{ buffer }] (de multer) y devuelve [{ filename, publicId }].
export async function storePhotos(files) {
  const stored = [];
  try {
    for (const f of files) stored.push(await saveFile(await toWebp(f.buffer), '.webp'));
    return stored;
  } catch (err) {
    await removePhotos(stored);
    throw err;
  }
}

// Solo para los datos de ejemplo (npm run seed): guarda un SVG generado por el propio código
export const storeSeedSvg = (svg) => saveFile(Buffer.from(svg), '.svg');

// Recibe filas con { filename }. Las URL completas son fotos viejas de Cloudinary: se ignoran.
export async function removePhotos(photos) {
  for (const p of photos) {
    if (!p.filename || /^https?:/.test(p.filename)) continue;
    try {
      await fs.promises.rm(path.join(PHOTOS_DIR, path.basename(p.filename)), { force: true });
    } catch {
      /* una foto huérfana no es grave */
    }
  }
}
