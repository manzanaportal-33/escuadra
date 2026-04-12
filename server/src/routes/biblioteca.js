import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../supabase.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();
const BUCKET = 'biblioteca';
const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Solo se permiten PDF, Word (.doc/.docx) y Excel (.xls/.xlsx)'));
  },
});

function generateCode() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/** Orden: "Grado 4" … "Grado 33" por número; resto: carpetas primero y luego nombre. */
const GRADO_FILENAME_RE = /^Grado\s+(\d+)$/i;

/** Grado del perfil (0 si no numérico). */
function memberGrado(user) {
  const g = Number(user?.grado);
  return Number.isFinite(g) && g >= 0 ? g : 0;
}

function isAdminUser(user) {
  return user?.user_level === 1;
}

/**
 * Hermano: solo carpetas "Grado N" con N <= su grado. Otras carpetas y archivos: visibles en listados
 * (la carpeta padre ya fue autorizada al entrar).
 */
function filterItemsByMemberGrado(items, user) {
  if (isAdminUser(user)) return items || [];
  const g = memberGrado(user);
  return (items || []).filter((it) => {
    if (!it.is_folder) return true;
    const m = it.filename?.match(GRADO_FILENAME_RE);
    if (!m) return true;
    const n = parseInt(m[1], 10);
    return n <= g;
  });
}

/** Comprueba que en la cadena de carpetas (desde la actual hacia la raíz) ningún "Grado N" exceda el grado del usuario. */
function canAccessFolderChain(user, chain) {
  if (isAdminUser(user)) return true;
  const g = memberGrado(user);
  for (const row of chain) {
    const m = row.filename?.match(GRADO_FILENAME_RE);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > g) return false;
    }
  }
  return true;
}

/** Cadena de ancestros: [carpeta actual, padre, …, raíz]. */
async function getFolderChainFromId(folderId) {
  const chain = [];
  let id = folderId;
  const maxDepth = 40;
  let depth = 0;
  while (id != null && depth++ < maxDepth) {
    const { data: row, error } = await supabase
      .from('file')
      .select('id, filename, folder_id')
      .eq('id', id)
      .single();
    if (error || !row) break;
    chain.push(row);
    id = row.folder_id;
  }
  return chain;
}

function sortBibliotecaItems(items) {
  if (!items?.length) return items || [];
  return [...items].sort((a, b) => {
    const ma = a.filename?.match(GRADO_FILENAME_RE);
    const mb = b.filename?.match(GRADO_FILENAME_RE);
    const va = ma ? parseInt(ma[1], 10) : null;
    const vb = mb ? parseInt(mb[1], 10) : null;
    if (va !== null && vb !== null) return va - vb;
    if (va !== null && vb === null) return -1;
    if (va === null && vb !== null) return 1;
    if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1;
    return String(a.filename || '').localeCompare(String(b.filename || ''), 'es', { sensitivity: 'base' });
  });
}

router.use(authMiddleware);

// Listar categorías (carpetas raíz) desde DB
router.get('/categorias', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('file')
      .select('id, code, filename')
      .eq('is_folder', true)
      .is('folder_id', null)
      .order('filename');
    if (error) throw error;
    res.json((list || []).map((r) => ({ code: r.code, nombre: r.filename, id: r.id })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: crear carpeta (raíz o dentro de otra)
router.post('/carpetas', adminOnly, async (req, res) => {
  try {
    const { nombre, parent_id } = req.body || {};
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: 'El nombre de la carpeta es requerido' });
    }
    const code = generateCode();
    const folder_id = parent_id != null && parent_id !== '' ? parseInt(parent_id, 10) : null;
    const { data: row, error } = await supabase
      .from('file')
      .insert({
        code,
        filename: String(nombre).trim(),
        is_folder: true,
        folder_id,
        user_id: req.user.id,
      })
      .select('id, code, filename')
      .single();
    if (error) throw error;
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: subir archivo a una carpeta
router.post('/upload', adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Seleccioná un archivo (PDF, Word o Excel)' });
    }
    const folder_id = req.body?.folder_id != null ? parseInt(req.body.folder_id, 10) : null;
    const description = req.body?.description ? String(req.body.description).trim().slice(0, 255) : '';

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
    const storagePath = `${req.user.id}/${Date.now()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });
    if (uploadErr) throw uploadErr;

    const code = generateCode();
    const { data: row, error } = await supabase
      .from('file')
      .insert({
        code,
        filename: req.file.originalname,
        description: description || null,
        is_folder: false,
        folder_id,
        storage_path: storagePath,
        user_id: req.user.id,
      })
      .select('id, code, filename, description, created_at')
      .single();
    if (error) throw error;
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: eliminar archivo o carpeta (y su contenido)
async function deleteItem(id) {
  const { data: row, error: fetchErr } = await supabase
    .from('file')
    .select('id, is_folder, storage_path')
    .eq('id', id)
    .single();
  if (fetchErr || !row) throw new Error('No encontrado');

  if (row.is_folder) {
    const { data: children } = await supabase.from('file').select('id').eq('folder_id', id);
    for (const child of children || []) {
      await deleteItem(child.id);
    }
  } else if (row.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path]);
  }

  const { error: delErr } = await supabase.from('file').delete().eq('id', id);
  if (delErr) throw delErr;
}

router.delete('/item/:id', adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    await deleteItem(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// URL firmada para descargar archivo
router.get('/archivo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: row, error } = await supabase
      .from('file')
      .select('id, filename, storage_path, is_folder, folder_id')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!row || row.is_folder) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    if (!row.storage_path) {
      return res.status(404).json({ error: 'Archivo sin contenido' });
    }
    if (row.folder_id != null) {
      const chain = await getFolderChainFromId(row.folder_id);
      if (!canAccessFolderChain(req.user, chain)) {
        return res.status(403).json({ error: 'No tenés permiso para descargar este archivo según tu grado.' });
      }
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 60);
    if (signErr) throw signErr;
    if (!signed?.signedUrl) return res.status(500).json({ error: 'No se pudo generar enlace' });
    res.json({ url: signed.signedUrl, filename: row.filename });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listar contenido de una carpeta (por code) — debe ir antes de /:categoria
router.get('/carpeta/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { data: carpeta, error: e0 } = await supabase
      .from('file')
      .select('id, filename')
      .eq('code', code)
      .eq('is_folder', true)
      .maybeSingle();
    if (e0) throw e0;
    if (!carpeta) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }

    const chain = await getFolderChainFromId(carpeta.id);
    if (!canAccessFolderChain(req.user, chain)) {
      return res.status(403).json({ error: 'No tenés permiso para ver esta carpeta según tu grado.' });
    }

    const { data: items, error } = await supabase
      .from('file')
      .select('id, code, filename, description, is_folder, download_count, created_at')
      .eq('folder_id', carpeta.id)
      .order('filename');
    if (error) throw error;

    const visible = filterItemsByMemberGrado(items || [], req.user);

    res.json({
      carpeta: carpeta.filename,
      folderId: carpeta.id,
      code: code,
      items: sortBibliotecaItems(visible),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listar archivos/carpetas de una categoría (por code de carpeta raíz)
router.get('/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    const { data: raiz, error: e0 } = await supabase
      .from('file')
      .select('id')
      .eq('code', categoria)
      .eq('is_folder', true)
      .is('folder_id', null)
      .maybeSingle();
    if (e0) throw e0;
    if (!raiz) {
      return res.json([]);
    }

    const { data: items, error } = await supabase
      .from('file')
      .select('id, code, filename, description, is_folder, download_count, created_at')
      .eq('folder_id', raiz.id)
      .order('filename');
    if (error) throw error;

    const visible = filterItemsByMemberGrado(items || [], req.user);
    res.json(sortBibliotecaItems(visible));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
