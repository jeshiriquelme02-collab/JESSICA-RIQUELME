import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import App from './App.jsx';
// Tipografías incluidas en el sitio (sin Google Fonts ni otro servicio externo)
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/inter/index.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
