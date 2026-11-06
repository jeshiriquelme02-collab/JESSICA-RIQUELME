import { useEffect, useState } from 'react';
import { api } from '../api.js';
import ItemCard from './ItemCard.jsx';

// Lista paginada de artículos. `query` es un URLSearchParams en forma de string.
export default function ItemFeed({ query, empty, onTotal }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (p) => {
    const qs = new URLSearchParams(query);
    qs.set('page', p);
    const d = await api(`/items?${qs}`);
    return d;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    load(1)
      .then((d) => {
        if (cancelled) return;
        setItems(d.items);
        setPage(1);
        setHasMore(d.hasMore);
        onTotal?.(d.total);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const more = async () => {
    setLoading(true);
    try {
      const d = await load(page + 1);
      setItems((prev) => [...prev, ...d.items]);
      setPage(page + 1);
      setHasMore(d.hasMore);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!loading && items.length === 0) return empty ?? <p className="muted">No hay publicaciones.</p>;

  return (
    <>
      <div className="grid">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
        {loading && items.length === 0 &&
          Array.from({ length: 8 }, (_, i) => <div key={i} className="card skeleton" />)}
      </div>
      {hasMore && (
        <div className="center">
          <button className="btn btn-outline" onClick={more} disabled={loading}>
            {loading ? 'Cargando…' : 'Ver más'}
          </button>
        </div>
      )}
    </>
  );
}
