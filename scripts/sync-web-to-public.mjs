import { existsSync, rmSync, cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const pub = join(root, 'public');

if (!existsSync(dist)) {
  console.error('sync-web-to-public: no existe dist/. Ejecutá antes: expo export --platform web');
  process.exit(1);
}
rmSync(pub, { recursive: true, force: true });
mkdirSync(pub, { recursive: true });
cpSync(dist, pub, { recursive: true });
console.log('sync-web-to-public: dist/ → public/');
