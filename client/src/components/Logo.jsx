// Logo de pasalo: frutilla en contorno, centro vacío y plantita verde
export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="logo-mark">
      <path
        d="M50 92C27 83 14 61 16 45 17.5 33 27 27.5 37 29c5.5 1 9 3 13 3s7.5-2 13-3c10-1.5 19.5 4 21 16 2 16-11 38-34 47z"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path d="M50 31c-3.5-9.5-12-14-21.5-11.5 4.5 4.5 7 9 7.5 14.5 5 2 10 1.5 14-3z" fill="#2f9e5b" />
      <path d="M50 31c3.5-9.5 12-14 21.5-11.5-4.5 4.5-7 9-7.5 14.5-5 2-10 1.5-14-3z" fill="#2f9e5b" />
      <path d="M50 31V11" stroke="#2f9e5b" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
