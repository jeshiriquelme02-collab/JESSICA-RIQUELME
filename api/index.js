// Función de Vercel: toda la API (y las vistas previas de /articulo/:id) pasa por acá.
// Ver vercel.json. En los demás hostings se usa server/index.js.
export { default } from '../server/app.js';
