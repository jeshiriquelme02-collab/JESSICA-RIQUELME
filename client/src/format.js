const gs = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 });

export const formatGs = (n) => `Gs. ${gs.format(n)}`;
export const formatNumber = (n) => gs.format(n);

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'recién';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) {
    const d = Math.floor(diff / 86400);
    return d === 1 ? 'ayer' : `hace ${d} días`;
  }
  return new Date(iso).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const memberSince = (iso) =>
  new Date(iso).toLocaleDateString('es-PY', { month: 'long', year: 'numeric' });

export const formatPhone = (p) =>
  p ? `0${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}` : '';

export function labelOf(list, id) {
  return list?.find((x) => x.id === id)?.label ?? id;
}
