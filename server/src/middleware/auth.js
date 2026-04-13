import { getUserFromToken } from '../auth.js';

export async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }
    const token = auth.slice(7);
    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    // Evita que el cliente (navegador / RN) sirva JSON viejo tras cambiar perfil (ej. grado).
    res.set('Cache-Control', 'private, no-store, no-cache');
    res.set('Pragma', 'no-cache');
    next();
  } catch (e) {
    next(e);
  }
}

export function adminOnly(req, res, next) {
  if (req.user.user_level !== 1) {
    return res.status(403).json({ error: 'Se requiere rol de administrador' });
  }
  next();
}

/** Solo administrador con profiles.is_superadmin = true. */
export function superAdminOnly(req, res, next) {
  if (req.user.user_level !== 1 || !req.user?.is_superadmin) {
    return res.status(403).json({ error: 'Se requiere rol de superadministrador' });
  }
  next();
}
