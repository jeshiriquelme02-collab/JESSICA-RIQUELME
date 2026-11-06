import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { api } from '../api.js';
import { formatGs, timeAgo } from '../format.js';
import Avatar from '../components/Avatar.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Inbox() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => api('/conversations').then((d) => setList(d.conversations)).catch((e) => setError(e.message));
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!list) return <div className="loading">Cargando…</div>;

  return (
    <div className="narrow">
      <h1 className="page-title">Mensajes</h1>
      {list.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No tenés conversaciones" text="Cuando le escribas a un vendedor o alguien te escriba, aparece acá." />
      ) : (
        <ul className="inbox">
          {list.map((c) => (
            <li key={c.id}>
              <Link to={`/mensajes/${c.id}`} className={`inbox-row ${c.unread ? 'is-unread' : ''}`}>
                <div className="inbox-thumb">
                  {c.item.cover ? <img src={c.item.cover} alt="" className="inbox-img" /> : <div className="inbox-img" />}
                  <span className="inbox-avatar"><Avatar user={c.other} size={26} /></span>
                </div>
                <div className="inbox-body">
                  <div className="inbox-top">
                    <strong>{c.other.name}</strong>
                    <span className="muted small">{timeAgo(c.updatedAt)}</span>
                  </div>
                  <div className="muted small inbox-item">
                    {c.item.title} · {formatGs(c.item.price)}
                  </div>
                  <div className="inbox-last">
                    {c.lastFromMe && <span className="muted">Vos: </span>}
                    {c.lastMessage}
                  </div>
                </div>
                {c.unread > 0 && <span className="dot dot-static">{c.unread}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
