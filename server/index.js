// Arranca el servidor en un puerto (desarrollo, Docker, Render, Railway, VPS).
import app from './app.js';
import { USE_CLOUDINARY } from './photos.js';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`API de PasalO escuchando en http://localhost:${PORT}`);
  console.log(`Base de datos: ${process.env.DB_URL ? 'Turso' : 'archivo local'} · Fotos: ${USE_CLOUDINARY ? 'Cloudinary' : 'disco local'}`);
});
