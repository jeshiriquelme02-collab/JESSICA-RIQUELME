import { NavLink } from 'react-router-dom';
import { Heart, House, MessageCircle, Plus, User } from 'lucide-react';
import { useAuth } from '../auth.jsx';

// Barra de navegación inferior, solo visible en celulares
export default function BottomNav() {
  const { user, unread } = useAuth();

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <NavLink to="/" end>
        <House size={22} />
        <span>Inicio</span>
      </NavLink>
      <NavLink to="/favoritos">
        <Heart size={22} />
        <span>Favoritos</span>
      </NavLink>
      <NavLink to="/vender" className="bottom-sell">
        <span className="bottom-sell-icon">
          <Plus size={24} strokeWidth={2.5} />
        </span>
        <span>Vender</span>
      </NavLink>
      <NavLink to="/mensajes">
        <span className="bn-icon">
          <MessageCircle size={22} />
          {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
        </span>
        <span>Mensajes</span>
      </NavLink>
      <NavLink to={user ? `/u/${user.id}` : '/entrar'}>
        <User size={22} />
        <span>{user ? 'Perfil' : 'Ingresar'}</span>
      </NavLink>
    </nav>
  );
}
