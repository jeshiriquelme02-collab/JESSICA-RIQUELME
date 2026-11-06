// Guardado de fotos: en Cloudinary (gratis, con compresión automática) cuando está
// definida CLOUDINARY_URL; si no, en el disco local (UPLOAD_DIR).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

// En Vercel solo se puede escribir en /tmp (y se borra): allá siempre hay que usar Cloudinary
export const UPLOAD_DIR = process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/uploads' : path.join(import.meta.dirname, 'uploads'));
export const USE_CLOUDINARY = Boolean(process.env.CLOUDINARY_URL);

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/svg+xml': '.svg' };

if (USE_CLOUDINARY) cloudinary.config({ secure: true });
else fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'pasalo',
        resource_type: 'image',
        // Nunca más de 1600 px por lado: alcanza de sobra para celulares y ahorra cuota
        transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Recibe [{ buffer, mimetype }] y devuelve [{ filename, publicId }].
// `filename` es un nombre local o una URL completa, según dónde se guardó.
export async function storePhotos(files) {
  const stored = [];
  try {
    for (const f of files) {
      if (USE_CLOUDINARY) {
        const r = await uploadToCloudinary(f.buffer);
        // Entregar siempre en el mejor formato y calidad que soporte el navegador
        const url = cloudinary.url(r.public_id, { secure: true, fetch_format: 'auto', quality: 'auto' });
        stored.push({ filename: url, publicId: r.public_id });
      } else {
        const filename = crypto.randomUUID() + (EXT[f.mimetype] ?? '.jpg');
        await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), f.buffer);
        stored.push({ filename, publicId: '' });
      }
    }
    return stored;
  } catch (err) {
    await removePhotos(stored);
    throw err;
  }
}

// Recibe filas con { filename, public_id } o { filename, publicId }
export async function removePhotos(photos) {
  for (const p of photos) {
    const publicId = p.publicId ?? p.public_id;
    try {
      // invalidate: que la foto deje de verse ya, sin esperar a que venza la caché de Cloudinary
      if (publicId) await cloudinary.uploader.destroy(publicId, { invalidate: true });
      else if (p.filename && !/^https?:/.test(p.filename)) {
        await fs.promises.rm(path.join(UPLOAD_DIR, path.basename(p.filename)), { force: true });
      }
    } catch {
      /* una foto huérfana no es grave */
    }
  }
}
