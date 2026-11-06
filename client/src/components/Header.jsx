import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, MessageCircle, Plus, Search } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import Avatar from './Avatar.jsx';
import Logo from './Logo.jsx';

export default function Header() {
  const { user, unread } = useAuth();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const navigate = useNavigate();

  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  const submit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    navigate(`/?${next}`);
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo" aria-label="PasalO, inicio">
          <Logo size={38} />
          <span className="logo-text">PasalO</span>
        </Link>

        <form className="search" onSubmit={submit} role="search">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="¿Qué buscás? Zapatillas, celu, bici…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar artículos"
          />
        </form>

        <nav className="nav">
          {user ? (
            <>
              <NavLink to="/favoritos" className="icon-btn" title="Favoritos" aria-label="Favoritos">
                <Heart size={20} />
              </NavLink>
              <NavLink to="/mensajes" className="icon-btn" title="Mensajes" aria-label="Mensajes">
                <MessageCircle size={20} />
                {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
              </NavLink>
              <Link to={`/u/${user.id}`} className="nav-avatar" title="Mi perfil" aria-label="Mi perfil">
                <Avatar user={user} size={36} />
              </Link>
            </>
          ) : (
            <Link to="/entrar" className="btn btn-ghost">Ingresar</Link>
          )}
          <Link to="/vender" className="btn btn-primary">
            <Plus size={18} strokeWidth={2.5} /> Vender
          </Link>
        </nav>
      </div>
    </header>
  );
}
