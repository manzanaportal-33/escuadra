import { Router } from 'express';
import { supabase } from '../supabase.js';
import { changePassword } from '../auth.js';
import { authMiddleware, adminOnly, superAdminOnly } from '../middleware/auth.js';

const router = Router();

/** Reemplaza los cuerpos asignados al perfil (solo si `cuerpoIds` es un array). */
async function syncProfileCuerpos(profileId, cuerpoIds) {
  if (!Array.isArray(cuerpoIds)) return;
  const ids = [...new Set(cuerpoIds.map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n) && n > 0))];
  const { error: delErr } = await supabase.from('profile_cuerpo').delete().eq('profile_id', profileId);
  if (delErr) throw delErr;
  if (ids.length === 0) return;
  const { data: validRows, error: vErr } = await supabase.from('cuerpo').select('id').in('id', ids);
  if (vErr) throw vErr;
  const valid = new Set((validRows || []).map((r) => r.id));
  const rows = ids.filter((cid) => valid.has(cid)).map((cuerpo_id) => ({ profile_id: profileId, cuerpo_id }));
  if (rows.length === 0) return;
  const { error: insErr } = await supabase.from('profile_cuerpo').insert(rows);
  if (insErr) throw insErr;
}

async function mapCuerposByProfileIds(profileIds) {
  const map = new Map();
  if (!profileIds.length) return map;
  const { data: rows, error } = await supabase
    .from('profile_cuerpo')
    .select('profile_id, cuerpo(id, sigla, cuerpo)')
    .in('profile_id', profileIds);
  if (error) throw error;
  for (const r of rows || []) {
    const c = r.cuerpo;
    if (!c) continue;
    const list = map.get(r.profile_id) || [];
    list.push({ id: c.id, sigla: c.sigla, nombre: c.cuerpo });
    map.set(r.profile_id, list);
  }
  return map;
}

router.use(authMiddleware);

/** Listas para filtros (pocas filas) */
router.get('/meta', adminOnly, async (req, res) => {
  try {
    const [{ data: groups, error: eg }, { data: cuerpos, error: ec }] = await Promise.all([
      supabase.from('user_groups').select('group_level, group_name').order('group_level'),
      supabase.from('cuerpo').select('id, cuerpo, sigla').order('sigla'),
    ]);
    if (eg) throw eg;
    if (ec) throw ec;
    res.json({
      groups: (groups || []).map((g) => ({ level: g.group_level, name: g.group_name })),
      cuerpos: cuerpos || [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Registro de logins (IP, navegador). Solo superadmin; datos en tabla access_log. */
router.get('/access-log', superAdminOnly, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 50));
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
      .from('access_log')
      .select('id, created_at, user_id, email, event_type, ip, user_agent, path', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    res.json({
      items: data || [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function escapeIlike(s) {
  return String(s).replace(/[%_]/g, '');
}

const PROFILE_FIELDS_LIST =
  'id, name, apellido, user_level, grado, grado_troncal, direccion, telefono, profesion, hist_grado, observaciones, obs_scg33, detalle, exencion, fechas_cuotas, status, last_login';

const PROFILE_FIELDS_ME =
  'id, name, apellido, user_level, grado, grado_troncal, direccion, telefono, profesion, hist_grado, observaciones, obs_scg33, detalle, exencion, fechas_cuotas, image, is_superadmin';

const PROFILE_FIELDS_ONE =
  'id, name, apellido, user_level, grado, grado_troncal, direccion, telefono, profesion, hist_grado, observaciones, obs_scg33, detalle, exencion, fechas_cuotas, status';

/** undefined = omitir; null = borrar en BD */
function optionalSmallInt(v) {
  if (v === undefined) return undefined;
  if (v === null || String(v).trim() === '') return null;
  const n = parseInt(String(v).trim(), 10);
  if (!Number.isInteger(n) || n < 0 || n > 32767) return null;
  return n;
}

/** null = vacío; undefined = no tocar (si se usa solo en PUT con presencia de clave) */
function normalizeFechasCuotas(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  let obj = v;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return null;
    try {
      obj = JSON.parse(t);
    } catch {
      return null;
    }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null;
  const out = {};
  for (const [k, val] of Object.entries(obj)) {
    const s = String(val ?? '').trim();
    if (s && s !== '-') out[String(k)] = s;
  }
  return Object.keys(out).length ? out : null;
}

router.get('/', adminOnly, async (req, res) => {
  try {
    const q = escapeIlike(req.query.q || '').trim().slice(0, 120);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 50));

    const userLevelRaw = req.query.user_level;
    const userLevel =
      userLevelRaw != null && userLevelRaw !== '' ? parseInt(userLevelRaw, 10) : null;

    const cuerpoRaw = req.query.cuerpo_id;
    const sinCuerpo = cuerpoRaw === 'none' || cuerpoRaw === 'sin';
    const cuerpoId =
      !sinCuerpo && cuerpoRaw != null && cuerpoRaw !== '' ? parseInt(cuerpoRaw, 10) : null;

    const gradoRaw = req.query.grado;
    const grado = gradoRaw != null && gradoRaw !== '' ? parseInt(gradoRaw, 10) : null;

    const soloActivos = req.query.solo_activos !== '0' && req.query.solo_activos !== 'false';

    let query = supabase.from('profiles').select(PROFILE_FIELDS_LIST, { count: 'exact' });

    if (q) {
      const pat = `%${q}%`;
      query = query.or(`name.ilike.${pat},apellido.ilike.${pat}`);
    }
    if (userLevel != null && !Number.isNaN(userLevel)) {
      query = query.eq('user_level', userLevel);
    }

    if (sinCuerpo) {
      const { data: pcRows } = await supabase.from('profile_cuerpo').select('profile_id');
      const withC = [...new Set((pcRows || []).map((r) => r.profile_id))];
      if (withC.length > 0) {
        query = query.not('id', 'in', `(${withC.map((id) => `"${id}"`).join(',')})`);
      }
    } else if (cuerpoId != null && !Number.isNaN(cuerpoId)) {
      const { data: links } = await supabase.from('profile_cuerpo').select('profile_id').eq('cuerpo_id', cuerpoId);
      const pids = [...new Set((links || []).map((l) => l.profile_id))];
      if (pids.length === 0) {
        return res.json({
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
        });
      }
      query = query.in('id', pids);
    }

    if (grado != null && !Number.isNaN(grado)) {
      query = query.eq('grado', grado);
    }
    if (soloActivos) {
      query = query.eq('status', 1);
    }

    const offset = (page - 1) * limit;
    query = query.order('apellido', { ascending: true }).order('name', { ascending: true }).range(offset, offset + limit - 1);

    const { data: profiles, error: e1, count } = await query;
    if (e1) throw e1;

    const { data: groups } = await supabase.from('user_groups').select('group_level, group_name');
    const groupMap = new Map((groups || []).map((g) => [g.group_level, g.group_name]));

    const profileIds = (profiles || []).map((p) => p.id);
    let cuerposByProfile = new Map();
    try {
      cuerposByProfile = await mapCuerposByProfileIds(profileIds);
    } catch (e) {
      console.error('[users] profile_cuerpo en listado:', e?.message || e);
    }

    const items = (profiles || []).map((p) => {
      const list = cuerposByProfile.get(p.id) || [];
      const siglas = list.map((c) => c.sigla).filter(Boolean);
      const nombres = list.map((c) => c.nombre).filter(Boolean);
      return {
        ...p,
        group_name: groupMap.get(p.user_level),
        cuerpo_sigla: siglas.length ? siglas.join(', ') : '',
        cuerpo: nombres.length ? nombres.join(', ') : '',
      };
    });

    const total = count ?? 0;
    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS_ME)
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    if (!profile) return res.status(404).json({ error: 'Usuario no encontrado' });

    let group_name = null;
    if (profile.user_level) {
      const { data: g } = await supabase.from('user_groups').select('group_name').eq('group_level', profile.user_level).single();
      group_name = g?.group_name;
    }

    const { data: pcRows } = await supabase
      .from('profile_cuerpo')
      .select('cuerpo_id, cuerpo(id, sigla, cuerpo)')
      .eq('profile_id', req.user.id);
    const cuerpos = (pcRows || []).map((r) => r.cuerpo).filter(Boolean);
    const cuerpo_ids = [...new Set((pcRows || []).map((r) => r.cuerpo_id))];
    const first = cuerpos[0];

    res.json({
      ...profile,
      email: req.user.email,
      group_name,
      cuerpo_nombre: first?.cuerpo ?? null,
      cuerpo_sigla: first?.sigla ?? null,
      cuerpos,
      cuerpo_ids,
      cuerpo_id: cuerpo_ids[0] ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Cambio de contraseña (usuario autenticado: contraseña actual + nueva). */
router.post('/me/password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    const email = req.user.email;
    if (!email) {
      return res.status(400).json({ error: 'No se pudo obtener el email del usuario' });
    }
    const result = await changePassword(req.user.id, email, current_password, new_password);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear hermano (admin): crea usuario en Auth + actualiza perfil
router.post('/', adminOnly, async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      apellido,
      user_level,
      cuerpo_ids,
      grado,
      grado_troncal,
      telefono,
      profesion,
      direccion,
      hist_grado,
      observaciones,
      obs_scg33,
      detalle,
      exencion,
      fechas_cuotas,
    } = req.body || {};

    const emailTrim = (email || '').trim().toLowerCase();
    if (!emailTrim) return res.status(400).json({ error: 'Email es requerido' });
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (!name || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }

    const userLevel = user_level != null ? parseInt(user_level, 10) : 3;
    const gradoNum = grado != null ? parseInt(grado, 10) : 0;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emailTrim,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        name: String(name).trim(),
        apellido: String(apellido).trim(),
        user_level: userLevel,
        grado: gradoNum,
      },
    });

    if (authError) {
      if (authError.message && /already registered|already exists/i.test(authError.message)) {
        return res.status(400).json({ error: 'Ese email ya está registrado' });
      }
      throw authError;
    }
    if (!authData?.user) {
      return res.status(500).json({ error: 'No se pudo crear el usuario' });
    }

    const profileUpdates = {};
    if (telefono != null) profileUpdates.telefono = String(telefono).trim() || null;
    if (profesion != null) profileUpdates.profesion = String(profesion).trim() || null;
    if (direccion != null) profileUpdates.direccion = String(direccion).trim() || null;
    if (hist_grado != null) profileUpdates.hist_grado = String(hist_grado).trim() || null;
    if (observaciones != null) profileUpdates.observaciones = String(observaciones).trim() || null;
    if (obs_scg33 != null) profileUpdates.obs_scg33 = String(obs_scg33).trim() || null;
    if (detalle != null) profileUpdates.detalle = String(detalle).trim() || null;
    if (exencion != null) profileUpdates.exencion = String(exencion).trim() || null;
    const gt = optionalSmallInt(grado_troncal);
    if (gt !== undefined) profileUpdates.grado_troncal = gt;
    const fc = normalizeFechasCuotas(fechas_cuotas);
    if (fc !== undefined) profileUpdates.fechas_cuotas = fc;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', authData.user.id);
      if (updateError) console.error('Error actualizando perfil:', updateError);
    }

    try {
      await syncProfileCuerpos(authData.user.id, cuerpo_ids);
    } catch (e) {
      console.error('Error asignando cuerpos:', e);
    }

    res.status(201).json({
      id: authData.user.id,
      email: authData.user.email,
      name: String(name).trim(),
      apellido: String(apellido).trim(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Obtener un hermano por id (admin, para editar)
router.get('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS_ONE)
      .eq('id', id)
      .single();
    if (profileError) throw profileError;
    if (!profile) return res.status(404).json({ error: 'Hermano no encontrado' });

    const { data: authUser } = await supabase.auth.admin.getUserById(id);
    const email = authUser?.user?.email || null;
    const { data: g } = await supabase.from('user_groups').select('group_name').eq('group_level', profile.user_level).single();

    const { data: pcRows } = await supabase
      .from('profile_cuerpo')
      .select('cuerpo_id, cuerpo(id, sigla, cuerpo)')
      .eq('profile_id', id);
    const cuerpos = (pcRows || []).map((r) => r.cuerpo).filter(Boolean);
    const cuerpo_ids = [...new Set((pcRows || []).map((r) => r.cuerpo_id))];

    res.json({
      ...profile,
      email,
      group_name: g?.group_name,
      cuerpos,
      cuerpo_ids,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualizar hermano (admin)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      apellido,
      user_level,
      cuerpo_ids,
      grado,
      grado_troncal,
      telefono,
      profesion,
      direccion,
      hist_grado,
      observaciones,
      obs_scg33,
      detalle,
      exencion,
      fechas_cuotas,
      new_password,
    } = req.body || {};
    const body = req.body || {};

    const { data: existing } = await supabase.from('profiles').select('id').eq('id', id).single();
    if (!existing) return res.status(404).json({ error: 'Hermano no encontrado' });

    if (!name || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }

    const profileUpdates = {
      name: String(name).trim(),
      apellido: String(apellido).trim(),
    };
    if (user_level != null) profileUpdates.user_level = parseInt(user_level, 10);
    if (grado != null) profileUpdates.grado = grado === '' ? null : parseInt(grado, 10);
    if (telefono != null) profileUpdates.telefono = String(telefono).trim() || null;
    if (profesion != null) profileUpdates.profesion = String(profesion).trim() || null;
    if (direccion != null) profileUpdates.direccion = String(direccion).trim() || null;
    if (hist_grado != null) profileUpdates.hist_grado = String(hist_grado).trim() || null;
    if (observaciones != null) profileUpdates.observaciones = String(observaciones).trim() || null;
    if ('obs_scg33' in body) {
      profileUpdates.obs_scg33 =
        obs_scg33 == null || String(obs_scg33 ?? '').trim() === '' ? null : String(obs_scg33).trim();
    }
    if ('detalle' in body) {
      profileUpdates.detalle =
        detalle == null || String(detalle ?? '').trim() === '' ? null : String(detalle).trim();
    }
    if ('exencion' in body) {
      profileUpdates.exencion =
        exencion == null || String(exencion ?? '').trim() === '' ? null : String(exencion).trim();
    }
    const gtUp = optionalSmallInt(grado_troncal);
    if (gtUp !== undefined) profileUpdates.grado_troncal = gtUp;
    if (fechas_cuotas !== undefined) {
      profileUpdates.fechas_cuotas = normalizeFechasCuotas(fechas_cuotas);
    }

    const { error: updateError } = await supabase.from('profiles').update(profileUpdates).eq('id', id);
    if (updateError) throw updateError;

    if (new_password && String(new_password).length >= 6) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(id, { password: String(new_password) });
      if (pwError) console.error('Error actualizando contraseña:', pwError);
    }

    if (Array.isArray(cuerpo_ids)) {
      await syncProfileCuerpos(id, cuerpo_ids);
    }

    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
