import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Repeat, Star, X } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatNumber } from '../format.js';
import { compressImage } from '../images.js';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
// Las fotos se achican antes de subir, así que se aceptan originales grandes del celular
const RAW_MAX_MB = 25;

export default function Sell() {
  const { user, meta } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [photos, setPhotos] = useState([]); // { file, url }
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    size: '',
    brand: '',
    city: user.city,
    swap: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const maxPhotos = meta?.maxPhotos ?? 5;

  // Liberar las vistas previas al salir de la página
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const addPhotos = (fileList) => {
    setError('');
    const incoming = [...fileList];
    const valid = incoming.filter((f) => ACCEPTED.includes(f.type) && f.size <= RAW_MAX_MB * 1024 * 1024);
    if (valid.length < incoming.length) setError(`Algunas fotos no se agregaron: solo JPG, PNG o WEBP de hasta ${RAW_MAX_MB} MB.`);
    const room = maxPhotos - photos.length;
    if (valid.length > room) setError(`Podés subir hasta ${maxPhotos} fotos.`);
    setPhotos([...photos, ...valid.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const removePhoto = (i) => {
    URL.revokeObjectURL(photos[i].url);
    setPhotos(photos.filter((_, j) => j !== i));
  };

  const makeCover = (i) => {
    const next = [...photos];
    const [p] = next.splice(i, 1);
    setPhotos([p, ...next]);
  };

  const onPrice = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, price: digits });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (photos.length === 0) return setError('Agregá al menos una foto.');
    setSaving(true);
    try {
      const data = new FormData();
      for (const p of photos) data.append('photos', await compressImage(p.file));
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      const d = await api('/items', { method: 'POST', form: data });
      navigate(`/articulo/${d.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="narrow">
      <h1 className="page-title">Hacelo plata</h1>
      <p className="muted">Unas fotos, un precio y listo. Sin comisión: lo que pidas es tuyo.</p>

      <form className="form" onSubmit={submit}>
        <section className="form-section">
          <h3>Fotos <span className="muted small">({photos.length}/{maxPhotos})</span></h3>
          <div
            className="photo-grid"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addPhotos(e.dataTransfer.files);
            }}
          >
            {photos.map((p, i) => (
              <div key={p.url} className="photo">
                <img src={p.url} alt={`Foto ${i + 1}`} />
                {i === 0 ? (
                  <span className="photo-cover"><Star size={12} fill="currentColor" /> Portada</span>
                ) : (
                  <button type="button" className="photo-btn photo-make-cover" onClick={() => makeCover(i)}>Usar de portada</button>
                )}
                <button type="button" className="photo-btn photo-remove" onClick={() => removePhoto(i)} aria-label="Quitar foto"><X size={14} strokeWidth={2.5} /></button>
              </div>
            ))}
            {photos.length < maxPhotos && (
              <button type="button" className="photo-add" onClick={() => fileInput.current.click()}>
                <span className="photo-add-icon"><ImagePlus size={24} /></span>
                <span>Agregar fotos</span>
                <small>o arrastralas acá</small>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED.join(',')}
            multiple
            hidden
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = '';
            }}
          />
        </section>

        <section className="form-section">
          <label className="field">
            <span>Título</span>
            <input value={form.title} onChange={set('title')} placeholder="Ej.: Zapatillas Nike talle 42" required minLength={3} maxLength={80} />
          </label>
          <label className="field">
            <span>Descripción</span>
            <textarea value={form.description} onChange={set('description')} rows={4} maxLength={2000} placeholder="Contá el estado, las medidas, si tiene algún detalle y cómo lo entregás. Cuanto más claro, más rápido se vende." />
          </label>
        </section>

        <section className="form-section">
          <div className="row">
            <label className="field">
              <span>Categoría</span>
              <select value={form.category} onChange={set('category')} required>
                <option value="" disabled>Elegí una</option>
                {meta?.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Estado</span>
              <select value={form.condition} onChange={set('condition')} required>
                <option value="" disabled>Elegí uno</option>
                {meta?.conditions.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="row">
            <label className="field">
              <span>Marca <em className="muted">(opcional)</em></span>
              <input value={form.brand} onChange={set('brand')} maxLength={40} placeholder="Ej.: Adidas" />
            </label>
            <label className="field">
              <span>Talle <em className="muted">(opcional)</em></span>
              <input value={form.size} onChange={set('size')} maxLength={20} placeholder="Ej.: M, 38, 6 años" />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="row">
            <label className="field">
              <span>Precio</span>
              <div className="input-prefix">
                <span>Gs.</span>
                <input inputMode="numeric" value={form.price ? formatNumber(Number(form.price)) : ''} onChange={onPrice} placeholder="150.000" required />
              </div>
              <small className="muted">Mirá cuánto piden por cosas parecidas y poné un poco menos: se vende más rápido.</small>
            </label>
            <label className="field">
              <span>Ciudad</span>
              <select value={form.city} onChange={set('city')} required>
                {meta?.cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={form.swap} onChange={(e) => setForm({ ...form, swap: e.target.checked })} />
            <span className="check-icon"><Repeat size={18} /></span>
            <span>
              <strong>Acepto cambio</strong>
              <small className="muted">Además de venderlo, escucho propuestas de trueque por otro artículo.</small>
            </span>
          </label>
        </section>

        {error && <div className="alert alert-error">{error}</div>}

        <button className="btn btn-primary btn-lg btn-block" disabled={saving}>
          {saving ? 'Publicando…' : 'Publicar gratis'}
        </button>
      </form>
    </div>
  );
}
