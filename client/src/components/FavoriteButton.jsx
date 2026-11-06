import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function FavoriteButton({ itemId, initial, count, onChange, variant = 'overlay' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(initial);
  const [total, setTotal] = useState(count ?? 0);
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate(`/entrar?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    setActive(!active);
    try {
      const d = await api(`/items/${itemId}/favorite`, { method: 'POST' });
      setActive(d.isFavorite);
      setTotal(d.favorites);
      onChange?.(d.isFavorite);
    } catch {
      setActive(active);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`fav fav-${variant} ${active ? 'is-active' : ''}`}
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart size={variant === 'inline' ? 18 : 17} fill={active ? 'currentColor' : 'none'} strokeWidth={2.2} />
      {variant === 'inline' && <span>{total}</span>}
    </button>
  );
}
