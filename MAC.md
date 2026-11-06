# 🍎 Compilar la app de PasalO en la Mac (iPhone y Android)

La app es la web de `client/` empaquetada con **Capacitor 8**. Los proyectos nativos ya están en el repositorio:

| Plataforma | Carpeta | Identificador |
| --- | --- | --- |
| iOS | `client/ios/App/App.xcodeproj` (Swift Package Manager, sin CocoaPods) | `py.com.pasalo.app` |
| Android | `client/android/` (Gradle) | `py.com.pasalo.app` |

La app no tiene servidor propio: dentro del celular le pide todo a **https://jessica-riquelme.vercel.app** (ver `PRODUCTION_URL` en `client/src/api.js`). No hace falta ningún `.env` para compilar.

## 1. Preparar la Mac (una sola vez)

1. **Xcode**: desde la App Store (gratis). Abrilo una vez y aceptá la licencia; instala los componentes que pida.
2. **Node.js 22 LTS o más nuevo**: <https://nodejs.org> (instalador .pkg).
3. **Git**: viene con las herramientas de Xcode. Si `git --version` pide instalar, aceptá.
4. **Android Studio** (solo para Android): <https://developer.android.com/studio>. La primera vez instala el SDK solo.

## 2. Bajar el proyecto y compilar la web

```bash
git clone https://github.com/jeshiriquelme02-collab/JESSICA-RIQUELME.git pasalo
```

```bash
cd pasalo/client && npm ci
```

```bash
npm run app:sync
```

`app:sync` hace `vite build` y copia `dist/` a los dos proyectos nativos (`cap sync`). Repetirlo cada vez que cambie el código de `client/`.

## 3. iPhone

```bash
npm run app:ios
```

Abre Xcode con el proyecto. Después:

1. Arriba, elegí un simulador (por ejemplo *iPhone 16*) y tocá ▶. Tiene que abrir PasalO con la frutilla.
2. **En tu propio iPhone, gratis**: Xcode → *Settings → Accounts* → agregá tu Apple ID. En el proyecto *App* → *Signing & Capabilities* → *Team*: tu nombre (*Personal Team*). Conectá el iPhone por cable, elegilo arriba y ▶. En el iPhone: *Ajustes → General → VPN y gestión de dispositivos* → confiar en el desarrollador. Con cuenta gratuita la instalación dura 7 días.
3. **Manifiesto de privacidad** (lo exige la App Store): *File → New → File from Template… → App Privacy*, guardalo dentro de `App/` con el target *App* marcado. Declarar como datos recogidos: nombre, email, teléfono (opcional), fotos y contenido del usuario; usados para la funcionalidad de la app; **sin tracking**.
4. **Para publicar en la App Store** hace falta **Apple Developer Program (USD 99/año)**. Con esa cuenta: *Team* = la cuenta paga → subir `CFBundleShortVersionString`/`CURRENT_PROJECT_VERSION` si corresponde → *Product → Archive* → *Distribute App → App Store Connect*. Lo que piden en App Store Connect está en [STORES.md](STORES.md).

## 4. Android

```bash
npm run app:android
```

Abre Android Studio. Dejá que Gradle sincronice la primera vez (unos minutos). Después:

1. *Device Manager* → crear un emulador (por ejemplo *Pixel 8*), o conectar un Android con **Depuración USB** activada, y tocá ▶ *Run*.
2. **APK para compartir directo** (sin Google Play): *Build → Generate Signed App Bundle / APK → APK* → crear un **keystore** nuevo. **Guardá el archivo `.jks` y las contraseñas en un lugar seguro: sin ellos no se puede actualizar nunca la app.** El APK queda en `client/android/app/release/`.
3. **Google Play** (USD 25, una vez): el mismo asistente pero eligiendo **Android App Bundle (.aab)**, con el mismo keystore. Las cuentas personales nuevas deben hacer una prueba cerrada con 12 testers durante 14 días antes de publicar.

## 5. Qué probar en el celular

- [ ] Abre la portada con artículos (conexión con `jessica-riquelme.vercel.app`).
- [ ] Registrarse con correo y contraseña, cerrar la app y volver a abrirla: la sesión sigue.
- [ ] Publicar un artículo **sacando una foto con la cámara** y otro **eligiendo de la galería**.
- [ ] Botón **WhatsApp** de un artículo y menú **Compartir**: tienen que abrir WhatsApp o el navegador, no quedarse dentro de la app.
- [ ] Chat entre dos cuentas, favoritos, "acepto cambio".
- [ ] Mi cuenta → **Eliminar mi cuenta** funciona (lo revisan Apple y Google).
- [ ] Denunciar una publicación.

## Pendiente conocido

- **Ingreso con Google dentro de la app**: hoy está oculto en la versión nativa (`IS_NATIVE_APP` en `GoogleButton.jsx`), porque Google no permite su botón web dentro de un WebView. Para activarlo hace falta un plugin nativo (por ejemplo `@capgo/capacitor-social-login`) y crear en Google Cloud dos clientes OAuth más: **iOS** (bundle `py.com.pasalo.app`) y **Android** (paquete `py.com.pasalo.app` + SHA-1 del keystore). Mientras tanto, en la app se entra con correo y contraseña; las cuentas creadas con Google en la web pueden entrar desde la web.
- Regenerar íconos si cambia el logo: `npm run icons` (en `client/`).
