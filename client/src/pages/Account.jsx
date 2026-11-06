import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { LogOut, Trash2 } from 'lucide-react';
import { api, setToken } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatPhone } from '../format.js';

export default function Account() {
  const { user, setUser, meta, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user.name, city: user.city, phone: formatPhone(user.phone) });
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus({ type: '', text: '' });
    try {
      const d = await api('/me', { method: 'PATCH', body: form });
      setUser(d.user);
      setForm({ ...form, phone: formatPhone(d.user.phone) });
      setStatus({ type: 'ok', text: 'Cambios guardados.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  // Borrar la cuenta: dos pasos para evitar toques accidentales
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteAccount = async () => {
    setDeleting(true);
    setStatus({ type: '', text: '' });
    try {
      await api('/me', { method: 'DELETE' });
      setToken(null);
      setUser(null);
      navigate('/');
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
      setDeleting(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Mi cuenta</h1>
      <p className="muted">{user.email}</p>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Nombre y apellido</span>
          <input value={form.name} onChange={set('name')} required minLength={2} maxLength={60} />
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
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="0981 123 456" />
        </label>
        {status.text && <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-ok'}`}>{status.text}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>
      <button className="btn btn-soft btn-block" onClick={signOut}>
        <LogOut size={16} /> Cerrar sesión
      </button>

      <div className="danger-zone">
        {confirmDelete ? (
          <>
            <p className="small">
              Se borran tus publicaciones, fotos, favoritos y mensajes. <strong>No se puede deshacer.</strong>
            </p>
            <div className="report-actions">
              <button className="btn btn-soft" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</button>
              <button className="btn btn-danger" onClick={deleteAccount} disabled={deleting}>
                {deleting ? 'Borrando…' : 'Sí, borrar mi cuenta'}
              </button>
            </div>
          </>
        ) : (
          <button className="btn btn-link report-link" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Eliminar mi cuenta
          </button>
        )}
      </div>

      <p className="center muted small">
        <Link to="/terminos">Términos</Link> · <Link to="/privacidad">Privacidad</Link>
      </p>
    </div>
  );
}
