// Genera los íconos de la app (tiendas y PWA) a partir de la frutilla en SVG.
// Uso: node scripts/make-icons.mjs   (después: npx capacitor-assets generate)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.join(import.meta.dirname, '..');
const RES = path.join(ROOT, 'resources');
const PUB = path.join(ROOT, 'public', 'icons');
fs.mkdirSync(RES, { recursive: true });
fs.mkdirSync(PUB, { recursive: true });

const CREAM = '#f7f5f0';
const DARK = '#0f0e0c';
const RED = '#e02f44';
const GREEN = '#2f9e5b';

// La frutilla en contorno, centrada en un lienzo cuadrado. `scale` es qué parte del lienzo ocupa.
const berry = (size, scale, bg) => {
  const s = size * scale;
  const off = (size - s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
  <g transform="translate(${off} ${off}) scale(${s / 100})">
    <path d="M50 92C27 83 14 61 16 45 17.5 33 27 27.5 37 29c5.5 1 9 3 13 3s7.5-2 13-3c10-1.5 19.5 4 21 16 2 16-11 38-34 47z" fill="none" stroke="${RED}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M50 31c-3.5-9.5-12-14-21.5-11.5 4.5 4.5 7 9 7.5 14.5 5 2 10 1.5 14-3zM50 31c3.5-9.5 12-14 21.5-11.5-4.5 4.5-7 9-7.5 14.5-5 2-10 1.5-14-3z" fill="${GREEN}"/>
    <path d="M50 31V11" stroke="${GREEN}" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>`;
};

const png = (svg, out) => sharp(Buffer.from(svg)).png().toFile(out);

await Promise.all([
  // Para @capacitor/assets
  png(berry(1024, 0.7, CREAM), path.join(RES, 'icon-only.png')),
  png(berry(1024, 0.5, null), path.join(RES, 'icon-foreground.png')),
  png(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${CREAM}"/></svg>`, path.join(RES, 'icon-background.png')),
  png(berry(2732, 0.22, CREAM), path.join(RES, 'splash.png')),
  png(berry(2732, 0.22, DARK), path.join(RES, 'splash-dark.png')),
  // Para la PWA
  png(berry(192, 0.8, CREAM), path.join(PUB, 'icon-192.png')),
  png(berry(512, 0.8, CREAM), path.join(PUB, 'icon-512.png')),
  png(berry(512, 0.55, CREAM), path.join(PUB, 'maskable-512.png')),
  png(berry(180, 0.8, CREAM), path.join(PUB, 'apple-touch-icon.png')),
]);

console.log('Íconos generados en resources/ y public/icons/');
