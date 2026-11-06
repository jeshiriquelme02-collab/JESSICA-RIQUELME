// Arranca el servidor. env.js va primero: carga .env.production antes de que app.js lea las variables.
import './env.js';
import app from './app.js';
import { DB_URL } from './db.js';
import { PHOTOS_DIR } from './photos.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`PasalO escuchando en el puerto ${PORT}`);
  console.log(`Base de datos: ${DB_URL} · Fotos: ${PHOTOS_DIR}`);
});
