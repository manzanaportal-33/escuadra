import { Router } from 'express';
import { supabase } from '../supabase.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();
const MAX_MENSAJE = 8000;
const MAX_RESPUESTA = 12000;

/** Map<userId uuid string, string[]> etiquetas "SIGLA – nombre" por cada cuerpo del perfil */
async function buildCuerposLabelsByUserIds(userIds) {
  const map = new Map();
  const ids = [...new Set((userIds || []).filter(Boolean).map((u) => String(u)))];
  if (!ids.length) return map;

  const { data: pcs, error: e1 } = await supabase
    .from('profile_cuerpo')
    .select('profile_id, cuerpo_id')
    .in('profile_id', ids);
  if (e1) throw e1;

  const cuerpoIds = [...new Set((pcs || []).map((p) => p.cuerpo_id).filter((x) => x != null))];
  const cuerpoById = new Map();
  if (cuerpoIds.length) {
    const { data: cuerpos, error: e2 } = await supabase
      .from('cuerpo')
      .select('id, sigla, cuerpo')
      .in('id', cuerpoIds);
    if (e2) throw e2;
    for (const c of cuerpos || []) cuerpoById.set(Number(c.id), c);
  }

  for (const pc of pcs || []) {
    const uid = String(pc.profile_id);
    const c = cuerpoById.get(Number(pc.cuerpo_id));
    const label = c ? `${String(c.sigla || '').trim()} – ${String(c.cuerpo || '').trim()}`.trim() : null;
    if (!map.has(uid)) map.set(uid, []);
    if (label) map.get(uid).push(label);
  }
  return map;
}

function attachCuerposEtiqueta(rows, labelMap) {
  return rows.map((r) => {
    const uid = r.user_id != null ? String(r.user_id) : null;
    const list = uid != null ? labelMap.get(uid) : null;
    const cuerpos_etiqueta = list && list.length ? list.join(' · ') : null;
    return { ...r, cuerpos_etiqueta };
  });
}

async function enrichContactoRowsForAdmin(rows) {
  if (!rows?.length) return rows || [];
  const labelMap = await buildCuerposLabelsByUserIds(rows.map((r) => r.user_id));
  return attachCuerposEtiqueta(rows, labelMap);
}

router.use(authMiddleware);

/** Hermano (cualquier usuario logueado): enviar mensaje */
router.post('/', async (req, res) => {
  try {
    const { nombre, apellido, email, mensaje } = req.body || {};
    const n = nombre != null ? String(nombre).trim() : '';
    const a = apellido != null ? String(apellido).trim() : '';
    const e = email != null ? String(email).trim().toLowerCase() : '';
    const m = mensaje != null ? String(mensaje).trim() : '';
    if (!n || !a) return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return res.status(400).json({ error: 'Ingresá un correo electrónico válido' });
    }
    if (!m) return res.status(400).json({ error: 'Escribí tu mensaje' });
    if (m.length > MAX_MENSAJE) {
      return res.status(400).json({ error: `El mensaje no puede superar ${MAX_MENSAJE} caracteres` });
    }

    const { data, error } = await supabase
      .from('contacto_mensaje')
      .insert({
        user_id: req.user.id,
        nombre: n.slice(0, 120),
        apellido: a.slice(0, 120),
        email: e.slice(0, 255),
        mensaje: m,
        estado: 'nuevo',
      })
      .select('id, created_at')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Hermano: sus propios mensajes (estado y vista previa) */
router.get('/mios', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacto_mensaje')
      .select('id, estado, created_at, responded_at, mensaje')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const rows = (data || []).map(({ mensaje: full, estado, ...rest }) => {
      const prev =
        full && full.length > 200 ? `${String(full).slice(0, 200)}\u2026` : String(full || '');
      return {
        ...rest,
        estado,
        mensaje_preview: prev,
        tiene_respuesta: estado === 'respondido',
      };
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Hermano: detalle de un mensaje propio (incluye respuesta si existe) */
router.get('/mios/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const { data, error } = await supabase
      .from('contacto_mensaje')
      .select(
        'id, nombre, apellido, email, mensaje, estado, respuesta, responded_at, created_at'
      )
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'No encontrado' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Admin: listado con filtro opcional ?estado=nuevo|respondido */
router.get('/admin', adminOnly, async (req, res) => {
  try {
    const estado = req.query.estado;
    let q = supabase
      .from('contacto_mensaje')
      .select('id, user_id, nombre, apellido, email, estado, created_at, responded_at, mensaje')
      .order('created_at', { ascending: false });
    if (estado === 'nuevo' || estado === 'respondido') {
      q = q.eq('estado', estado);
    }
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data || []).map(({ mensaje: full, ...rest }) => {
      const prev =
        full && full.length > 200 ? `${String(full).slice(0, 200)}\u2026` : String(full || '');
      return { ...rest, mensaje_preview: prev };
    });
    const enriched = await enrichContactoRowsForAdmin(rows);
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Admin: detalle */
router.get('/admin/:id', adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const { data, error } = await supabase.from('contacto_mensaje').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    const [enriched] = await enrichContactoRowsForAdmin([data]);
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Admin: contestar (o actualizar respuesta) */
router.patch('/admin/:id', adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const { respuesta } = req.body || {};
    const r = respuesta != null ? String(respuesta).trim() : '';
    if (!r) return res.status(400).json({ error: 'La respuesta es obligatoria' });
    if (r.length > MAX_RESPUESTA) {
      return res.status(400).json({ error: `La respuesta no puede superar ${MAX_RESPUESTA} caracteres` });
    }

    const { data, error } = await supabase
      .from('contacto_mensaje')
      .update({
        respuesta: r,
        estado: 'respondido',
        responded_at: new Date().toISOString(),
        responded_by: req.user.id,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    const [enriched] = await enrichContactoRowsForAdmin([data]);
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
