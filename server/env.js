// Carga los secretos de la app desde un archivo .env (nunca en git):
// .env.production en producción, .env en desarrollo. Las variables que ya existen
// (las que da el servidor: NODE_ENV, PORT, DATABASE_URL, PHOTOS_DIR) tienen prioridad.
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

const file = path.join(import.meta.dirname, '..', process.env.NODE_ENV === 'production' ? '.env.production' : '.env');

if (fs.existsSync(file)) {
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file, 'utf8')))) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
