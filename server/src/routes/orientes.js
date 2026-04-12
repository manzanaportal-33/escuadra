import { Router } from 'express';
import { supabase } from '../supabase.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(adminOnly);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('otros_orientes').select('*').order('id');
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('otros_orientes').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Oriente no encontrado' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { pais, web, direccion, mail_institucional, telefono, soberano } = req.body;
    if (!pais) return res.status(400).json({ error: 'País es requerido' });
    const { data, error } = await supabase
      .from('otros_orientes')
      .insert({
        pais,
        web: web || null,
        direccion: direccion || null,
        mail_institucional: mail_institucional || null,
        telefono: telefono || null,
        soberano: soberano || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    res.status(201).json({ id: data.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { pais, web, direccion, mail_institucional, telefono, soberano } = req.body;
    const { error } = await supabase
      .from('otros_orientes')
      .update({ pais, web, direccion, mail_institucional, telefono, soberano })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('otros_orientes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
