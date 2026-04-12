import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    /** Opcional. Necesario para refrescar el token (evitar "Token inválido o expirado" al volver a entrar). */
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  /** URL a la que Supabase redirige después del enlace "Restablecer contraseña". Debe estar en Redirect URLs de Supabase. */
  passwordResetRedirectUrl: process.env.PASSWORD_RESET_REDIRECT_URL || '',
  /** Correo saliente (notificaciones de trámites). Ver README: SMTP. */
  email: {
    from: process.env.SMTP_FROM || process.env.NOTIFY_FROM || 'noreply@localhost',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1',
    },
    /** Destinatarios para avisos de trámites (separados por coma), ej. secretaría@scg33.org.ar */
    tramitesNotifyTo: (process.env.NOTIFY_EMAIL_TRAMITES || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
};

// Comprobar que las variables necesarias existan al arrancar
export function checkEnv() {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    console.error('\n❌ Faltan variables de entorno.');
    console.error('   La app lee el archivo server/.env (no .env.example).');
    console.error('   Hacé una copia y completá con tus datos de Supabase:\n');
    console.error('   cp .env.example .env');
    console.error('   # Luego editá server/.env y poné SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
  }
  if (config.supabase.url.includes('tu-proyecto') || config.supabase.serviceRoleKey === 'tu-service-role-key') {
    console.error('\n❌ .env tiene valores de ejemplo. Editá el archivo server/.env (no .env.example)');
    console.error('   y reemplazá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY con los de tu proyecto.');
    console.error('   En Supabase: Settings → API → Project URL y service_role key.\n');
    process.exit(1);
  }
  if (!config.supabase.anonKey) {
    console.warn('\n⚠️  SUPABASE_ANON_KEY no está en .env. El login usará un cliente efímero;');
    console.warn('   conviene agregar la anon key (Settings → API) para sign-in y refresh.\n');
  }
  if (!config.email.tramitesNotifyTo.length || !config.email.smtp.host) {
    console.warn('\n⚠️  Correo de trámites: sin NOTIFY_EMAIL_TRAMITES o SMTP; las solicitudes se guardan igual.');
    console.warn('   Configurá SMTP en .env para recibir mails al enviar trámites (ver README).\n');
  }
}
