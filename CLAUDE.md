@HEBERGEMENT.md

## Proyecto

PasalO: marketplace de segunda mano para Paraguay, sin comisión. Producción en https://pasalo.kazflow.com (servidor de Briac).

- `client/`: React 19 + Vite. `npm run build` en la raíz compila a `dist/`.
- `server/`: Express 5, SQLite (libsql) y fotos en disco procesadas con sharp. Arranca con `npm start`.
- `client/android` y `client/ios`: app nativa con Capacitor; le pide todo a `PRODUCTION_URL` (`client/src/api.js`).
- Publicar: `npm run publicar` (ver `scripts/publicar.mjs` y la sección 4 de HEBERGEMENT.md).
