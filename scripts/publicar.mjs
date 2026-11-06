// Publica una versión nueva en pasalo.kazflow.com (sección 4 de HEBERGEMENT.md).
//
//   npm run publicar             compila, empaqueta, envía y muestra el resultado
//   npm run publicar -- --prueba hace todo menos enviar (para revisar el archivo)
//
// Requisitos: túnel WireGuard "vps-kazflow" activado y la clave SSH ~/.ssh/pasalo_ed25519.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const ARCHIVE = path.join(ROOT, 'pasalo.tar.gz');
const DRY_RUN = process.argv.includes('--prueba');
const WIN = process.platform === 'win32';

// En Windows: tar de Windows y sftp/scp de Git (los mismos que usa Git Bash)
const GIT_USR_BIN = 'C:\\Program Files\\Git\\usr\\bin';
const tool = (name) => {
  if (name === 'tar' && WIN) return 'C:\\Windows\\System32\\tar.exe';
  const git = path.join(GIT_USR_BIN, `${name}.exe`);
  return WIN && fs.existsSync(git) ? git : name;
};

const step = (msg) => console.log(`\n▶ ${msg}`);
function stop(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}
function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: cmd.startsWith('npm'), ...opts });
  if (r.status !== 0) stop(`Falló: ${cmd} ${args.join(' ')}`);
}
const npm = WIN ? 'npm.cmd' : 'npm';

// 1. Todo guardado en git (el repositorio es la copia de seguridad del código)
step('Revisando que todo esté guardado en git');
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
if (dirty) stop(`Hay cambios sin guardar (commit) en git:\n${dirty}`);
const ahead = execFileSync('git', ['status', '-sb'], { cwd: ROOT, encoding: 'utf8' }).split('\n')[0];
if (/ahead/.test(ahead)) console.log(`  Atención: hay commits sin subir a GitHub (${ahead}). Conviene hacer git push.`);

if (!fs.existsSync(path.join(ROOT, '.env.production'))) stop('Falta el archivo .env.production');

// 2. Auditoría: el servidor rechaza la versión si hay vulnerabilidades altas o críticas
step('Auditoría de dependencias (npm audit)');
sh(npm, ['audit', '--audit-level=high']);

// 3. Compilar la interfaz en dist/
step('Compilando la interfaz (npm run build)');
sh(npm, ['run', 'build']);

// 4. Empaquetar: sin node_modules, sin .git, sin base de datos ni fotos locales
step('Creando pasalo.tar.gz');
fs.rmSync(ARCHIVE, { force: true });
sh(tool('tar'), [
  '--exclude=server/data',
  '--exclude=server/uploads',
  '--exclude=server/node_modules',
  '--exclude=server/.env*',
  '-czf',
  'pasalo.tar.gz',
  'package.json',
  'package-lock.json',
  '.env.production',
  'dist',
  'server',
]);
const listing = execFileSync(tool('tar'), ['-tzf', 'pasalo.tar.gz'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const forbidden = listing.filter((f) => /(^|\/)(node_modules|\.git)(\/|$)|\.db(-wal|-shm)?$|^server\/(data|uploads)\//.test(f));
if (forbidden.length) stop(`El archivo contiene cosas que no deben publicarse:\n${forbidden.join('\n')}`);
const sizeMb = fs.statSync(ARCHIVE).size / 1024 / 1024;
console.log(`  ${listing.length} archivos, ${sizeMb.toFixed(1)} MB`);
if (sizeMb > 200) stop('El archivo supera los 200 MB');

if (DRY_RUN) {
  console.log('\n✔ Prueba terminada: pasalo.tar.gz está listo, no se envió nada.');
  process.exit(0);
}

// 5. Enviar con nombre provisional y renombrar: el servidor nunca toma un archivo a medias
step('Enviando al servidor (hace falta el túnel WireGuard activado)');
const batch = path.join(os.tmpdir(), 'pasalo-sftp.txt');
fs.writeFileSync(batch, 'put pasalo.tar.gz /depot/pasalo.tar.gz.part\nrename /depot/pasalo.tar.gz.part /depot/pasalo.tar.gz\n');
sh(tool('sftp'), ['-b', batch, 'pasalo']);
fs.rmSync(batch, { force: true });

// 6. Leer el resultado
step('Esperando el resultado de la publicación (90 segundos)');
await new Promise((r) => setTimeout(r, 90_000));
const log = path.join(ROOT, 'publication.log');
sh(tool('scp'), ['-q', 'pasalo:/logs/publication.log', log]);
console.log('\n--- últimas líneas de publication.log ---');
console.log(fs.readFileSync(log, 'utf8').trimEnd().split('\n').slice(-20).join('\n'));
fs.rmSync(ARCHIVE, { force: true });
