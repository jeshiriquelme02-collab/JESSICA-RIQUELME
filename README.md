# 🍓 PasalO

Lo que ya no usás, hacelo plata. El marketplace de segunda mano de Paraguay.

Marketplace de segunda mano para Paraguay, al estilo Vinted. Los usuarios se registran, suben sus artículos con fotos, y los compradores los encuentran, los guardan en favoritos y le escriben al vendedor por chat o WhatsApp.

## Qué incluye

- **Cuentas de usuario**: registro e ingreso con email y contraseña (cifrada con scrypt).
- **Publicar artículos**: hasta 5 fotos (JPG, PNG o WEBP, máx. 10 MB c/u, se guardan en WebP sin datos de ubicación), título, descripción, precio en guaraníes, categoría, estado, marca, talle y ciudad.
- **Explorar**: búsqueda por texto, filtros por categoría, ciudad y rango de precio, y orden por fecha, precio o popularidad.
- **Favoritos**: guardar artículos con el corazón.
- **Mensajes**: chat entre comprador y vendedor por cada artículo, con contador de no leídos.
- **WhatsApp**: si el vendedor cargó su celular, aparece el botón "Escribir por WhatsApp".
- **Gestión**: el vendedor marca su artículo como Disponible, Reservado o Vendido, o lo elimina.
- **Perfiles públicos** con las publicaciones y ventas de cada usuario.
- Diseño adaptado a celulares, textos en español de Paraguay.

## Tecnología

| Parte | Herramienta |
| --- | --- |
| Frontend | Vite + React 19 + React Router + íconos Lucide |
| Diseño | Tipografías Bricolage Grotesque e Inter incluidas en el sitio (Fontsource), modo oscuro automático |
| Backend | Node.js 26 + Express 5, helmet, express-rate-limit |
| Base de datos | SQLite vía libsql, en un archivo (`DATABASE_URL`) |
| Fotos | En el disco (`PHOTOS_DIR`), recodificadas en WebP con sharp |
| Sesiones | Cookie httpOnly en la web; token Bearer en la app de celular |
| Hosting | Servidor de Briac, <https://pasalo.kazflow.com>, detrás de Cloudflare |

## Cómo arrancarlo

1. Instalá **Node.js 26 o más nuevo** (la versión LTS de <https://nodejs.org>).
2. En esta carpeta, instalá las dependencias:

```bash
npm run install:all
```

3. (Opcional) Cargá datos de ejemplo:

```bash
npm run seed
```

Crea 3 cuentas demo: `lorena@demo.test`, `diego@demo.test` y `fatima@demo.test`, todas con la contraseña `demo1234`.

4. Arrancá el proyecto en modo desarrollo:

```bash
npm run dev
```

Abrí <http://localhost:5173>. La API corre en el puerto 3001 y Vite le reenvía las llamadas.

## Modo producción

```bash
npm run build
npm start
```

`npm run build` compila la interfaz en `dist/` y `npm start` sirve todo desde <http://localhost:3001>. Podés cambiar el puerto con la variable `PORT`.

## Estructura

```
che-ropero/
├── package.json       Dependencias del servidor y scripts (dev, build, start, publicar)
├── .env.production    Configuración de producción (no va a git)
├── client/            Frontend (Vite + React) y apps nativas (Capacitor)
│   └── src/
│       ├── pages/     Inicio, Artículo, Vender, Perfil, Mensajes, etc.
│       ├── components/
│       └── styles.css
├── server/            API (Express)
│   ├── index.js       Arranque (lee .env.production con env.js)
│   ├── app.js         Rutas, sesiones y seguridad
│   ├── db.js          Tablas SQLite
│   ├── photos.js      Fotos con sharp
│   ├── constants.js   Categorías, estados y ciudades
│   ├── seed.js        Datos de ejemplo
│   ├── data/          Base de datos local (se crea sola)
│   └── uploads/       Fotos locales (se crea sola)
└── scripts/
    └── publicar.mjs   Publica una versión en pasalo.kazflow.com
```

Para agregar ciudades o categorías, editá `server/constants.js`.

## App para celular (Google Play y App Store)

La misma web se empaqueta con Capacitor. Los proyectos nativos están en `client/android/` y `client/ios/`. Cómo compilar en la Mac: [MAC.md](MAC.md). Requisitos de las tiendas y costos: [STORES.md](STORES.md).

## Publicarlo en internet

El sitio corre en el servidor de Briac. Acceso (WireGuard + SSH), reglas de seguridad y publicación: [HEBERGEMENT.md](HEBERGEMENT.md). Para publicar una versión: `npm run publicar`.

Ya incluido: límites anti-abuso, botón de denunciar, borrado de cuenta, términos y privacidad, vistas previas al compartir. Pendiente para más adelante:

- **Recuperar contraseña** y verificación de email (requieren un servicio de correo).
- **Panel de administración** para revisar denuncias y retirar publicaciones.
- **Pagos en línea** (Bancard, Pagopar o similares), si algún día querés cobrar dentro de la plataforma.
