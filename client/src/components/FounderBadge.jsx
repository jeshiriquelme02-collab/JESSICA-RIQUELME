import { Award } from 'lucide-react';

// Insignia de las primeras 100 cuentas de PasalO
export default function FounderBadge({ user, size = 14 }) {
  if (!user?.founder) return null;
  return (
    <span className="founder" title="Una de las primeras 100 cuentas de PasalO">
      <Award size={size} /> Fundador/a
    </span>
  );
}
