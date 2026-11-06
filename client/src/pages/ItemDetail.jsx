import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CalendarDays, ChevronRight, MapPin, Megaphone, MessageCircle, PackageX, Repeat, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatGs, labelOf, memberSince, timeAgo } from '../format.js';
import Avatar from '../components/Avatar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import FounderBadge from '../components/FounderBadge.jsx';
import ReportButton from '../components/ReportButton.jsx';
import ShareButton from '../components/ShareButton.jsx';
import WhatsAppIcon from '../components/WhatsAppIcon.jsx';

export default function ItemDetail() {
  const { id } = useParams();
  const { user, meta } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(0);
  const [message, setMessage] = useState('¡Hola! ¿Sigue disponible?');
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setItem(null);
    setError('');
    setPhoto(0);
    api(`/items/${id}`).then(setItem).catch((e) => setError(e.message));
  }, [id, user?.id]);

  if (error) {
    return (
      <EmptyState icon={PackageX} title={error}>
        <Link to="/" className="btn btn-primary">Volver al inicio</Link>
      </EmptyState>
    );
  }
  if (!item) return <div className="loading">Cargando…</div>;

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!user) return navigate(`/entrar?next=/articulo/${id}`);
    setSending(true);
    setActionError('');
    try {
      const d = await api(`/items/${id}/conversations`, { method: 'POST', body: { body: message } });
      navigate(`/mensajes/${d.id}`);
    } catch (err) {
      setActionError(err.message);
      setSending(false);
    }
  };

  const setStatus = async (status) => {
    setActionError('');
    try {
      await api(`/items/${id}`, { method: 'PATCH', body: { status } });
      setItem({ ...item, status });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const setSwap = async (swap) => {
    setActionError('');
    try {
      await api(`/items/${id}`, { method: 'PATCH', body: { swap } });
      setItem({ ...item, swap });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const remove = async () => {
    if (!window.confirm('¿Seguro que querés eliminar esta publicación? No se puede deshacer.')) return;
    try {
      await api(`/items/${id}`, { method: 'DELETE' });
      navigate(`/u/${user.id}`);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const whatsapp = item.seller.phone
    ? `https://wa.me/${item.seller.phone}?text=${encodeURIComponent(
        `¡Hola! Vi tu publicación "${item.title}" en PasalO. ¿Sigue disponible?${item.swap ? ' También puedo proponerte un cambio.' : ''}`
      )}`
    : null;

  const details = [
    ['Marca', item.brand],
    ['Talle', item.size],
    ['Estado', labelOf(meta?.conditions, item.condition)],
    ['Categoría', labelOf(meta?.categories, item.category)],
  ].filter(([, v]) => v);

  return (
    <>
      <button className="btn btn-link back-link" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="detail">
        <section className="gallery">
          <div className="gallery-main">
            <img src={item.photos[photo]} alt={item.title} />
            {item.status !== 'available' && (
              <span className={`badge badge-lg badge-${item.status}`}>{labelOf(meta?.statuses, item.status)}</span>
            )}
          </div>
          {item.photos.length > 1 && (
            <div className="thumbs">
              {item.photos.map((src, i) => (
                <button key={src} className={`thumb ${i === photo ? 'is-active' : ''}`} onClick={() => setPhoto(i)} aria-label={`Foto ${i + 1}`}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="panel-box">
            <div className="detail-head">
              <h1 className="detail-title">{item.title}</h1>
              <div className="detail-actions">
                <FavoriteButton itemId={item.id} initial={item.isFavorite} count={item.favorites} variant="inline" />
                <ShareButton item={item} />
              </div>
            </div>
            <div className="detail-price">{formatGs(item.price)}</div>

            <div className="detail-tags">
              <span className="tag"><MapPin size={14} /> {item.city}</span>
              <span className="tag"><CalendarDays size={14} /> {timeAgo(item.createdAt)}</span>
              {item.swap && <span className="tag tag-swap"><Repeat size={14} /> Acepta cambio</span>}
            </div>

            <dl className="specs">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>

            {item.description && <p className="description">{item.description}</p>}

            {actionError && <div className="alert alert-error">{actionError}</div>}

            {item.isOwner ? (
              <div className="owner-actions">
                {item.status !== 'sold' && (
                  <div className="share-banner">
                    <Megaphone size={22} />
                    <div>
                      <strong>Compartila en tus grupos</strong>
                      <span className="muted small">Lo que se comparte en WhatsApp se vende más rápido.</span>
                    </div>
                    <ShareButton item={item} variant="button" />
                  </div>
                )}
                <label className="field">
                  <span>Estado de la publicación</span>
                  <select value={item.status} onChange={(e) => setStatus(e.target.value)}>
                    {meta?.statuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" checked={item.swap} onChange={(e) => setSwap(e.target.checked)} />
                  <span className="check-icon"><Repeat size={18} /></span>
                  <span>
                    <strong>Acepto cambio</strong>
                    <small className="muted">Los interesados pueden proponerte un trueque.</small>
                  </span>
                </label>
                <button className="btn btn-danger" onClick={remove}>
                  <Trash2 size={16} /> Eliminar publicación
                </button>
              </div>
            ) : item.status === 'sold' ? (
              <div className="alert">Este artículo ya se vendió.</div>
            ) : (
              <form className="contact" onSubmit={sendMessage}>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000} required aria-label="Mensaje al vendedor" />
                <button className="btn btn-primary btn-block btn-lg" disabled={sending}>
                  <MessageCircle size={18} />
                  {sending ? 'Enviando…' : user ? 'Enviar mensaje' : 'Ingresá para escribirle'}
                </button>
                {whatsapp && (
                  <a className="btn btn-whatsapp btn-block btn-lg" href={whatsapp} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon /> WhatsApp
                  </a>
                )}
              </form>
            )}
            {!item.isOwner && <ReportButton itemId={item.id} />}
          </div>

          <Link to={`/u/${item.seller.id}`} className="panel-box seller">
            <Avatar user={item.seller} size={52} />
            <div className="seller-info">
              <strong>
                {item.seller.name}
                {item.seller.itemCount >= 3 && <BadgeCheck size={16} className="verified" aria-label="Vendedor activo" />}
              </strong>
              <span className="muted small">
                {item.seller.city} · {item.seller.itemCount} publicaciones
              </span>
              <span className="muted small">En PasalO desde {memberSince(item.seller.createdAt)}</span>
              <FounderBadge user={item.seller} />
            </div>
            <ChevronRight size={20} className="muted" />
          </Link>

          <div className="safety">
            <ShieldCheck size={20} />
            <div>
              <strong>Comprá seguro</strong>
              <p>Encontrate en un lugar público, revisá el artículo antes de pagar y nunca envíes dinero por adelantado a desconocidos.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
