import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { safeNext } from './Login.jsx';
import { Award } from 'lucide-react';
import GoogleButton from '../components/GoogleButton.jsx';
import Logo from '../components/Logo.jsx';

export default function Register() {
  const { user, register, meta } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', city: 'Asunción', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(params);

  if (user) return <Navigate to={next} replace />;

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <Logo size={44} />
      <h1>Crear cuenta</h1>
      <p className="muted">Gratis y sin comisión. En un minuto ya podés publicar.</p>
      {meta?.foundersLeft > 0 && (
        <div className="founder-promo">
          <Award size={22} />
          <div>
            <strong>Quedan {meta.foundersLeft} insignias de Fundador/a</strong>
            <span>Las primeras {meta.founders} cuentas la llevan en su perfil para siempre.</span>
          </div>
        </div>
      )}
      <GoogleButton text="signup_with" onDone={() => navigate(next, { replace: true })} />
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Nombre y apellido</span>
          <input value={form.name} onChange={set('name')} autoComplete="name" required minLength={2} maxLength={60} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required minLength={8} />
          <small className="muted">Mínimo 8 caracteres.</small>
        </label>
        <label className="field">
          <span>Ciudad</span>
          <select value={form.city} onChange={set('city')}>
            {meta?.cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Celular / WhatsApp <em className="muted">(opcional)</em></span>
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="0981 123 456" autoComplete="tel" />
          <small className="muted">Si lo cargás, los compradores podrán escribirte por WhatsApp.</small>
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>
      <p className="center muted">
        ¿Ya tenés cuenta? <Link to={`/entrar?next=${encodeURIComponent(next)}`}>Ingresá</Link>
      </p>
    </div>
  );
}
