import { Router } from 'express';
import { supabase } from '../supabase.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(adminOnly);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('user_groups').select('*').order('group_level');
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
