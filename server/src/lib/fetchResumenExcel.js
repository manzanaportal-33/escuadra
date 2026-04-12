/**
 * Descarga .xlsx remoto para el resumen (Google Drive o URL directa).
 */

const FETCH_MS = 60000;

function isZipXlsx(buf) {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

function looksLikeHtml(buf) {
  const s = buf.subarray(0, Math.min(200, buf.length)).toString('utf8').trimStart();
  return s.startsWith('<') || s.startsWith('<!') || /^\s*<html/i.test(s);
}

/**
 * Archivo en Drive compartido como "Cualquiera con el enlace" (lector).
 * Si el archivo es grande, Drive puede mostrar página de confirmación; se reintenta con confirm=.
 *
 * @param {string} fileId
 * @returns {Promise<Buffer>}
 */
export async function fetchExcelBufferFromGoogleDrive(fileId) {
  const id = String(fileId).trim();
  if (!/^[\w-]+$/.test(id)) {
    throw new Error('RESUMEN_ESTADO_CUENTAS_GOOGLE_DRIVE_FILE_ID inválido');
  }
  const base = `https://drive.google.com/uc?export=download&id=${id}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    let res = await fetch(base, { redirect: 'follow', signal: controller.signal });
    let buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html') || (buf.length < 500000 && looksLikeHtml(buf))) {
      const html = buf.toString('utf8');
      const m =
        html.match(/confirm=([0-9A-Za-z_-]+)/) ||
        html.match(/\/uc\?[^"]*confirm=([0-9A-Za-z_-]+)/) ||
        html.match(/name="confirm"\s+value="([^"]+)"/);
      const confirm = m ? m[1] : 't';
      res = await fetch(`${base}&confirm=${confirm}`, { redirect: 'follow', signal: controller.signal });
      buf = Buffer.from(await res.arrayBuffer());
    }
    if (!isZipXlsx(buf)) {
      throw new Error(
        'Google Drive no devolvió un .xlsx válido. Usá compartir "Cualquiera con el enlace" (lector) o probá RESUMEN_ESTADO_CUENTAS_EXCEL_URL con un enlace directo al archivo.',
      );
    }
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cualquier URL HTTPS que devuelva el .xlsx en bruto (Dropbox ?dl=1, S3, Supabase Storage público, etc.).
 *
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
export async function fetchExcelBufferFromUrl(url) {
  const u = String(url).trim();
  if (!u.startsWith('https://')) {
    throw new Error('RESUMEN_ESTADO_CUENTAS_EXCEL_URL debe ser https://');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(u, { redirect: 'follow', signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al descargar el Excel`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isZipXlsx(buf)) {
      throw new Error('La URL no devolvió un .xlsx (archivo ZIP / OOXML).');
    }
    return buf;
  } finally {
    clearTimeout(timer);
  }
}
