/**
 * URL base de la API (proyecto web-only).
 * - Desarrollo local: mismo hostname, puerto 4000 (API en otra terminal).
 * - Producción (mismo dominio, ej. Vercel): cadena vacía → rutas relativas `/api/...`.
 * - Opcional: EXPO_PUBLIC_API_URL si la API está en otro host.
 */
function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    const isLocal =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
    if (isLocal) {
      return `http://${hostname}:4000`;
    }
    return '';
  }
  return 'http://localhost:4000';
}

export function getApiUrlForDisplay(): string {
  return getApiUrl();
}

export function apiPath(path: string): string {
  const base = getApiUrl().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export const API_URL = getApiUrl();
