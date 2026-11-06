import { Link, Route, Routes } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { RequireAuth } from './auth.jsx';
import Header from './components/Header.jsx';
import BottomNav from './components/BottomNav.jsx';
import EmptyState from './components/EmptyState.jsx';
import Logo from './components/Logo.jsx';
import Home from './pages/Home.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import Sell from './pages/Sell.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Favorites from './pages/Favorites.jsx';
import Inbox from './pages/Inbox.jsx';
import Conversation from './pages/Conversation.jsx';
import Account from './pages/Account.jsx';
import { Privacy, Terms } from './pages/Legal.jsx';

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/articulo/:id" element={<ItemDetail />} />
          <Route path="/u/:id" element={<Profile />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/vender" element={<RequireAuth><Sell /></RequireAuth>} />
          <Route path="/favoritos" element={<RequireAuth><Favorites /></RequireAuth>} />
          <Route path="/mensajes" element={<RequireAuth><Inbox /></RequireAuth>} />
          <Route path="/mensajes/:id" element={<RequireAuth><Conversation /></RequireAuth>} />
          <Route path="/cuenta" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/terminos" element={<Terms />} />
          <Route path="/privacidad" element={<Privacy />} />
          <Route
            path="*"
            element={
              <EmptyState icon={SearchX} title="Página no encontrada" text="El enlace puede estar roto o la página ya no existe.">
                <Link to="/" className="btn btn-primary">Volver al inicio</Link>
              </EmptyState>
            }
          />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Logo size={28} />
            <div>
              <strong>PasalO</strong>
              <p>Lo que ya no usás, hacelo plata. Sin comisión, entre paraguayos.</p>
            </div>
          </div>
          <p className="footer-note">
            <Link to="/terminos">Términos</Link> · <Link to="/privacidad">Privacidad</Link> · Hecho en Paraguay 🇵🇾
          </p>
        </div>
      </footer>
      <BottomNav />
    </>
  );
}
