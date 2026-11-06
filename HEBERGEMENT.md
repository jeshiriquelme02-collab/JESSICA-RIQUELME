# Alojamiento de la app en el servidor de Briac (pasalo.kazflow.com)

> Este documento está dirigido a **Claude**. Debe colocarse en la raíz del
> repositorio de la app, y `CLAUDE.md` debe contener la línea `@HEBERGEMENT.md`
> para que se lea en cada sesión.
>
> **La persona con la que trabajas solo habla español: háblale siempre en
> español.** No programa: haz tú mismo el trabajo técnico, explícale de forma
> sencilla lo que haces y por qué, y guíala paso a paso cuando tenga que hacer
> clic en algún sitio. El servidor (un VPS) lo administra Briac: todo lo que
> no esté en este documento pasa por él. Los mensajes del servidor
> (`publication.log`, `audit.log`) están en francés: tradúceselos y
> explícaselos.

## 0. Primera sesión: por dónde empezar

Haz esto en orden, en la primera sesión después de recibir este documento.
Antes de empezar, explícale en pocas palabras lo que van a hacer juntos:
conectar su PC al servidor de Briac para poder publicar su app.

1. **Instalar y configurar WireGuard** (sección 3.1), guiándola **paso a
   paso**:
   - da una sola instrucción a la vez, con el nombre exacto del botón, y espera
     a que te confirme que lo hizo antes de seguir;
   - si no encuentra un botón o algo no coincide, pídele una captura de
     pantalla;
   - tú le das el texto que debe pegar (sin la clave privada, que nunca debes
     ver).
2. **Crear la clave SSH** (sección 3.2): eso lo haces tú.
3. **Enviar las dos claves públicas a Briac**: la de WireGuard (ella la copia
   de la ventana de WireGuard) y la de SSH (tú se la muestras). Explícale que
   no son secretas.
4. **Esperar a que Briac confirme**, y luego activar el túnel y hacer la
   prueba de conexión (sección 3.2, «Prueba»).
5. **Adaptar la app** (sección 2), y pedirle a Briac la revisión de seguridad
   antes de la primera publicación (sección 4).

## 1. El entorno de producción

La app corre en el servidor de Briac, en un contenedor reservado para ella, y
responde en **https://pasalo.kazflow.com**. Cloudflare recibe a los
visitantes y cifra la conexión (HTTPS), y luego transmite las peticiones a la
app.

| Elemento | Valor |
|---|---|
| Node.js | **26 LTS**. Instalar la misma versión mayor en el PC |
| Arranque | `npm start`: el script `start` de `package.json` lanza el servidor Express de producción |
| Dependencias | se instalan **en el servidor** con `npm ci --omit=dev --ignore-scripts`, según `package-lock.json`. Nunca enviar `node_modules`: los módulos nativos (libsql, sharp) compilados para Windows no funcionan en Linux. Los scripts de instalación de los paquetes no se ejecutan (protección contra paquetes maliciosos). libsql y sharp no los necesitan; si otro paquete los necesita, pedírselo a Briac |
| Auditoría de seguridad | `npm audit` en cada publicación: **una vulnerabilidad alta o crítica en las dependencias hace que se rechace la publicación**, y la versión en línea se queda como está. El servidor repite la auditoría cada día: si hay una alerta, aparece en `publication.log` y en `audit.log`, y Briac la ve en su panel |
| Variables que da el servidor | `NODE_ENV=production`, `PORT=3000`, `DATABASE_URL=file:/data/app.db`, `PHOTOS_DIR=/data/photos` |
| Secretos de la app | archivo `.env.production` (nunca en git), cargado al arrancar. Las variables que da el servidor tienen prioridad sobre él |
| Escritura | solo `/data` (base de datos y fotos, con copia de seguridad cada noche) y `/tmp`. Todo lo demás es de solo lectura |
| Límites | 768 MB de memoria, 1 procesador |
| Control de salud | `GET /api/health` debe responder 200 en menos de 60 s tras el arranque. Si responde con error durante 10 s, la versión se rechaza |

**Ningún servicio externo.** Ni Turso, ni Cloudinary, ni Google Fonts, ni CDN,
ni herramientas de estadísticas: todo corre en el servidor. Única excepción
posible: el botón «Continuar con Google», que solo verifica la identidad de
los visitantes.

## 2. Adaptar la app (una sola vez)

- **Base de datos**: `@libsql/client` con `url: process.env.DATABASE_URL`
  (un archivo SQLite). Quitar Turso y su token.
- **Fotos** (en lugar de Cloudinary):
  - multer en memoria (`memoryStorage`), solo imágenes, **10 MB como máximo**;
  - `sharp`: 1600 px como máximo, formato WebP. Eliminar los metadatos EXIF,
    que pueden contener la ubicación GPS donde se tomó la foto;
  - guardar en `PHOTOS_DIR` con un nombre aleatorio, y servirlas con Express
    bajo `/photos/` con caché larga.
- **Tipografías**: `@fontsource-variable/inter` y
  `@fontsource-variable/bricolage-grotesque`, importadas en el código. Quitar
  los enlaces a Google Fonts.
- **Express**:
  - `app.set('trust proxy', 'loopback')`, para conocer la IP real de los
    visitantes (Cloudflare la transmite);
  - cookies de sesión `secure`, `httpOnly` y `sameSite: 'lax'`;
  - escuchar en `process.env.PORT`, sin indicar dirección
    (`app.listen(process.env.PORT)`);
  - servir `dist/` (archivos de Vite) y la API. Cualquier otra URL devuelve
    `index.html`, para React Router;
  - añadir la ruta `/api/health`.
- **«Continuar con Google»**: `GOOGLE_CLIENT_ID` en `.env.production`, y
  `https://pasalo.kazflow.com` en los «orígenes autorizados de JavaScript»
  del cliente OAuth (consola de Google Cloud).
- **`package.json`**:
  - lo que usa el servidor va en `dependencies` (express, multer, sharp,
    @libsql/client, jose…);
  - las herramientas de compilación van en `devDependencies` (vite y sus
    extensiones);
  - `"engines": { "node": ">=26" }`.
- **GitHub**: en el repositorio, Settings ▸ Advanced Security, activar las
  **Dependabot alerts** y las **Dependabot security updates**. Así GitHub
  avisa cuando una dependencia tiene una vulnerabilidad y propone la
  corrección.

### Reglas de seguridad de la app

El sitio es público y maneja cuentas reales: estas reglas no son opcionales.
Briac revisa el código antes de la apertura.

- **SQL**: siempre consultas parametrizadas
  (`db.execute({ sql: "… WHERE id = ?", args: [id] })`), nunca texto armado
  con datos recibidos.
- **Contraseñas**: `crypto.scrypt` con una sal aleatoria por cuenta,
  comparación con `crypto.timingSafeEqual`. Nunca una contraseña en un log.
- **Sesiones**: identificador aleatorio (`crypto.randomBytes(32)`) o token
  firmado con un secreto de al menos 32 bytes aleatorios, en
  `.env.production`. Con caducidad, y un cierre de sesión que invalide la
  sesión.
- **Intentos de inicio de sesión**: limitados (`express-rate-limit`), por
  ejemplo 10 cada 15 minutos por dirección IP.
- **Cada ruta de la API comprueba los permisos**: un usuario solo puede leer
  o modificar sus propios datos, aunque cambie un identificador en la URL.
- **Peticiones que modifican algo** (POST, PUT, DELETE): rechazar las que
  tengan una cabecera `Origin` distinta de `https://pasalo.kazflow.com`
  (protección contra peticiones falsificadas desde otro sitio).
- **Cabeceras de seguridad**: `helmet()`, con una política CSP que solo
  permita el propio sitio, más `accounts.google.com` para «Continuar con
  Google».
- **«Continuar con Google»**: verificar el token con `jose`
  (`createRemoteJWKSet` sobre `https://www.googleapis.com/oauth2/v3/certs`):
  emisor `https://accounts.google.com`, audiencia `GOOGLE_CLIENT_ID`, y
  `email_verified` verdadero.
- **Fotos**: comprobar el formato real con `sharp` (no la extensión ni el
  tipo declarado), recodificar en WebP, nombre aleatorio. Nunca usar el nombre
  del archivo enviado para construir una ruta.
- **React**: nunca `dangerouslySetInnerHTML` con datos introducidos por los
  visitantes.
- **Errores**: en producción, devolver un mensaje genérico, sin traza ni
  detalle técnico.
- **Dependencias**: mantener los paquetes al día (`npm outdated`,
  `npm audit`) antes de cada publicación.

## 3. Acceso al servidor (una sola vez)

Al servidor solo se llega por una red privada (VPN WireGuard). Esta VPN solo
da acceso al depósito de archivos de la app, a nada más.

### 3.1 WireGuard

La persona hace estos pasos ella misma, guiada por ti. **La clave privada
nunca debe salir de WireGuard**: no copiarla, no enviarla, no mostrártela.

1. **Instalar WireGuard.** Lo más sencillo: lanza tú
   `winget install --id WireGuard.WireGuard -e` (gestor de paquetes oficial de
   Windows). Avísale de que Windows le pedirá permiso («¿Quieres permitir que
   esta aplicación haga cambios?») y de que debe responder «Sí». Si `winget`
   no está disponible, ella descarga «WireGuard for Windows» del sitio
   oficial, https://www.wireguard.com/install/, y lo instala. Después, abre
   WireGuard desde el menú Inicio.
2. En WireGuard, abrir el menú de la flecha junto a «Añadir túnel» (*Add
   Tunnel*) y elegir **«Añadir túnel vacío…»** (*Add empty tunnel…*). El texto
   exacto puede variar según el idioma de WireGuard. WireGuard crea las claves
   por sí mismo.
3. Nombre: `vps-kazflow`. El texto ya contiene `[Interface]` y una línea
   `PrivateKey = …`: **no tocarla**. Añadir debajo:

   ```ini
   Address = 10.66.0.4/32

   [Peer]
   PublicKey = yv/Kej9O9kmHe9GYTgj0Q/Uzq9sR2g85xEAlIXoxHEM=
   Endpoint = wg.kazflow.com:51820
   AllowedIPs = 10.66.0.1/32
   PersistentKeepalive = 25
   ```

4. **Copiar la clave pública** que aparece arriba en la ventana («Clave
   pública» / *Public key*) y guardar. Esta clave no es secreta: enviársela a
   Briac, por ejemplo por WhatsApp, junto con la clave SSH pública (3.2).
   Briac la añade al servidor.
5. Cuando Briac lo confirme, hacer clic en **«Activar»** (*Activate*) y
   dejarlo activado siempre:
   - solo transporta el tráfico hacia el servidor (10.66.0.1), el resto de
     Internet no pasa por él;
   - se vuelve a conectar solo al iniciar Windows;
   - funciona igual en casa que de viaje.
6. Comprobación: en WireGuard, «Último saludo» (*Latest handshake*) debe
   indicar unos segundos o minutos.

**Solución de problemas**

| Síntoma | Causa probable y solución |
|---|---|
| Ningún saludo | Briac todavía no ha añadido la clave pública |
| Ningún saludo estando de viaje | El Wi-Fi (hotel, empresa) bloquea el puerto UDP 51820: usar los datos del teléfono (punto de acceso) |

La VPN solo lleva a SSH. El resto del servidor está cerrado a propósito: no
intentar acceder.

### 3.2 Clave SSH

Los comandos de este documento están escritos para Git Bash.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/pasalo_ed25519 -N "" -C pasalo
cat ~/.ssh/pasalo_ed25519.pub      # clave pública: enviársela a Briac
```

No tiene frase de contraseña: con esta cuenta solo se puede depositar la app,
y la clave se queda en este PC. Enviar **únicamente** el archivo `.pub`.

Añadir a `~/.ssh/config`:

```
Host pasalo
    HostName 10.66.0.1
    User pasalo
    IdentityFile ~/.ssh/pasalo_ed25519
    IdentitiesOnly yes
```

Luego añadir la identidad del servidor a `~/.ssh/known_hosts`. Esta línea evita
la pregunta «Are you sure you want to continue connecting?»:

```bash
echo '10.66.0.1 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHC+exfP73FJ90zzG/AB/EAfUTfAmNiRxVk0HyWAQ7zS' >> ~/.ssh/known_hosts
```

Si algún día SSH muestra otra identidad para este servidor, **no aceptarla**
y avisar a Briac.

Prueba, cuando Briac haya confirmado que añadió las claves:

```bash
echo ls | sftp -b - pasalo      # debe mostrar: depot  logs
```

Esta cuenta no tiene terminal: solo SFTP y `scp`, en dos carpetas.

| Carpeta | Acceso | Contenido |
|---|---|---|
| `/depot` | escritura | los archivos comprimidos que se van a publicar |
| `/logs` | lectura | `publication.log` (resultado de las publicaciones), `app.log` (salida de la app), `audit.log` (auditoría diaria de las dependencias) |

## 4. Publicar una versión

1. **Commit y push** a GitHub: el repositorio es la copia de seguridad del
   código.
2. **Compilar** la interfaz: `npm run build` (crea `dist/`).
3. **Crear el archivo comprimido**. En su raíz: `package.json`,
   `package-lock.json`, `.env.production`, `dist/` y la carpeta del servidor
   Express. Ejemplo, adaptar a las carpetas reales:

   ```bash
   tar -czf pasalo.tar.gz package.json package-lock.json .env.production dist server
   ```

   No debe contener `node_modules`, ni `.git`, ni la base de datos ni las fotos
   locales.
4. **Enviar el archivo**. Se envía con un nombre provisional y luego se
   renombra: así el servidor nunca toma un archivo enviado a medias.

   ```bash
   sftp -b - pasalo <<'EOF'
   put pasalo.tar.gz /depot/pasalo.tar.gz.part
   rename /depot/pasalo.tar.gz.part /depot/pasalo.tar.gz
   EOF
   ```

5. **Leer el resultado** uno o dos minutos después:

   ```bash
   scp pasalo:/logs/publication.log . && tail -20 publication.log
   ```

**Lo que hace el servidor con cada archivo:**
- lo verifica: sin enlaces, sin `node_modules`, sin `.git`, 200 MB como
  máximo;
- lo extrae en una carpeta nueva;
- instala las dependencias, reutilizándolas si `package-lock.json` no ha
  cambiado;
- hace la auditoría (`npm audit`);
- reemplaza la versión anterior y comprueba `/api/health`.

Si algo falla, **vuelve a poner automáticamente la versión anterior** y anota
el error en `publication.log`. Un archivo rechazado antes del reemplazo no
toca la versión en línea. Si la app da errores, `scp pasalo:/logs/app.log .`
muestra su salida.

**Si la publicación se rechaza por vulnerabilidades**: `publication.log` indica
cada paquete, la gravedad, el enlace del aviso y si existe corrección.
Actualizar esos paquetes (`npm audit fix`, o `npm install paquete@versión`),
comprobar que la app funciona en local, hacer commit y volver a publicar.

## 5. Reglas

- Nunca mostrar, copiar ni enviar una clave privada (WireGuard o SSH), ni el
  contenido de `.env.production`.
- No hacer commit de `.env.production`, de la base de datos local ni de las
  fotos: revisar `.gitignore`.
- No intentar acceder a nada del servidor que no sea `pasalo` por SFTP.
- Ningún servicio externo sin el acuerdo de Briac.
- Antes de abrir el sitio al público, **pedirle a Briac una revisión de
  seguridad**. La app maneja cuentas, contraseñas y fotos de personas reales.
- Si hace falta otra cosa (versión de Node, base de datos, memoria, nombre de
  dominio…): pedírselo a Briac.
