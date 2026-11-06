import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, LayoutGrid, MessageCircle, Plus, Repeat, SearchX, SlidersHorizontal, Sparkles, Tag } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatGs, formatNumber } from '../format.js';
import { categoryIcon } from '../icons.js';
import ItemFeed from '../components/ItemFeed.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Logo from '../components/Logo.jsx';
import RoperoCalc from '../components/RoperoCalc.jsx';

function Hero() {
  const [covers, setCovers] = useState([]);

  useEffect(() => {
    api('/items?sort=popular')
      .then((d) => setCovers(d.items.filter((i) => i.cover).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <section className="hero">
      <div className="hero-berry" aria-hidden="true">
        <Logo size={520} />
      </div>
      <div className="hero-copy">
        <span className="eyebrow">
          <Sparkles size={14} /> Comprá y vendé usado, entre paraguayos
        </span>
        <h1>
          Lo que ya no usás, <em>hoy es plata.</em>
        </h1>
        <p>Ropa, zapatillas, celulares, cosas de la casa. Publicás gratis en un minuto y la plata es toda tuya: sin comisión.</p>
        <div className="hero-actions">
          <Link to="/vender" className="btn btn-brand btn-lg">
            <Plus size={20} strokeWidth={2.5} /> Vender ahora
          </Link>
          <a href="#explorar" className="btn btn-glass btn-lg">Ver ofertas</a>
        </div>
      </div>
      <div className="hero-stack" aria-hidden="true">
        {covers.map((item, i) => (
          <div key={item.id} className={`hero-card hero-card-${i}`}>
            <img src={item.cover} alt="" />
            <span className="hero-price">{formatGs(item.price)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Camera, title: 'Sacale una foto', text: 'Con el celu y buena luz. Ya está.' },
  { icon: Tag, title: 'Ponele tu precio', text: 'Sin comisión: lo que pidas es tuyo.' },
  { icon: MessageCircle, title: 'Cobrá en mano', text: 'Se escriben, se encuentran, cobrás.' },
];

export default function Home() {
  const { meta } = useAuth();
  const [params, setParams] = useSearchParams();
  const [total, setTotal] = useState(null);
  const [min, setMin] = useState(params.get('min') ?? '');
  const [max, setMax] = useState(params.get('max') ?? '');
  const [showFilters, setShowFilters] = useState(false);

  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const hasFilters = [...params.keys()].length > 0;

  useEffect(() => {
    setMin(params.get('min') ?? '');
    setMax(params.get('max') ?? '');
  }, [params]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next);
  };

  const applyPrice = (e) => {
    e.preventDefault();
    update({ min: min.replace(/\D/g, ''), max: max.replace(/\D/g, '') });
  };

  const categoryLabel = meta?.categories.find((c) => c.id === category)?.label;
  const title = q ? `Resultados para “${q}”` : categoryLabel ?? (params.get('swap') === '1' ? 'Aceptan cambio' : 'Recién publicados');

  return (
    <>
      {!hasFilters && (
        <>
          <Hero />
          <ol className="steps">
            {STEPS.map(({ icon: Icon, title: t, text }, i) => (
              <li key={t}>
                <span className="step-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <strong>
                    {i + 1}. {t}
                  </strong>
                  <span className="muted">{text}</span>
                </div>
              </li>
            ))}
          </ol>
          <RoperoCalc />
        </>
      )}

      <section id="explorar" className="explore">
        <nav className="chips" aria-label="Categorías">
          <button className={`chip ${!category ? 'is-active' : ''}`} onClick={() => update({ category: '' })}>
            <LayoutGrid size={16} /> Todo
          </button>
          {meta?.categories.map((c) => {
            const Icon = categoryIcon(c.id);
            return (
              <button
                key={c.id}
                className={`chip ${category === c.id ? 'is-active' : ''}`}
                onClick={() => update({ category: c.id })}
              >
                <Icon size={16} /> {c.label}
              </button>
            );
          })}
        </nav>

        <div className="toolbar">
          <div>
            <h2 className="section-title">{title}</h2>
            {total !== null && <p className="muted small">{formatNumber(total)} artículos</p>}
          </div>
          <div className="toolbar-actions">
            <select
              value={params.get('sort') ?? 'recent'}
              onChange={(e) => update({ sort: e.target.value === 'recent' ? '' : e.target.value })}
              aria-label="Ordenar"
            >
              <option value="recent">Más recientes</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="popular">Más favoritos</option>
            </select>
            <button
              className={`btn btn-soft ${showFilters ? 'is-active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal size={16} /> Filtros
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <label className="field">
              <span>Ciudad</span>
              <select value={params.get('city') ?? ''} onChange={(e) => update({ city: e.target.value })}>
                <option value="">Todo el país</option>
                {meta?.cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <form className="field price-filter" onSubmit={applyPrice}>
              <span>Precio (Gs.)</span>
              <div className="price-inputs">
                <input inputMode="numeric" placeholder="Mínimo" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Precio mínimo" />
                <input inputMode="numeric" placeholder="Máximo" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Precio máximo" />
                <button className="btn btn-primary">Aplicar</button>
              </div>
            </form>
            <label className="check check-compact">
              <input type="checkbox" checked={params.get('swap') === '1'} onChange={(e) => update({ swap: e.target.checked ? '1' : '' })} />
              <span className="check-icon"><Repeat size={16} /></span>
              <span><strong>Solo con cambio</strong></span>
            </label>
            {hasFilters && (
              <button className="btn btn-link" onClick={() => setParams(new URLSearchParams())}>
                Limpiar todo
              </button>
            )}
          </div>
        )}

        <ItemFeed
          query={params.toString()}
          onTotal={setTotal}
          empty={
            <EmptyState icon={SearchX} title="No encontramos nada con esos filtros" text="Probá con otra búsqueda. ¿Tenés uno guardado? Publicalo y hacelo plata.">
              <Link to="/vender" className="btn btn-primary">Vender el mío</Link>
            </EmptyState>
          }
        />
      </section>
    </>
  );
}
