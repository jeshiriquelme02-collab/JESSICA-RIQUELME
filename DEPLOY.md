# 🚀 Publicar PasalO en internet (gratis)

## Opción recomendada: Vercel (gratis, sin tarjeta)

El proyecto usa [Vercel Services](https://vercel.com/docs/services) (`vercel.json`): dos servicios en un mismo dominio.

| Servicio | Carpeta | Público en | Qué hace |
| --- | --- | --- | --- |
| `client` | `client/` (Vite) | todo lo demás (`/`) | La página. Las rutas internas (`/mensajes`, `/vender`…) caen en `index.html`. |
| `server` | `server/` (Express, `app.js`) | `/api/*` y `/articulo/*` | La API y las vistas previas para WhatsApp. |

`server` tiene un binding a `client` (`CLIENT_URL`, lo inyecta Vercel): lo usa solo para leer `index.html` y agregarle las etiquetas de vista previa en `/articulo/:id`. La base va en **Turso** y las fotos en **Cloudinary** (ver pasos 1 y 2 más abajo para crear esas dos cuentas).

1. Entrá a <https://vercel.com/signup>, elegí **Hobby** y **Continue with GitHub**.
2. **Add New → Project** → **Import** el repositorio `JESSICA-RIQUELME`.
3. **Project Name**: `pasalo`. No cambies nada de Build Settings: los toma de `vercel.json`.
4. En **Environment Variables**, pegá en el primer casillero las tres líneas juntas (Vercel las separa solo):

   ```
   DB_URL=libsql://...
   DB_AUTH_TOKEN=eyJ...
   CLOUDINARY_URL=cloudinary://...
   ```

5. **Deploy**. En 2 o 3 minutos queda en `https://pasalo.vercel.app` (o el nombre que asigne Vercel).

`PUBLIC_URL` no hace falta en Vercel: las fotos de Cloudinary ya tienen dirección completa y las vistas previas usan el dominio de la visita.

Notas:
- Las funciones corren en São Paulo (`gru1`), al lado de la base de Turso.
- Para probar los dos servicios juntos en local: `npx vercel dev -L`.
- Cada envío a Vercel puede pesar hasta 4,5 MB; por eso la app achica las fotos en el celular antes de subirlas (`client/src/images.js`).
- El plan Hobby de Vercel es para uso personal o no comercial. Para empezar y probar está bien; si PasalO crece como negocio, conviene pasar al plan Pro o a otro hosting (el mismo código corre en Render, Railway o un VPS con el `Dockerfile`).

---

## Otras opciones

Tres servicios gratuitos, cada uno hace una cosa:

| Servicio | Para qué | Plan gratis |
| --- | --- | --- |
| **Render** | Corre el servidor (el código) | 750 horas/mes, se duerme sin visitas |
| **Turso** | Guarda la base de datos (usuarios, publicaciones, mensajes) | 9 GB, más que suficiente |
| **Cloudinary** | Guarda y comprime las fotos | 25 créditos/mes, miles de fotos |

Más un "despertador" gratuito (cron-job.org) para que Render no se duerma.

> ¿Por qué no un solo servicio? Los hosting gratuitos borran el disco en cada reinicio. Con la base y las fotos afuera, el servidor puede reiniciarse mil veces y no se pierde nada.

El repositorio ya está en GitHub: <https://github.com/jeshiriquelme02-collab/JESSICA-RIQUELME>. Render lo lee de ahí y cada `git push` redespliega solo.

## 1. Turso (base de datos)

1. Entrá a <https://turso.tech> → **Sign up with GitHub**.
2. **Create Database**: nombre `pasalo`, región **São Paulo** (la más cercana a Paraguay). Dejá lo demás por defecto.
3. Al entrar a la base, buscá la **URL** (empieza con `libsql://pasalo-...turso.io`). Copiala.
4. **Generate Token** (o "Create Token"): elegí **Read & Write**, sin vencimiento ("No expiration"). Copiá el token: es largo, empieza con `eyJ`. **Se muestra una sola vez.**

Guardá los dos valores:
- `DB_URL` = la URL `libsql://...`
- `DB_AUTH_TOKEN` = el token

## 2. Cloudinary (fotos)

1. Entrá a <https://cloudinary.com/users/register_free> → **Sign up with GitHub** (o con email).
2. Cuando pregunte para qué lo usás, cualquier opción; elegí "Programmable Media" / Developer si aparece.
3. En el panel, **Settings → API Keys** (o el botón **View API Keys** en la página principal). Hay un valor llamado **API environment variable** que se ve así:
   `CLOUDINARY_URL=cloudinary://123456789012345:AbCdEfG...@nombre-de-tu-cloud`
4. Copiá **solo lo que está después del `=`** (empieza con `cloudinary://`).

Guardá:
- `CLOUDINARY_URL` = `cloudinary://...`

## 3. Render (servidor)

1. Entrá a <https://render.com> → **Sign up with GitHub**.
2. En el panel, **New → Web Service**.
3. Conectá GitHub si lo pide y elegí el repositorio **JESSICA-RIQUELME**.
4. Render detecta el `Dockerfile`. Revisá:
   - **Name**: `pasalo` (va a ser la dirección: `pasalo.onrender.com`; si está tomado, poné `pasalo-py`).
   - **Region**: **Ohio (US East)** es la más cercana a Paraguay.
   - **Instance Type**: **Free**.
5. Bajá hasta **Environment Variables** y agregá estas cuatro (botón **Add Environment Variable**):

   | Key | Value |
   | --- | --- |
   | `PUBLIC_URL` | `https://pasalo.onrender.com` (con el nombre que elegiste, sin barra final) |
   | `DB_URL` | la URL de Turso |
   | `DB_AUTH_TOKEN` | el token de Turso |
   | `CLOUDINARY_URL` | el valor de Cloudinary |

6. **Deploy Web Service**. La primera construcción tarda 5 a 8 minutos. Cuando el estado diga **Live** (verde), está en línea.

Al abrir `https://pasalo.onrender.com/api/health` tiene que responder `{"ok":true}`.

## 4. Despertador (para que no se duerma)

El plan gratis de Render apaga el servidor a los 15 minutos sin visitas, y la siguiente visita tarda ~50 segundos. Esto lo evita:

1. Entrá a <https://cron-job.org> y creá una cuenta.
2. **Create cronjob**:
   - **URL**: `https://pasalo.onrender.com/api/health`
   - **Schedule**: cada **10 minutos**.
3. Guardá. Listo: el servidor recibe una visita cada 10 minutos y nunca se duerme.

## 5. Datos de ejemplo (opcional)

Para que el sitio no se vea vacío mientras probás, desde tu computadora:

```bash
cd server
```

```bash
$env:DB_URL="libsql://..."; $env:DB_AUTH_TOKEN="eyJ..."; $env:CLOUDINARY_URL="cloudinary://..."; npm run seed
```

(Reemplazá los valores por los tuyos.) Borrá las cuentas demo antes del lanzamiento real.

## 6. Probar

- Registrate, publicá algo con foto. La foto tiene que verse con una dirección `res.cloudinary.com`.
- Pegá el enlace del artículo en WhatsApp: tiene que salir la vista previa con foto y precio.
- Desde el panel de Render, **Manual Deploy → Restart**: al volver, las publicaciones y fotos tienen que seguir ahí.

## 7. Dominio propio `pasalo.com.py` (cuando quieras)

1. Registralo en **NIC Paraguay** (<https://www.nic.py>). Tarda uno o dos días.
2. En Render: el servicio → **Settings → Custom Domains → Add**: `pasalo.com.py` y `www.pasalo.com.py`. Te muestra los registros DNS (un **A** o **CNAME**).
3. Cargalos en el panel DNS del dominio. Render emite el certificado HTTPS solo.
4. Cambiá `PUBLIC_URL` a `https://pasalo.com.py` en Environment Variables y actualizá la URL del cronjob.

## Actualizar el sitio

Cada `git push` a `main` redespliega solo en 3-5 minutos. La base (Turso) y las fotos (Cloudinary) no se tocan.

## Copias de seguridad

- **Turso**: en el panel de la base, **Snapshots** / **Backups**, o desde la terminal con `turso db shell pasalo .dump > backup.sql`.
- **Cloudinary**: las fotos quedan en su panel (**Media Library**); se pueden descargar en lote.

## Si algún día querés pagar

Con el plan **Starter** de Render (USD 7/mes) el servidor no se duerme y no hace falta el despertador. Turso y Cloudinary siguen gratis mientras no superes los límites, que para PasalO están lejísimos.

## Alternativas con el mismo Dockerfile

- **Railway** (USD 5/mes): montar un volumen en `/data` y no definir `DB_URL` ni `CLOUDINARY_URL`; los datos quedan en el disco. Está en `railway.json`.
- **VPS** (Contabo, Hetzner): `docker build -t pasalo . && docker run -d -p 80:3001 -v /srv/pasalo:/data -e PUBLIC_URL=https://pasalo.com.py pasalo`, más Caddy adelante para HTTPS.
