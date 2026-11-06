import { useEffect, useRef, useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { PUBLIC_URL } from '../api.js';
import { formatGs } from '../format.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// En celulares usamos la hoja de compartir del sistema (ahí aparecen WhatsApp, Instagram, etc.)
const isMobile = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);

export default function ShareButton({ item, variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef(null);

  const url = `${PUBLIC_URL}/articulo/${item.id}`;
  const text = `${item.title} · ${formatGs(item.price)} en PasalO`;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!box.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const share = async () => {
    if (navigator.share && isMobile()) {
      try {
        await navigator.share({ title: item.title, text, url });
        return;
      } catch {
        /* el usuario canceló */
      }
    }
    setOpen(!open);
  };

  // Portapapeles moderno, con respaldo por si el navegador no lo permite
  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch {
        ok = false;
      }
    }
    setCopied(ok ? 'ok' : 'fail');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="share" ref={box}>
      {variant === 'button' ? (
        <button type="button" className="btn btn-primary" onClick={share} aria-expanded={open}>
          <Share2 size={16} /> Compartir
        </button>
      ) : (
        <button type="button" className="icon-btn share-icon" onClick={share} aria-label="Compartir" title="Compartir" aria-expanded={open}>
          <Share2 size={20} />
        </button>
      )}

      {open && (
        <div className="share-menu" role="menu">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer" role="menuitem">
            <WhatsAppIcon /> WhatsApp
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" role="menuitem">
            <FacebookIcon /> Facebook
          </a>
          <button type="button" onClick={copy} role="menuitem">
            <InstagramIcon />
            <span>
              Instagram
              <small className="muted">Copiá el enlace y pegalo en tu historia</small>
            </span>
          </button>
          <button type="button" onClick={copy} role="menuitem">
            {copied === 'ok' ? <Check size={18} /> : <Link2 size={18} />}
            {copied === 'ok' ? (
              '¡Enlace copiado!'
            ) : copied === 'fail' ? (
              <span>
                Copialo a mano
                <small className="muted share-url">{url}</small>
              </span>
            ) : (
              'Copiar enlace'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
