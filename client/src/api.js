const TOKEN_KEY = 'pasalo_token';

// Dirección del sitio publicado. La app de celular (Capacitor) no tiene servidor propio:
// le pide todo a este. Se puede cambiar al compilar con VITE_API_URL / VITE_PUBLIC_URL.
const PRODUCTION_URL = 'https://jessica-riquelme.vercel.app';
export const IS_NATIVE_APP = typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());

// En la web la API vive en el mismo dominio (''); en la app, en el sitio publicado.
export const API_BASE = (import.meta.env.VITE_API_URL || (IS_NATIVE_APP ? PRODUCTION_URL : '')).replace(/\/$/, '');
// Dirección que se usa en los enlaces para compartir
export const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL || API_BASE || window.location.origin).replace(/\/$/, '');

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { method, headers, body: payload });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 413) throw new Error('Las fotos pesan demasiado. Probá con menos fotos o más chicas.');
  if (!res.ok) {
    const err = new Error(data?.error || 'Ocurrió un error, intentá de nuevo');
    err.status = res.status;
    throw err;
  }
  return data;
}
