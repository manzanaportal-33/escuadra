import nodemailer from 'nodemailer';
import { config } from './config.js';

const TIPO_LABEL = {
  ingreso: 'Solicitud de Ingreso',
  reingreso: 'Solicitud de Re-Ingreso',
  ascenso: 'Ascenso Troncal',
  dimision: 'Dimisión',
  pase: 'Pase',
};

let transporterCache = null;

function getTransporter() {
  const { host, port, user, pass } = config.email.smtp;
  if (!host || !user) return null;
  if (transporterCache) return transporterCache;
  const portNum = port || 587;
  transporterCache = nodemailer.createTransport({
    host,
    port: portNum,
    secure: config.email.smtp.secure || portNum === 465,
    auth: {
      user,
      pass: pass || '',
    },
  });
  return transporterCache;
}

export function isEmailConfigured() {
  return (
    config.email.tramitesNotifyTo.length > 0 &&
    Boolean(config.email.smtp.host && config.email.smtp.user)
  );
}

/**
 * Notifica por mail a secretaría cuando un hermano envía un trámite.
 * Si falta SMTP o destinatarios, solo registra en consola (no falla el flujo).
 */
export async function sendTramiteNotificationEmail({
  tramiteRow,
  enviadoPorEmail,
}) {
  const recipients = config.email.tramitesNotifyTo;
  if (!recipients.length) {
    console.warn('[email] NOTIFY_EMAIL_TRAMITES no está definido; no se envía correo de trámite.');
    return { sent: false, reason: 'no_recipients' };
  }

  const transport = getTransporter();
  if (!transport) {
    console.warn('[email] SMTP_HOST / SMTP_USER no configurados; no se envía correo de trámite.');
    return { sent: false, reason: 'no_smtp' };
  }

  const tipo = tramiteRow.tipo || '';
  const tituloTipo = TIPO_LABEL[tipo] || tipo;
  const subject = `[SCG33] ${tituloTipo} — ${tramiteRow.apellido || ''}, ${tramiteRow.nombre || ''}`.trim();

  let datosExtra = '';
  if (tramiteRow.datos_json) {
    try {
      const j = typeof tramiteRow.datos_json === 'string' ? JSON.parse(tramiteRow.datos_json) : tramiteRow.datos_json;
      datosExtra = JSON.stringify(j, null, 2);
    } catch {
      datosExtra = String(tramiteRow.datos_json);
    }
  }

  const lines = [
    `Nueva solicitud registrada en el área reservada.`,
    ``,
    `ID trámite: ${tramiteRow.id}`,
    `Tipo: ${tituloTipo}`,
    `Estado: ${tramiteRow.estado || '—'}`,
    `Fecha: ${tramiteRow.created_at || new Date().toISOString()}`,
    ``,
    `Datos del trámite`,
    `----------------`,
    `Nombre: ${tramiteRow.nombre || '—'}`,
    `Apellido: ${tramiteRow.apellido || '—'}`,
    `Mail (formulario): ${tramiteRow.mail || '—'}`,
    `Cuerpo / logia: ${tramiteRow.cuerpo || '—'}`,
    `Cuerpo al que pasa: ${tramiteRow.cuerpo_pasa || '—'}`,
    `Plomo: ${tramiteRow.plomo || '—'}`,
    `Fecha propuesta: ${tramiteRow.fecha_propuesta || '—'}`,
    ``,
    `Archivo adjunto: la solicitud incluye un PDF/imagen/Word subido por el hermano. Descargalo desde Administración → Solicitudes (trámites), detalle del trámite ID ${tramiteRow.id}.`,
  ];

  if (datosExtra) {
    lines.push(``, `Datos adicionales (JSON):`, datosExtra);
  }

  lines.push(
    ``,
    `Enviado por (usuario logueado): ${enviadoPorEmail || '—'}`,
    ``,
    `— Sistema SCG33 (no responder a este correo automático)`
  );

  const text = lines.join('\n');
  const html = `<pre style="font-family:system-ui,sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(text)}</pre>`;

  try {
    await transport.sendMail({
      from: config.email.from,
      to: recipients.join(', '),
      replyTo: tramiteRow.mail || enviadoPorEmail || undefined,
      subject,
      text,
      html,
    });
    console.log('[email] Notificación de trámite enviada a:', recipients.join(', '));
    return { sent: true };
  } catch (e) {
    console.error('[email] Error enviando notificación de trámite:', e.message);
    return { sent: false, reason: e.message };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
