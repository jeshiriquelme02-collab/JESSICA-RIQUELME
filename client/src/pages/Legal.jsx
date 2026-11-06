// Textos legales. Son un borrador razonable para arrancar: conviene que los
// revise un abogado antes de publicar en las tiendas.
const CONTACT = 'hola@pasalo.com.py';
const UPDATED = '6 de noviembre de 2026';

export function Terms() {
  return (
    <article className="legal">
      <h1>Términos y condiciones</h1>
      <p className="muted">Última actualización: {UPDATED}</p>

      <h2>1. Qué es PasalO</h2>
      <p>
        PasalO es una plataforma para que personas de Paraguay publiquen artículos usados y se contacten con otras personas
        interesadas en comprarlos o cambiarlos. PasalO <strong>no vende, no compra, no cobra comisión ni interviene en el pago ni
        en la entrega</strong>: cada operación se acuerda directamente entre comprador y vendedor.
      </p>

      <h2>2. Tu cuenta</h2>
      <p>
        Tenés que ser mayor de 18 años, usar datos verdaderos y cuidar tu contraseña. Sos responsable de lo que se hace con tu
        cuenta. Podés eliminarla cuando quieras desde "Mi cuenta"; al hacerlo se borran tus publicaciones, fotos, favoritos y
        mensajes.
      </p>

      <h2>3. Lo que publicás</h2>
      <p>
        Solo podés publicar artículos que sean tuyos y que se puedan vender legalmente. No se permiten: productos falsificados o
        robados, armas, medicamentos, animales, contenido sexual, ni nada que infrinja la ley paraguaya o derechos de terceros.
        Las fotos y descripciones tienen que corresponder al artículo real.
      </p>
      <p>
        Al publicar, nos das permiso para mostrar tus fotos y textos dentro de PasalO y en las vistas previas que se generan al
        compartir un enlace. Seguís siendo el dueño de tu contenido.
      </p>

      <h2>4. Conducta</h2>
      <p>
        Tratá a los demás con respeto. No se permite acoso, discriminación, spam, estafas ni intentos de engañar a otras
        personas. Cualquier usuario puede denunciar una publicación; podemos retirar contenido o suspender cuentas que
        incumplan estas reglas, sin aviso previo.
      </p>

      <h2>5. Seguridad en las operaciones</h2>
      <p>
        Recomendamos encontrarse en lugares públicos, revisar el artículo antes de pagar y no enviar dinero por adelantado a
        desconocidos. PasalO no garantiza el estado de los artículos ni el cumplimiento de los acuerdos entre usuarios, y no es
        responsable por pérdidas derivadas de esas operaciones.
      </p>

      <h2>6. Cambios y contacto</h2>
      <p>
        Podemos actualizar estos términos; si el cambio es importante, lo avisaremos dentro de la plataforma. Para consultas
        escribinos a <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </article>
  );
}

export function Privacy() {
  return (
    <article className="legal">
      <h1>Política de privacidad</h1>
      <p className="muted">Última actualización: {UPDATED}</p>

      <h2>Qué datos guardamos</h2>
      <ul>
        <li><strong>Cuenta:</strong> nombre, email, ciudad, contraseña (cifrada, nunca en texto plano) y, si lo cargás, tu número de celular.</li>
        <li><strong>Publicaciones:</strong> fotos, títulos, descripciones, precios y estado de tus artículos.</li>
        <li><strong>Actividad:</strong> favoritos, mensajes con otros usuarios y denuncias.</li>
        <li><strong>Técnicos:</strong> datos mínimos para que el servicio funcione, como la sesión iniciada.</li>
      </ul>

      <h2>Para qué los usamos</h2>
      <p>
        Para que puedas publicar, buscar, guardar favoritos y hablar con otros usuarios; para mostrar tu nombre, ciudad y
        publicaciones en tu perfil público; para que, si cargaste tu celular, los interesados puedan escribirte por WhatsApp; y
        para atender denuncias y mantener la plataforma segura.
      </p>
      <p>
        <strong>No vendemos tus datos ni los usamos para publicidad de terceros.</strong>
      </p>

      <h2>Qué es público</h2>
      <p>
        Tu nombre, tu ciudad, tu fecha de ingreso y tus publicaciones son visibles para cualquiera. Tu email nunca se muestra.
        Tu celular solo se usa para el botón de WhatsApp en tus publicaciones, y únicamente si decidiste cargarlo.
      </p>

      <h2>Permisos de la app</h2>
      <p>
        La app de celular pide acceso a la cámara o a las fotos solo cuando elegís subir imágenes a una publicación. No
        accedemos a tus contactos ni a tu ubicación.
      </p>

      <h2>Cuánto tiempo y cómo borrarlos</h2>
      <p>
        Guardamos tus datos mientras tengas la cuenta. Podés eliminarla en cualquier momento desde "Mi cuenta": se borran tu
        perfil, publicaciones, fotos, favoritos y mensajes de forma definitiva. También podés pedirlo escribiendo a{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés acceder, corregir o eliminar tus datos personales. Para ejercer estos derechos, usá las opciones de tu cuenta o
        escribinos al correo de contacto. Respondemos en un plazo razonable.
      </p>

      <h2>Seguridad</h2>
      <p>
        Las contraseñas se guardan cifradas y las comunicaciones viajan por HTTPS. Ningún sistema es infalible; si detectamos
        un incidente que afecte tus datos, te lo vamos a informar.
      </p>

      <h2>Contacto</h2>
      <p>
        Responsable: PasalO, Paraguay. Correo: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </article>
  );
}
