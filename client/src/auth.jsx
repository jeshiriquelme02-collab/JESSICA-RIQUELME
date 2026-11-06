import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, getToken, IS_NATIVE_APP, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api('/meta').then(setMeta).catch(() => {});
    // En la app sin token no hay sesión; en la web la cookie la decide el servidor
    if (IS_NATIVE_APP && !getToken()) {
      setReady(true);
      return;
    }
    api('/auth/me')
      .then((d) => {
        setUser(d.user);
        if (!d.user) setToken(null);
      })
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const refreshUnread = useCallback(() => {
    api('/me/unread')
      .then((d) => setUnread(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    refreshUnread();
    const timer = setInterval(refreshUnread, 15000);
    return () => clearInterval(timer);
  }, [user, refreshUnread]);

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  };

  // Recibe la credencial que da el botón de Google; devuelve { user, created }
  const loginWithGoogle = async (credential) => {
    const d = await api('/auth/google', { method: 'POST', body: { credential } });
    setToken(d.token);
    setUser(d.user);
    return d;
  };

  const register = async (fields) => {
    const d = await api('/auth/register', { method: 'POST', body: fields });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* la sesión puede haber expirado */
    }
    setToken(null);
    setUser(null);
    // Que Google no la vuelva a hacer entrar sola apenas abra "Ingresar"
    window.google?.accounts?.id?.disableAutoSelect?.();
  };

  return (
    <AuthContext.Provider value={{ user, setUser, ready, meta, login, loginWithGoogle, register, logout, unread, refreshUnread }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="loading">Cargando…</div>;
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}
