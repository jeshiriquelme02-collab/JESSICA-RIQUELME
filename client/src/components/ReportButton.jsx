import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const REASONS = [
  ['estafa', 'Parece una estafa'],
  ['prohibido', 'Artículo prohibido o falsificado'],
  ['ofensivo', 'Contenido ofensivo'],
  ['spam', 'Spam o publicidad'],
  ['otro', 'Otro motivo'],
];

// Denunciar una publicación: las tiendas exigen que cualquier usuario pueda hacerlo
export default function ReportButton({ itemId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('estafa');
  const [detail, setDetail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (done) return <p className="muted small center">Gracias por avisar. Vamos a revisar esta publicación.</p>;

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-link report-link"
        onClick={() => (user ? setOpen(true) : navigate(`/entrar?next=/articulo/${itemId}`))}
      >
        <Flag size={14} /> Denunciar publicación
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/items/${itemId}/report`, { method: 'POST', body: { reason, detail } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="report-form" onSubmit={submit}>
      <label className="field">
        <span>¿Qué pasa con esta publicación?</span>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Contanos más <em className="muted">(opcional)</em></span>
        <textarea rows={2} maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)} />
      </label>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="report-actions">
        <button type="button" className="btn btn-soft" onClick={() => setOpen(false)}>Cancelar</button>
        <button className="btn btn-danger">Enviar denuncia</button>
      </div>
    </form>
  );
}
