# 🚀 Publicar PasalO en internet

La forma más simple y barata para arrancar: **Railway** (unos USD 5 por mes con el plan Hobby, que incluye crédito). Todo lo de abajo también sirve para Render o un VPS con Docker, porque el proyecto se construye con el `Dockerfile`.

## Qué hay en el repo

| Archivo | Para qué |
| --- | --- |
| `Dockerfile` | Construye el frontend y arranca el servidor. |
| `railway.json` | Le dice a Railway que use el Dockerfile y que vigile `/api/health`. |
| `.dockerignore` | Deja afuera lo que no va a producción (proyectos nativos, datos locales). |

El servidor lee estas variables de entorno:

| Variable | Valor en Railway | Qué hace |
| --- | --- | --- |
| `PUBLIC_URL` | `https://pasalo.com.py` (o la URL que te dé Railway al principio) | Las fotos salen con dirección completa; necesario para la app de celular y las vistas previas de WhatsApp. |
| `DB_FILE` | `/data/pasalo.db` | Dónde vive la base de datos. **Tiene que estar en el volumen.** |
| `UPLOAD_DIR` | `/data/uploads` | Dónde se guardan las fotos. **Tiene que estar en el volumen.** |
| `PORT` | la pone Railway sola | Puerto del servidor. |

`DB_FILE` y `UPLOAD_DIR` ya vienen con esos valores en el Dockerfile; solo hace falta montar el volumen en `/data`.

## Paso a paso en Railway

### 1. Subir el código a GitHub
Railway despliega desde un repositorio. El de PasalO ya está en
<https://github.com/jeshiriquelme02-collab/JESSICA-RIQUELME>. Si algún día lo armás de cero:

1. Instalá Git si no lo tenés: <https://git-scm.com/download/win> (o `winget install Git.Git`).
2. Creá una cuenta en <https://github.com> y un repositorio nuevo, privado, llamado `pasalo`.
3. En esta carpeta, una sola vez:

```bash
git init -b main
```

```bash
git add .
```

```bash
git commit -m "PasalO: primera versión"
```

```bash
git remote add origin https://github.com/TU_USUARIO/pasalo.git
```

```bash
git push -u origin main
```

### 2. Crear el proyecto
1. Entrá en <https://railway.app> e iniciá sesión con GitHub.
2. **New Project → Deploy from GitHub repo → `JESSICA-RIQUELME`**. Railway detecta el `Dockerfile` y empieza a construir (tarda 3 a 5 minutos la primera vez).

### 3. Agregar el disco persistente (importante)
Sin esto, **cada vez que se reinicie el servidor se pierden la base de datos y las fotos.**

1. En el servicio, pestaña **Settings → Volumes → Add Volume** (o clic derecho sobre el servicio → *Attach Volume*).
2. Mount path: `/data`.
3. Tamaño inicial: 1 GB alcanza para empezar (se puede agrandar después).

### 4. Variables de entorno
En **Variables**, agregá:

- `PUBLIC_URL` = la URL del servicio. Al principio es la que Railway genera (Settings → Networking → *Generate Domain*, algo como `pasalo-production.up.railway.app`). Cuando tengas el dominio propio, cambiala por `https://pasalo.com.py`.

Guardá; Railway redespliega solo.

### 5. Cargar datos de ejemplo (opcional)
Para que el sitio no se vea vacío mientras probás, desde la pestaña del servicio podés abrir una consola o usar el CLI:

```bash
railway run npm run seed
```

Borrá las cuentas demo antes del lanzamiento real.

### 6. Dominio propio `pasalo.com.py`
1. Registrá el dominio en **NIC Paraguay** (<https://www.nic.py>). Los `.com.py` requieren datos del titular; tarda uno o dos días.
2. En Railway: **Settings → Networking → Custom Domain** → `pasalo.com.py`. Te muestra un registro **CNAME** (o A) para configurar.
3. En el panel de DNS del dominio, creá ese registro apuntando a Railway. Agregá también `www` si querés.
4. Railway emite el certificado HTTPS solo. Puede tardar hasta una hora en propagarse.
5. Cambiá `PUBLIC_URL` a `https://pasalo.com.py`.

### 7. Verificar
- `https://TU_DOMINIO/api/health` tiene que devolver `{"ok":true}`.
- Registrate, publicá algo con foto, cerrá sesión, volvé a entrar: la foto tiene que seguir ahí.
- Pegá el enlace de un artículo en WhatsApp: tiene que aparecer la vista previa con foto y precio.

## Actualizar el sitio
Cada `git push` a `main` redespliega solo. El volumen con la base y las fotos no se toca.

## Copias de seguridad
Railway hace snapshots del volumen, pero conviene bajar una copia cada tanto:

```bash
railway run sh -c "cat /data/pasalo.db" > backup-pasalo.db
```

Las fotos están en `/data/uploads`; para un respaldo completo, usá la opción de *Backups* del volumen en Railway.

## Alternativas

- **Render**: igual de simple; *New → Web Service → Docker*, agregá un *Disk* en `/data` y las mismas variables. El plan gratuito se duerme cuando no hay tráfico, así que para público conviene el pago.
- **VPS** (Contabo, Hetzner, DigitalOcean): instalá Docker y ejecutá
  `docker build -t pasalo . && docker run -d -p 80:3001 -v /srv/pasalo:/data -e PUBLIC_URL=https://pasalo.com.py pasalo`,
  más Caddy o Nginx adelante para HTTPS. Más barato a largo plazo, pero vos administrás el servidor.
