// https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Polyfill de 'util' para web (util.inherits no existe en el bundle del navegador).
// Solo aplicamos en web y delegamos el resto al resolver por defecto.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'util') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'util-polyfill.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Si el HTML pide /src/index.bundle (p. ej. por workspace root), reescribir a /index.bundle
// para que Metro sirva el bundle correctamente.
const defaultRewrite = config.server?.rewriteRequestUrl;
config.server = config.server || {};
config.server.rewriteRequestUrl = (url) => {
  if (url && (url.includes('/src/index.bundle') || url.includes('/src/index.bundle?'))) {
    const u = url.startsWith('/') ? new URL(url, 'http://localhost') : new URL(url);
    u.pathname = '/index.bundle';
    const rewritten = u.pathname + (u.search || '');
    return url.startsWith('/') ? rewritten : u.origin + rewritten;
  }
  return defaultRewrite ? defaultRewrite(url) : url;
};

module.exports = config;
