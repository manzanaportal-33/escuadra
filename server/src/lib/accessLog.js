import { supabase } from '../supabase.js';

export function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string') return xf.split(',')[0].trim().slice(0, 64);
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).trim().slice(0, 64);
  if (req.socket?.remoteAddress) return String(req.socket.remoteAddress).slice(0, 64);
  if (req.ip) return String(req.ip).slice(0, 64);
  return '';
}

export function getUserAgent(req) {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua.slice(0, 512) : '';
}

/**
 * Registra un login exitoso (no bloquea la respuesta si falla el insert).
 * @param {{ userId: string, email?: string | null, req: import('express').Request }} p
 */
export function logLoginAsync(p) {
  const { userId, email, req } = p;
  void supabase
    .from('access_log')
    .insert({
      user_id: userId,
      email: (email || '').slice(0, 255),
      event_type: 'login',
      ip: getClientIp(req),
      user_agent: getUserAgent(req),
      path: '/api/auth/login',
    })
    .then(({ error }) => {
      if (error) console.error('[access_log] insert:', error.message);
    });
}
