import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCheck, SendHorizontal } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatGs, labelOf, timeAgo } from '../format.js';
import Avatar from '../components/Avatar.jsx';

export default function Conversation() {
  const { id } = useParams();
  const { meta, refreshUnread } = useAuth();
  const [conv, setConv] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scroller = useRef(null);
  const lastCount = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api(`/conversations/${id}`)
        .then((d) => {
          if (cancelled) return;
          setConv(d);
          refreshUnread();
        })
        .catch((e) => !cancelled && setError(e.message));
    load();
    const timer = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, refreshUnread]);

  useEffect(() => {
    if (conv && conv.messages.length !== lastCount.current) {
      lastCount.current = conv.messages.length;
      const el = scroller.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [conv]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const msg = await api(`/conversations/${id}/messages`, { method: 'POST', body: { body } });
      setConv((c) => ({ ...c, messages: [...c.messages, msg] }));
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (error && !conv) return <div className="alert alert-error">{error}</div>;
  if (!conv) return <div className="loading">Cargando…</div>;

  return (
    <div className="chat narrow">
      <div className="chat-head">
        <Link to="/mensajes" className="icon-btn" aria-label="Volver a mensajes">
          <ArrowLeft size={20} />
        </Link>
        <Link to={`/u/${conv.other.id}`} className="chat-user">
          <Avatar user={conv.other} size={40} />
          <strong>{conv.other.name}</strong>
        </Link>
      </div>

      <Link to={`/articulo/${conv.item.id}`} className="chat-item">
        {conv.item.cover && <img src={conv.item.cover} alt="" />}
        <div>
          <div className="chat-item-title">{conv.item.title}</div>
          <strong>{formatGs(conv.item.price)}</strong>
          {conv.item.status !== 'available' && (
            <span className={`badge badge-inline badge-${conv.item.status}`}>{labelOf(meta?.statuses, conv.item.status)}</span>
          )}
        </div>
      </Link>

      <div className="messages" ref={scroller}>
        {conv.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.mine ? 'bubble-mine' : ''}`}>
            <p>{m.body}</p>
            <span className="bubble-time">
              {timeAgo(m.createdAt)}
              {m.mine && m.read && <CheckCheck size={14} aria-label="Leído" />}
            </span>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="chat-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí un mensaje…" maxLength={1000} aria-label="Mensaje" />
        <button className="btn btn-primary btn-icon" disabled={sending || !text.trim()} aria-label="Enviar">
          <SendHorizontal size={18} />
        </button>
      </form>
    </div>
  );
}
