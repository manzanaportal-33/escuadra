import { Router } from 'express';
import { supabase } from '../supabase.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

/** Sin observaciones para hermanos; admin ve todo. */
function cuerpoSelectForUser(user) {
  return user?.user_level === 1
    ? '*'
    : 'id, sigla, cuerpo, localidad, trabajos, status, folder, presidente, secretario, tesorero';
}

/** Catálogo de cuerpos: cualquier hermano autenticado (solo lectura). */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cuerpo')
      .select(cuerpoSelectForUser(req.user))
      .order('sigla');
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cuerpo')
      .select(cuerpoSelectForUser(req.user))
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Cuerpo no encontrado' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { sigla, cuerpo, localidad, trabajos, observaciones, folder, presidente, secretario, tesorero } = req.body;
    if (!sigla || !cuerpo) {
      return res.status(400).json({ error: 'Sigla y cuerpo son requeridos' });
    }
    const { data, error } = await supabase
      .from('cuerpo')
      .insert({
        sigla,
        cuerpo,
        localidad: localidad || '',
        trabajos: trabajos || '',
        observaciones: observaciones || '',
        status: 1,
        folder: folder || null,
        presidente: presidente || null,
        secretario: secretario || null,
        tesorero: tesorero || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    res.status(201).json({ id: data.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { sigla, cuerpo, localidad, trabajos, observaciones, status, folder, presidente, secretario, tesorero } = req.body;
    const updates = {};
    if (sigla !== undefined) updates.sigla = sigla;
    if (cuerpo !== undefined) updates.cuerpo = cuerpo;
    if (localidad !== undefined) updates.localidad = localidad;
    if (trabajos !== undefined) updates.trabajos = trabajos;
    if (observaciones !== undefined) updates.observaciones = observaciones;
    if (status !== undefined) updates.status = status ?? 1;
    if (folder !== undefined) updates.folder = folder;
    if (presidente !== undefined) updates.presidente = presidente;
    if (secretario !== undefined) updates.secretario = secretario;
    if (tesorero !== undefined) updates.tesorero = tesorero;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }
    const { error } = await supabase.from('cuerpo').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { error } = await supabase.from('cuerpo').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
