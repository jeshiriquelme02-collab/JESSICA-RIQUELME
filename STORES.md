# 📱 PasalO en Google Play y App Store

La app de celular es la misma web empaquetada con **Capacitor**. Todo el código vive en `client/`; las carpetas `client/android/` y `client/ios/` son los proyectos nativos que se suben a las tiendas.

Identificador de la app: `py.com.pasalo.app`. Nombre: **PasalO**.

## Lo que ya está hecho en el código

Las tiendas revisan estas cosas y la app ya las cumple:

| Requisito | Dónde está |
| --- | --- |
| Borrar la cuenta desde la app (obligatorio en ambas tiendas) | Mi cuenta → "Eliminar mi cuenta". Borra perfil, fotos, publicaciones, favoritos y mensajes. |
| Denunciar contenido de otros usuarios (Apple 1.2, Google UGC) | Botón "Denunciar publicación" en cada artículo. Las denuncias quedan en la tabla `reports`. |
| Política de privacidad y términos accesibles | `/privacidad` y `/terminos`, enlazados en el pie y en Mi cuenta. |
| Explicación de permisos (cámara, fotos) | `ios/App/App/Info.plist` y `AndroidManifest.xml`. La app no pide ubicación ni contactos. |
| Íconos y pantallas de carga en todos los tamaños | `npm run icons` los regenera desde `client/resources/`. |
| Tráfico solo por HTTPS | Capacitor usa `https://localhost`; la API tiene que estar en HTTPS. |
| Sin pagos dentro de la app | La gente paga en mano, así que no aplica la comisión de las tiendas. |

> Los textos legales son un borrador. Antes de publicar, que los revise un abogado y poné un correo real en `client/src/pages/Legal.jsx`.

## Servidor

La app le pide todo al sitio publicado, `https://jessica-riquelme.vercel.app` (constante `PRODUCTION_URL` en `client/src/api.js`). Si algún día cambia el dominio (por ejemplo a `https://pasalo.com.py`), cambiá esa constante o compilá con `VITE_API_URL` y `VITE_PUBLIC_URL` en `client/.env.production`, y publicá una versión nueva de la app.

Los pasos concretos para compilar en una Mac están en [MAC.md](MAC.md).

## Compilar

```bash
cd client
npm run icons        # solo si cambiaste el logo
npm run app:sync     # construye la web y la copia a android/ e ios/
```

### Android (desde Windows)

1. Instalá [Android Studio](https://developer.android.com/studio) (trae el JDK y el SDK).
2. `npm run app:android` abre el proyecto. Dejá que Gradle sincronice la primera vez (tarda unos minutos).
3. Para probar: conectá un celular con "Depuración USB" o usá un emulador, y tocá ▶.
4. Para la tienda: **Build → Generate Signed Bundle / APK → Android App Bundle**. Creá una clave de firma (keystore) y **guardala con la contraseña en un lugar seguro: si la perdés, no podés actualizar la app nunca más**.
5. Antes de cada versión nueva, subí `versionCode` y `versionName` en `android/app/build.gradle`.

### iPhone (hace falta una Mac)

1. En una Mac con Xcode: `npm run app:ios` abre el proyecto.
2. En Xcode → Signing & Capabilities, elegí tu equipo de Apple Developer.
3. Product → Archive → Distribute App → App Store Connect.
4. Sin Mac: servicios como Codemagic o Ionic Appflow compilan y suben por vos desde la nube (tienen plan gratuito limitado).

## Cuentas y costos

| | Google Play | App Store |
| --- | --- | --- |
| Cuenta | [Play Console](https://play.google.com/console), **USD 25 una sola vez** | [Apple Developer](https://developer.apple.com/programs/), **USD 99 por año** |
| Verificación | Identidad (documento) y, para cuentas de empresa, número D-U-N-S | Identidad; para empresa, D-U-N-S |
| Revisión | 1 a 3 días habitualmente | 1 a 7 días; suelen pedir cambios la primera vez |
| Prueba previa | Hasta 12 probadores durante 14 días son obligatorios en cuentas personales nuevas | TestFlight (opcional) |

## Lo que te van a pedir al cargar la app

Tenelo listo antes de empezar, se tarda más en esto que en compilar:

- **Nombre**: PasalO. **Descripción corta** (80 caracteres): "Lo que ya no usás, hacelo plata. Comprá y vendé usado en Paraguay, sin comisión."
- **Descripción larga**: qué es, cómo funciona (fotos, precio, cobrás en mano), sin comisión, acepta cambio, 100 fundadores.
- **Capturas de pantalla**: mínimo 2 por tipo de dispositivo. Android: teléfono (y tablet si querés). Apple: iPhone 6.7" y 6.5" (y iPad si lo habilitás). Sacalas del celular real o del emulador.
- **Ícono**: 512×512 (Google) y 1024×1024 (Apple). Ya están en `client/resources/icon-only.png`.
- **Gráfico destacado** (solo Google): 1024×500. Hacelo con la frutilla y el eslogan.
- **Categoría**: Compras. **Clasificación de edad**: completar el cuestionario; sale "Todos" / 4+ (hay contenido generado por usuarios, hay que declararlo).
- **Política de privacidad**: la URL pública, `https://pasalo.com.py/privacidad`.
- **Correo de soporte** y, en Apple, un teléfono de contacto.
- **Formulario de datos** (Google "Seguridad de los datos", Apple "Privacidad de la app"): declarar que se recogen nombre, email, teléfono (opcional), fotos y mensajes; que se usan para el funcionamiento de la app; que no se comparten con terceros ni se usan para publicidad; que el usuario puede pedir su borrado.
- **Cuenta de prueba** para los revisores: creá una cuenta demo con publicaciones y poné el email y la contraseña en las notas de revisión.
- **Contenido generado por usuarios**: ambas tiendas preguntan si hay moderación. Respuesta: sí, botón de denuncia, términos que prohíben contenido ilegal y bloqueo de cuentas.

## Después de publicar

- Cada cambio en la web que quieras en la app: `npm run app:sync`, subir versión y volver a enviar.
- Las actualizaciones de la web (servidor) no necesitan reenviar la app, salvo que cambie el frontend.
- Guardá el keystore de Android y la cuenta Apple en un lugar seguro, con las contraseñas.
