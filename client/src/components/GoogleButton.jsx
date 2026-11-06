import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';

// Botón "Continuar con Google" (Google Identity Services). Solo aparece si el servidor
// tiene configurado GOOGLE_CLIENT_ID. En la app nativa no se muestra: Google no
// permite este ingreso dentro de un WebView.
let scriptPromise = null;
function loadGoogleScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('No se pudo cargar el ingreso con Google. Revisá tu conexión.'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

const isNativeApp = () => Boolean(window.Capacitor?.isNativePlatform?.());

export default function GoogleButton({ onDone, text = 'continue_with' }) {
  const { meta, loginWithGoogle } = useAuth();
  const box = useRef(null);
  const [error, setError] = useState('');
  const clientId = meta?.googleClientId;
  const enabled = Boolean(clientId) && !isNativeApp();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !box.current) return;
        const { id } = window.google.accounts;
        id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            setError('');
            try {
              onDone?.(await loginWithGoogle(credential));
            } catch (err) {
              setError(err.message);
            }
          },
          // Si ya entró antes con Google en este dispositivo, entra directo
          auto_select: true,
          context: 'signin',
          ux_mode: 'popup',
          use_fedcm_for_prompt: true,
        });
        id.renderButton(box.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          logo_alignment: 'center',
          locale: 'es',
          width: Math.min(400, box.current.offsetWidth || 320),
        });
        id.prompt();
      })
      .catch((err) => setError(err.message));
    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel?.();
    };
  }, [enabled, clientId]);

  if (!enabled) return null;

  return (
    <div className="google-auth">
      <div ref={box} className="google-btn" />
      {error && <div className="alert alert-error">{error}</div>}
      <div className="divider"><span>o con tu correo</span></div>
    </div>
  );
}
