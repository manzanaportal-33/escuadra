#!/usr/bin/env node
/**
 * Espera a que el servidor web de Expo esté listo y abre el navegador.
 * Uso: node scripts/open-web-after-delay.js &
 * (Se ejecuta en segundo plano mientras corre "expo start --web")
 */
const { exec } = require('child_process');
const DELAY_MS = 12000;
const PORTS = [8081, 8082];

function open(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function tryOpen(portIndex) {
  if (portIndex >= PORTS.length) return;
  const port = PORTS[portIndex];
  const url = `http://localhost:${port}`;
  const http = require('http');
  const req = http.get(url, { timeout: 2000 }, (res) => {
    if (res.statusCode === 200 || res.statusCode === 304) {
      open(url);
      process.exit(0);
    } else tryOpen(portIndex + 1);
  });
  req.on('error', () => tryOpen(portIndex + 1));
  req.on('timeout', () => {
    req.destroy();
    tryOpen(portIndex + 1);
  });
}

setTimeout(() => {
  tryOpen(0);
  // Si después de intentar todos los puertos no abrimos, salir en 2s
  setTimeout(() => process.exit(0), 2500);
}, DELAY_MS);
