import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footprints, Home, Minus, Plus, Shirt, Smartphone, Watch } from 'lucide-react';
import { formatGs } from '../format.js';

// Precio promedio estimado por artículo, en guaraníes
const ROWS = [
  { id: 'ropa', label: 'Prendas de ropa', hint: 'remeras, jeans, vestidos', avg: 35000, icon: Shirt },
  { id: 'calzados', label: 'Pares de calzado', hint: 'zapatillas, zapatos', avg: 90000, icon: Footprints },
  { id: 'electronica', label: 'Celulares y electrónica', hint: 'celus, auriculares, consolas', avg: 350000, icon: Smartphone },
  { id: 'hogar', label: 'Cosas de la casa', hint: 'muebles chicos, electrodomésticos', avg: 80000, icon: Home },
  { id: 'accesorios', label: 'Accesorios y otros', hint: 'carteras, relojes, libros', avg: 30000, icon: Watch },
];

const MAX = 50;

export default function RoperoCalc() {
  const [counts, setCounts] = useState({ ropa: 5, calzados: 1, electronica: 0, hogar: 0, accesorios: 2 });

  const set = (id, n) => setCounts((c) => ({ ...c, [id]: Math.min(MAX, Math.max(0, n)) }));
  const total = ROWS.reduce((sum, r) => sum + counts[r.id] * r.avg, 0);
  const items = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <section className="calc" aria-labelledby="calc-title">
      <div className="calc-copy">
        <h2 id="calc-title">¿Cuánta plata tenés guardada en tu ropero?</h2>
        <p className="muted">Contá lo que no usás hace más de un año. Nosotros hacemos la cuenta.</p>

        <ul className="calc-rows">
          {ROWS.map(({ id, label, hint, avg, icon: Icon }) => (
            <li key={id}>
              <span className="calc-icon">
                <Icon size={18} />
              </span>
              <div className="calc-label">
                <strong>{label}</strong>
                <span className="muted small">
                  {hint} · ~{formatGs(avg)} c/u
                </span>
              </div>
              <div className="stepper" role="group" aria-label={label}>
                <button type="button" onClick={() => set(id, counts[id] - 1)} aria-label={`Menos ${label}`} disabled={counts[id] === 0}>
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={MAX}
                  value={counts[id]}
                  onChange={(e) => set(id, Number(e.target.value) || 0)}
                  aria-label={`Cantidad de ${label}`}
                />
                <button type="button" onClick={() => set(id, counts[id] + 1)} aria-label={`Más ${label}`} disabled={counts[id] === MAX}>
                  <Plus size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="calc-result">
        <span className="calc-eyebrow">Tenés guardados</span>
        <strong className="calc-total">{formatGs(total)}</strong>
        <span className="muted">
          en {items} {items === 1 ? 'artículo' : 'artículos'} que hoy no usás.
        </span>
        <Link to="/vender" className="btn btn-brand btn-lg">
          <Plus size={20} strokeWidth={2.5} /> Hacelo plata
        </Link>
        <span className="muted small">Estimado con precios promedio de segunda mano. Lo que pidas lo decidís vos.</span>
      </div>
    </section>
  );
}
