import { Router } from 'express';
import { login, forgotPassword, confirmResetPassword, refreshSession } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  const result = await login(email, password);
  if (!result.success) {
    const msg = result.error || 'Usuario o contraseña incorrectos';
    console.log('[API] Login rechazado:', msg);
    return res.status(401).json({ error: msg });
  }
  res.json(result.data);
});

router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token requerido' });
  }
  const data = await refreshSession(refresh_token);
  if (!data) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  res.json(data);
});

router.post('/forgot-password', async (req, res) => {
  const { email, redirect_to } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email requerido' });
  }
  const { config } = await import('../config.js');
  const fromEnv = (config.passwordResetRedirectUrl || '').trim();
  const redirectTo = fromEnv || redirect_to || undefined;
  const result = await forgotPassword(email.trim().toLowerCase(), redirectTo || undefined);
  if (!result.success) {
    console.log('[API] forgot-password error:', result.error);
    return res.status(400).json({ error: result.error || 'No se pudo enviar el correo' });
  }
  console.log('[API] Correo de restablecimiento enviado a:', email.trim().toLowerCase(), redirectTo ? `(redirect: ${redirectTo})` : '');
  res.json({ message: 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.' });
});

router.post('/confirm-reset', async (req, res) => {
  const { access_token, new_password } = req.body || {};
  if (!access_token || !new_password) {
    return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
  }
  const result = await confirmResetPassword(access_token, new_password);
  if (!result.success) {
    return res.status(400).json({ error: result.error || 'No se pudo actualizar la contraseña' });
  }
  res.json({ message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
});

export default router;
