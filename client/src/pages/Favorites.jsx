import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { api } from '../api.js';
import ItemCard from '../components/ItemCard.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Favorites() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/favorites').then((d) => setItems(d.items)).catch((e) => setError(e.message));
  }, []);

  const onChange = (id) => (isFavorite) => {
    if (!isFavorite) setItems((list) => list.filter((i) => i.id !== id));
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!items) return <div className="loading">Cargando…</div>;

  return (
    <>
      <h1 className="page-title">Mis favoritos</h1>
      {items.length === 0 ? (
        <EmptyState icon={Heart} title="Todavía no guardaste nada" text="Tocá el corazón de lo que te gusta, compará precios con calma y escribile al que más te convenga.">
          <Link to="/" className="btn btn-primary">Explorar artículos</Link>
        </EmptyState>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onFavoriteChange={onChange(item.id)} />
          ))}
        </div>
      )}
    </>
  );
}
