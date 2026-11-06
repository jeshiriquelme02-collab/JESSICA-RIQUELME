const TOKEN_KEY = 'pasalo_token';

// En la web, la API vive en el mismo dominio (''). En la app de celular se
// configura VITE_API_URL con la dirección pública del servidor.
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL ?? API_BASE ?? '').replace(/\/$/, '') || window.location.origin;

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
  if (!res.ok) {
    const err = new Error(data?.error || 'Ocurrió un error, intentá de nuevo');
    err.status = res.status;
    throw err;
  }
  return data;
}
