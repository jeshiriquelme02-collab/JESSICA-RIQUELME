import { Link } from 'react-router-dom';
import { MapPin, Repeat } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { formatGs, labelOf } from '../format.js';
import { categoryIcon } from '../icons.js';
import FavoriteButton from './FavoriteButton.jsx';

export default function ItemCard({ item, onFavoriteChange }) {
  const { meta } = useAuth();
  const Icon = categoryIcon(item.category);
  const details = [item.size, item.brand].filter(Boolean).join(' · ');

  return (
    <article className="card">
      <Link to={`/articulo/${item.id}`} className="card-link">
        <div className="card-img">
          {item.cover ? (
            <img src={item.cover} alt={item.title} loading="lazy" />
          ) : (
            <div className="card-ph">
              <Icon size={40} strokeWidth={1.5} />
            </div>
          )}
          {item.status !== 'available' && (
            <span className={`badge badge-${item.status}`}>{labelOf(meta?.statuses, item.status)}</span>
          )}
          {item.swap && (
            <span className="badge badge-swap"><Repeat size={12} aria-hidden="true" /> Cambio</span>
          )}
        </div>
        <div className="card-body">
          <div className="card-price">{formatGs(item.price)}</div>
          <div className="card-title">{item.title}</div>
          <div className="card-meta">
            {details && <span>{details}</span>}
            <span className="card-city">
              <MapPin size={12} aria-hidden="true" />
              {item.city}
            </span>
          </div>
        </div>
      </Link>
      <FavoriteButton itemId={item.id} initial={item.isFavorite} onChange={onFavoriteChange} />
    </article>
  );
}
