/**
 * Genera `.vercel/output` (Build Output API v3): estáticos + función Node con Express.
 * Así Vercel despliega front y API en un solo artefacto (evita 404 cuando solo había output estático).
 */
import { rmSync, mkdirSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getTransformedRoutes } = require('@vercel/routing-utils');

const root = fileURLToPath(new URL('..', import.meta.url));
const pub = join(root, 'public');
const serverSrc = join(root, 'server');
const outRoot = join(root, '.vercel/output');

if (!existsSync(pub)) {
  console.error('vercel-build-output: falta public/. Ejecutá antes el build web (expo export + sync).');
  process.exit(1);
}
if (!existsSync(serverSrc)) {
  console.error('vercel-build-output: falta server/');
  process.exit(1);
}

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(join(outRoot, 'static'), { recursive: true });
cpSync(pub, join(outRoot, 'static'), { recursive: true });

const funcDir = join(outRoot, 'functions', 'api.func');
mkdirSync(funcDir, { recursive: true });
cpSync(serverSrc, join(funcDir, 'server'), { recursive: true });

writeFileSync(
  join(funcDir, 'serve.js'),
  `import { app } from './server/src/app.js';
export default app;
`,
);

writeFileSync(
  join(funcDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'serve.js',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
      maxDuration: 60,
    },
    null,
    2,
  ) + '\n',
);

const { routes, error } = getTransformedRoutes({
  rewrites: [
    { source: '/api(.*)', destination: '/api' },
    { source: '/(.*)', destination: '/index.html' },
  ],
  trailingSlash: false,
});

if (error) {
  console.error('vercel-build-output: getTransformedRoutes', error);
  process.exit(1);
}

writeFileSync(join(outRoot, 'config.json'), JSON.stringify({ version: 3, routes }, null, 2) + '\n');
console.log('vercel-build-output: .vercel/output listo (static + functions/api.func).');
