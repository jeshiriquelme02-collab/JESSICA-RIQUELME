import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Logo from '../components/Logo.jsx';

export function safeNext(params) {
  const next = params.get('next') ?? '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function Login() {
  const { user, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(params);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <Logo size={44} />
      <h1>Ingresar</h1>
      <p className="muted">¡Qué bueno verte de nuevo! ¿Algo nuevo para vender?</p>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
      <p className="center muted">
        ¿No tenés cuenta? <Link to={`/registro?next=${encodeURIComponent(next)}`}>Registrate gratis</Link>
      </p>
    </div>
  );
}
