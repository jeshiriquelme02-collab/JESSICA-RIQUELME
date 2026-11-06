const COLORS = ['#0f766e', '#b45309', '#7c3aed', '#be123c', '#1d4ed8', '#15803d', '#a21caf'];

export default function Avatar({ user, size = 40 }) {
  const initials = (user?.name ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const color = COLORS[(user?.id ?? 0) % COLORS.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
