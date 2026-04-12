import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../supabase.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { sendTramiteNotificationEmail } from '../email.js';

const router = Router();
const TIPOS = ['ingreso', 'reingreso', 'ascenso', 'dimision', 'pase'];
const BUCKET = 'biblioteca';
const ADJUNTO_MAX = 25 * 1024 * 1024;
const ADJUNTO_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const uploadAdjunto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ADJUNTO_MAX },
  fileFilter: (_req, file, cb) => {
    if (ADJUNTO_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(
      new Error(
        'Adjunto no permitido. Usá PDF, Word (.doc/.docx) o imagen (JPG, PNG, WEBP).'
      )
    );
  },
});

function parseMultipartAdjunto(req, res, next) {
  uploadAdjunto.single('adjunto')(req, res, (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? `El archivo supera el máximo de ${ADJUNTO_MAX / (1024 * 1024)} MB.`
          : err.message || 'Archivo no válido';
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

router.use(authMiddleware);

async function fetchAdjuntosForTramite(tramiteId) {
  const { data, error } = await supabase
    .from('tramites_adjuntos')
    .select('id, nombre_original, created_at')
    .eq('tramite_id', tramiteId)
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Listar: el usuario ve los suyos; admin ve todos
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.user_level === 1;
    let query = supabase
      .from('tramites')
      .select('id, tipo, nombre, apellido, mail, cuerpo, cuerpo_pasa, plomo, fecha_propuesta, estado, created_at, user_id')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Listado completo para administración (incluye datos_json y conteo de adjuntos). */
router.get('/admin', adminOnly, async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('tramites')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const list = rows || [];
    const ids = list.map((r) => r.id).filter((id) => id != null);
    const countMap = new Map();
    if (ids.length) {
      const { data: adjRows, error: e2 } = await supabase
        .from('tramites_adjuntos')
        .select('tramite_id')
        .in('tramite_id', ids);
      if (e2) throw e2;
      for (const a of adjRows || []) {
        const tid = a.tramite_id;
        countMap.set(tid, (countMap.get(tid) || 0) + 1);
      }
    }
    const out = list.map((r) => ({ ...r, adjuntos_count: countMap.get(r.id) || 0 }));
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Detalle de una solicitud (admin). */
router.get('/admin/:id', adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const { data, error } = await supabase.from('tramites').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    const adjuntos = await fetchAdjuntosForTramite(id);
    res.json({ ...data, adjuntos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function getAdjuntoRowAdmin(tramiteId, adjuntoId) {
  const { data: adj, error: e0 } = await supabase
    .from('tramites_adjuntos')
    .select('id, tramite_id, nombre_original, ruta')
    .eq('id', adjuntoId)
    .single();
  if (e0 || !adj || adj.tramite_id !== tramiteId) return null;
  return adj;
}

/** URL firmada para abrir/descargar el adjunto (admin; útil en móvil). */
router.get('/admin/:id/adjuntos/:adjuntoId/signed-url', adminOnly, async (req, res) => {
  try {
    const tramiteId = parseInt(req.params.id, 10);
    const adjuntoId = parseInt(req.params.adjuntoId, 10);
    if (Number.isNaN(tramiteId) || Number.isNaN(adjuntoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const adj = await getAdjuntoRowAdmin(tramiteId, adjuntoId);
    if (!adj) return res.status(404).json({ error: 'No encontrado' });
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(adj.ruta, 600);
    if (error || !data?.signedUrl) {
      return res.status(500).json({ error: error?.message || 'No se pudo generar el enlace' });
    }
    res.json({ url: data.signedUrl, nombre_original: adj.nombre_original });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Descargar archivo adjunto (admin). */
router.get('/admin/:id/adjuntos/:adjuntoId/download', adminOnly, async (req, res) => {
  try {
    const tramiteId = parseInt(req.params.id, 10);
    const adjuntoId = parseInt(req.params.adjuntoId, 10);
    if (Number.isNaN(tramiteId) || Number.isNaN(adjuntoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const adj = await getAdjuntoRowAdmin(tramiteId, adjuntoId);
    if (!adj) return res.status(404).json({ error: 'Adjunto no encontrado' });

    const { data: blob, error: e1 } = await supabase.storage.from(BUCKET).download(adj.ruta);
    if (e1 || !blob) {
      return res.status(500).json({ error: e1?.message || 'No se pudo leer el archivo' });
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    const ct = blob.type && String(blob.type).trim() ? blob.type : 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    const safe = String(adj.nombre_original || 'adjunto').replace(/[\r\n"]/g, '_');
    const utf8 = encodeURIComponent(safe);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safe.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${utf8}`
    );
    res.setHeader('Content-Length', String(buf.length));
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Actualizar estado (admin). */
router.patch('/admin/:id', adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const { estado } = req.body || {};
    if (estado == null || !String(estado).trim()) {
      return res.status(400).json({ error: 'estado es requerido' });
    }
    const { data, error } = await supabase
      .from('tramites')
      .update({ estado: String(estado).trim().slice(0, 80) })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear trámite + adjunto obligatorio (multipart: campos de texto + archivo "adjunto")
router.post('/', parseMultipartAdjunto, async (req, res) => {
  try {
    const level = req.user.user_level;
    if (level == null || level > 33) {
      return res.status(403).json({ error: 'Sin permiso para realizar trámites' });
    }
    const {
      tipo,
      nombre,
      apellido,
      mail,
      cuerpo,
      cuerpo_pasa,
      plomo,
      fecha_propuesta,
      datos_json,
      nombre_solicitante,
      apellido_solicitante,
    } = req.body || {};

    if (!req.file) {
      return res.status(400).json({
        error:
          'Tenés que adjuntar el archivo de la solicitud (PDF, Word o imagen JPG/PNG/WEBP).',
      });
    }

    if (!tipo || !TIPOS.includes(tipo)) {
      return res.status(400).json({
        error: 'Tipo de trámite inválido. Debe ser: ingreso, reingreso, ascenso, dimision, pase',
      });
    }
    if (!nombre || !apellido || !cuerpo) {
      return res.status(400).json({ error: 'Faltan nombre, apellido o cuerpo' });
    }
    if ((tipo === 'ingreso' || tipo === 'ascenso' || tipo === 'dimision') && !mail) {
      return res.status(400).json({ error: 'Mail requerido para este trámite' });
    }
    if (tipo === 'pase' && !cuerpo_pasa) {
      return res.status(400).json({ error: 'Cuerpo al que pasa es requerido para pase' });
    }

    let datos = {};
    if (datos_json != null && datos_json !== '') {
      try {
        datos = typeof datos_json === 'string' ? JSON.parse(datos_json) : datos_json;
        if (typeof datos !== 'object' || datos === null) datos = {};
      } catch {
        datos = {};
      }
    }
    if (nombre_solicitante != null) datos.nombre_solicitante = String(nombre_solicitante).trim();
    if (apellido_solicitante != null) datos.apellido_solicitante = String(apellido_solicitante).trim();

    const { data, error } = await supabase
      .from('tramites')
      .insert({
        tipo,
        user_id: req.user.id,
        nombre: String(nombre).trim(),
        apellido: String(apellido).trim(),
        mail: mail ? String(mail).trim() : null,
        cuerpo: String(cuerpo).trim(),
        cuerpo_pasa: cuerpo_pasa ? String(cuerpo_pasa).trim() : null,
        plomo: plomo === 'SI' ? 'SI' : 'NO',
        fecha_propuesta: fecha_propuesta ? String(fecha_propuesta).trim() : null,
        datos_json: Object.keys(datos).length ? JSON.stringify(datos) : null,
        estado: 'pendiente',
      })
      .select('id, tipo, nombre, apellido, mail, cuerpo, cuerpo_pasa, plomo, fecha_propuesta, estado, created_at, datos_json')
      .single();

    if (error) throw error;

    const safeName = String(req.file.originalname || 'adjunto')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-120);
    const storagePath = `tramites-adjuntos/${data.id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (upErr) {
      await supabase.from('tramites').delete().eq('id', data.id);
      throw upErr;
    }

    const { error: adjErr } = await supabase.from('tramites_adjuntos').insert({
      tramite_id: data.id,
      nombre_original: String(req.file.originalname || 'adjunto').slice(0, 255),
      ruta: storagePath,
    });
    if (adjErr) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      await supabase.from('tramites').delete().eq('id', data.id);
      throw adjErr;
    }

    sendTramiteNotificationEmail({
      tramiteRow: data,
      enviadoPorEmail: req.user.email || null,
    }).catch((err) => console.error('[tramites] notify email:', err?.message || err));

    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
