# 🍓 PasalO

Lo que ya no usás, hacelo plata. El marketplace de segunda mano de Paraguay.

Marketplace de segunda mano para Paraguay, al estilo Vinted. Los usuarios se registran, suben sus artículos con fotos, y los compradores los encuentran, los guardan en favoritos y le escriben al vendedor por chat o WhatsApp.

## Qué incluye

- **Cuentas de usuario**: registro e ingreso con email y contraseña (cifrada con scrypt).
- **Publicar artículos**: hasta 5 fotos (JPG, PNG o WEBP, máx. 8 MB c/u), título, descripción, precio en guaraníes, categoría, estado, marca, talle y ciudad.
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
| Diseño | Tipografías Bricolage Grotesque e Inter, modo oscuro automático |
| Backend | Node.js + Express 5 |
| Base de datos | SQLite vía libsql: archivo local en desarrollo, Turso (gratis) en producción |
| Fotos | En `server/uploads/` en desarrollo; Cloudinary (gratis) en producción |

## Cómo arrancarlo

1. Instalá **Node.js 22.13 o más nuevo** (recomendado: la versión LTS de <https://nodejs.org>).
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

Todo queda servido desde <http://localhost:3001>. Podés cambiar el puerto con la variable `PORT`.

## Estructura

```
che-ropero/
├── client/            Frontend (Vite + React)
│   └── src/
│       ├── pages/     Inicio, Artículo, Vender, Perfil, Mensajes, etc.
│       ├── components/
│       └── styles.css
└── server/            API (Express)
    ├── index.js       Rutas de la API
    ├── db.js          Tablas SQLite
    ├── constants.js   Categorías, estados y ciudades
    ├── seed.js        Datos de ejemplo
    ├── data/          Base de datos (se crea sola)
    └── uploads/       Fotos subidas (se crea sola)
```

Para agregar ciudades o categorías, editá `server/constants.js`.

## App para celular (Google Play y App Store)

La misma web se empaqueta con Capacitor. Los proyectos nativos están en `client/android/` y `client/ios/`. Todos los pasos, requisitos de las tiendas y costos están en [STORES.md](STORES.md).

## Publicarlo en internet

Todos los pasos (Vercel + Turso + Cloudinary, gratis y sin tarjeta) están en [DEPLOY.md](DEPLOY.md).

Ya incluido: límites anti-abuso, botón de denunciar, borrado de cuenta, términos y privacidad, vistas previas al compartir. Pendiente para más adelante:

- **Recuperar contraseña** y verificación de email (requieren un servicio de correo).
- **Panel de administración** para revisar denuncias y retirar publicaciones.
- **Pagos en línea** (Bancard, Pagopar o similares), si algún día querés cobrar dentro de la plataforma.
