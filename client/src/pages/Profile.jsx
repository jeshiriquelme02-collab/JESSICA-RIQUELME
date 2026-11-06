import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, MapPin, Package, Pencil, Plus } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { memberSince } from '../format.js';
import Avatar from '../components/Avatar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FounderBadge from '../components/FounderBadge.jsx';
import ItemFeed from '../components/ItemFeed.jsx';

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const isMe = user?.id === Number(id);

  useEffect(() => {
    setProfile(null);
    setError('');
    api(`/users/${id}`).then((d) => setProfile(d.user)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!profile) return <div className="loading">Cargando…</div>;

  return (
    <>
      <section className="profile-head">
        <div className="profile-cover" aria-hidden="true" />
        <div className="profile-row">
          <div className="profile-avatar">
            <Avatar user={profile} size={96} />
          </div>
          <div className="profile-info">
            <h1>{profile.name}</h1>
            <div className="detail-tags">
              <FounderBadge user={profile} />
              <span className="tag"><MapPin size={14} /> {profile.city}</span>
              <span className="tag"><CalendarDays size={14} /> Desde {memberSince(profile.createdAt)}</span>
            </div>
          </div>
          <div className="stats">
            <div><strong>{profile.itemCount}</strong><span>publicaciones</span></div>
            <div><strong>{profile.soldCount}</strong><span>vendidos</span></div>
          </div>
          {isMe && (
            <div className="profile-actions">
              <Link to="/vender" className="btn btn-primary"><Plus size={16} /> Publicar</Link>
              <Link to="/cuenta" className="btn btn-soft"><Pencil size={16} /> Editar perfil</Link>
            </div>
          )}
        </div>
      </section>

      <h2 className="section-title">{isMe ? 'Mis publicaciones' : 'Publicaciones'}</h2>
      <ItemFeed
        query={`user=${profile.id}`}
        empty={
          <EmptyState
            icon={Package}
            title={isMe ? 'Tu ropero todavía no da plata' : 'Este usuario no tiene publicaciones'}
            text={isMe ? 'Esa remera que no usás vale unos Gs. 30.000. Empezá por ahí.' : undefined}
          >
            {isMe && <Link to="/vender" className="btn btn-primary">Publicar lo primero</Link>}
          </EmptyState>
        }
      />
    </>
  );
}
