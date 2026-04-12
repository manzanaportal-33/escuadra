import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { supabase } from '../supabase.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { parseResumenEstadoCuentasFromBuffer } from '../lib/parseResumenEstadoCuentas.js';
import {
  fetchExcelBufferFromGoogleDrive,
  fetchExcelBufferFromUrl,
} from '../lib/fetchResumenExcel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** JSON generado con scripts/parse_resumen.py (raíz del repo escuadra/data/) */
const RESUMEN_ESTADO_CUENTAS_JSON = path.join(__dirname, '../../../data/resumen_estado_cuentas.json');

const router = Router();
/** Mismo bucket que biblioteca (ya permite .xls / .xlsx) */
const BUCKET = 'biblioteca';

const EXCEL_MIMES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 35 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (EXCEL_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Solo se permiten archivos Excel (.xls, .xlsx)'));
  },
});

const MAX_SHEET_ROWS = 500;
const MAX_SHEET_COLS = 48;
const MAX_CELL_LEN = 120;

function normSheetTitle(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function escRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Evita que LP1 coincida con LP14: la hoja debe empezar con la sigla y luego espacio o fin. */
function sheetStartsWithSigla(sheetName, sigla) {
  const t = String(sheetName || '').trim();
  const sig = String(sigla || '').trim();
  if (!sig) return false;
  const re = new RegExp(`^${escRe(sig)}(\\s|$)`, 'i');
  return re.test(t);
}

function pickSheetForCuerpo(availableNames, sigla, cuerpoNombre) {
  const target = normSheetTitle(`${sigla} ${cuerpoNombre}`);
  for (const n of availableNames) {
    if (normSheetTitle(n) === target) return n;
  }
  const candidates = availableNames.filter((n) => sheetStartsWithSigla(n, sigla));
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates.sort(
    (a, b) =>
      Math.abs(normSheetTitle(a).length - target.length) -
      Math.abs(normSheetTitle(b).length - target.length)
  )[0];
}

/** Sube por logia: elige solapa por sigla+nombre o, si el libro tiene una sola hoja, esa. */
function pickSheetForSingleCuerpoUpload(wb, sigla, cuerpoNombre) {
  const names = [...wb.SheetNames];
  const picked = pickSheetForCuerpo(names, sigla, cuerpoNombre);
  if (picked) return picked;
  if (names.length === 1) return names[0];
  return null;
}

async function upsertPlanillaRows(cuerpoId, sheetName, rows, sourceFilename) {
  const { error } = await supabase.from('tesoreria_cuerpo_sheet').upsert(
    {
      cuerpo_id: cuerpoId,
      sheet_name: sheetName,
      rows,
      source_filename: sourceFilename,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'cuerpo_id' }
  );
  if (error) throw error;
}

/**
 * Tras subir un Excel por cuerpo: guarda la grilla en tesoreria_cuerpo_sheet para verla en la app.
 */
async function syncPlanillaFromUploadBuffer(buffer, cuerpoId, sourceFilename) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const { data: cuerpo, error: e0 } = await supabase
    .from('cuerpo')
    .select('id, sigla, cuerpo')
    .eq('id', cuerpoId)
    .single();
  if (e0 || !cuerpo) return { ok: false, code: 'cuerpo_not_found' };
  const sheetName = pickSheetForSingleCuerpoUpload(wb, cuerpo.sigla, cuerpo.cuerpo);
  if (!sheetName) return { ok: false, code: 'no_matching_sheet' };
  const ws = wb.Sheets[sheetName];
  if (!ws) return { ok: false, code: 'empty_sheet' };
  const rows = worksheetToGrid(ws);
  await upsertPlanillaRows(cuerpoId, sheetName, rows, sourceFilename);
  return { ok: true, sheet_name: sheetName, filas: rows.length };
}

function sanitizePlanillaCell(v) {
  if (v == null || v === '') return null;
  let s;
  if (typeof v === 'number' && Number.isFinite(v)) {
    s = Number.isInteger(v) ? String(v) : String(v);
  } else if (v instanceof Date) {
    s = v.toISOString().slice(0, 10);
  } else {
    s = String(v);
  }
  s = s.replace(/\r\n/g, '\n').trim();
  if (s.length > MAX_CELL_LEN) s = `${s.slice(0, MAX_CELL_LEN - 1)}…`;
  return s || null;
}

function worksheetToGrid(ws) {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  return aoa.slice(0, MAX_SHEET_ROWS).map((row) => {
    const r = Array.isArray(row) ? row : [];
    return r.slice(0, MAX_SHEET_COLS).map(sanitizePlanillaCell);
  });
}

/** jsonb desde PostgREST suele venir como array; por si llega string u otro tipo. */
function normalizeSheetRows(raw) {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

function userCanAccessCuerpoTesoreria(user, cuerpoId) {
  if (user.user_level === 1) return true;
  const ids = Array.isArray(user.cuerpo_ids) ? user.cuerpo_ids.map(Number) : [];
  return ids.includes(Number(cuerpoId));
}

function generateCode() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/** Código carpeta raíz por cuerpo (≤12 chars; evita tesoreria-{id} que puede exceder varchar(12)) */
function folderCodeForCuerpo(cuerpoId) {
  return `ec-${cuerpoId}`;
}

async function findTesoreriaRootFolder(cuerpoId) {
  const codes = [folderCodeForCuerpo(cuerpoId)];
  const legacy = `tesoreria-${cuerpoId}`;
  if (legacy.length <= 12) codes.push(legacy);
  for (const code of codes) {
    const { data: row } = await supabase
      .from('file')
      .select('id, code, filename')
      .eq('code', code)
      .eq('is_folder', true)
      .is('folder_id', null)
      .maybeSingle();
    if (row) return row;
  }
  return null;
}

async function ensureTesoreriaRootFolder(cuerpoId, adminUserId) {
  const existing = await findTesoreriaRootFolder(cuerpoId);
  if (existing) return existing;
  const { data: cuerpo, error: e0 } = await supabase
    .from('cuerpo')
    .select('id, sigla, cuerpo')
    .eq('id', cuerpoId)
    .single();
  if (e0 || !cuerpo) throw new Error('Cuerpo no encontrado');
  const code = folderCodeForCuerpo(cuerpoId);
  const label = `Estado de cuenta – ${cuerpo.sigla || cuerpo.cuerpo}`;
  const { data: created, error } = await supabase
    .from('file')
    .insert({
      code,
      filename: label.slice(0, 255),
      is_folder: true,
      folder_id: null,
      user_id: adminUserId,
    })
    .select('id, code, filename')
    .single();
  if (error) throw error;
  return created;
}

async function getFolderChainFromId(folderId) {
  const chain = [];
  let id = folderId;
  let depth = 0;
  const maxDepth = 40;
  while (id != null && depth++ < maxDepth) {
    const { data: row, error } = await supabase
      .from('file')
      .select('id, code, filename, folder_id')
      .eq('id', id)
      .single();
    if (error || !row) break;
    chain.push(row);
    id = row.folder_id;
  }
  return chain;
}

function getCuerpoIdFromTesoreriaChain(chain) {
  for (const row of chain) {
    const m = row.code?.match(/^ec-(\d+)$/) || row.code?.match(/^tesoreria-(\d+)$/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/** Solo archivos bajo carpeta ec-{id} o tesoreria-{id} (y solo ese cuerpo para no admin). */
async function canAccessTesoreriaFile(user, fileRow) {
  if (!fileRow.folder_id || fileRow.is_folder) return false;
  const chain = await getFolderChainFromId(fileRow.folder_id);
  const cuerpo = getCuerpoIdFromTesoreriaChain(chain);
  if (cuerpo == null) return false;
  if (user.user_level === 1) return true;
  const ids = user.cuerpo_ids;
  if (Array.isArray(ids) && ids.map(Number).includes(Number(cuerpo))) return true;
  return user.cuerpo_id != null && Number(user.cuerpo_id) === cuerpo;
}

router.use(authMiddleware);

/** Planilla del Excel (solapa con el nombre del cuerpo, ej. LP14 CONCORDIA) — solo miembros con ese cuerpo. */
router.get('/planilla/:cuerpoId', async (req, res) => {
  try {
    const cuerpoId = parseInt(req.params.cuerpoId, 10);
    if (isNaN(cuerpoId)) return res.status(400).json({ error: 'ID inválido' });
    if (!userCanAccessCuerpoTesoreria(req.user, cuerpoId)) {
      return res.status(403).json({ error: 'No tenés acceso a este cuerpo.' });
    }
    const { data: row, error } = await supabase
      .from('tesoreria_cuerpo_sheet')
      .select('sheet_name, rows, updated_at')
      .eq('cuerpo_id', cuerpoId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return res.status(404).json({ error: 'No hay planilla cargada para este cuerpo.' });
    const { data: c } = await supabase.from('cuerpo').select('sigla, cuerpo').eq('id', cuerpoId).single();
    res.json({
      cuerpo_id: cuerpoId,
      sigla: c?.sigla ?? null,
      cuerpo: c?.cuerpo ?? null,
      sheet_name: row.sheet_name,
      rows: normalizeSheetRows(row.rows),
      updated_at: row.updated_at,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Descarga firmada (miembro: su cuerpo; admin: cualquier estado de cuenta)
router.get('/archivo/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const { data: row, error } = await supabase
      .from('file')
      .select('id, filename, storage_path, is_folder, folder_id')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!row || row.is_folder) return res.status(404).json({ error: 'Archivo no encontrado' });
    if (!row.storage_path) return res.status(404).json({ error: 'Archivo sin contenido' });
    const allowed = await canAccessTesoreriaFile(req.user, row);
    if (!allowed) return res.status(403).json({ error: 'No tenés permiso para descargar este archivo.' });
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 120);
    if (signErr) throw signErr;
    if (!signed?.signedUrl) return res.status(500).json({ error: 'No se pudo generar enlace' });
    res.json({ url: signed.signedUrl, filename: row.filename });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Datos de la solapa RESUMEN del Excel de estado de cuentas (admin). */
router.get('/admin/resumen-estado-cuentas', adminOnly, async (req, res) => {
  const excelUrl = process.env.RESUMEN_ESTADO_CUENTAS_EXCEL_URL?.trim();
  const driveId = process.env.RESUMEN_ESTADO_CUENTAS_GOOGLE_DRIVE_FILE_ID?.trim();

  try {
    if (excelUrl) {
      const buf = await fetchExcelBufferFromUrl(excelUrl);
      const payload = parseResumenEstadoCuentasFromBuffer(buf, excelUrl);
      return res.json(payload);
    }
    if (driveId) {
      const buf = await fetchExcelBufferFromGoogleDrive(driveId);
      const payload = parseResumenEstadoCuentasFromBuffer(buf, `google-drive:${driveId}`);
      return res.json(payload);
    }
    if (!fs.existsSync(RESUMEN_ESTADO_CUENTAS_JSON)) {
      return res.status(404).json({
        error:
          'No hay resumen cargado. Configurá en el servidor RESUMEN_ESTADO_CUENTAS_EXCEL_URL o RESUMEN_ESTADO_CUENTAS_GOOGLE_DRIVE_FILE_ID, o generá data/resumen_estado_cuentas.json con python3 scripts/parse_resumen.py',
      });
    }
    const raw = fs.readFileSync(RESUMEN_ESTADO_CUENTAS_JSON, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/cuerpos', adminOnly, async (req, res) => {
  try {
    const { data: cuerpos, error } = await supabase.from('cuerpo').select('id, sigla, cuerpo').order('sigla');
    if (error) throw error;
    const { data: sheetRows } = await supabase.from('tesoreria_cuerpo_sheet').select('cuerpo_id');
    const conPlanilla = new Set((sheetRows || []).map((r) => r.cuerpo_id));
    const out = [];
    for (const c of cuerpos || []) {
      const raiz = await findTesoreriaRootFolder(c.id);
      let archivoCount = 0;
      if (raiz) {
        const { count } = await supabase
          .from('file')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', raiz.id)
          .eq('is_folder', false);
        archivoCount = count ?? 0;
      }
      out.push({
        id: c.id,
        sigla: c.sigla,
        cuerpo: c.cuerpo,
        folder_id: raiz?.id ?? null,
        archivo_count: archivoCount,
        planilla_cargada: conPlanilla.has(c.id),
      });
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/cuerpo/:cuerpoId', adminOnly, async (req, res) => {
  try {
    const cuerpoId = parseInt(req.params.cuerpoId, 10);
    if (isNaN(cuerpoId)) return res.status(400).json({ error: 'ID inválido' });
    const { data: cuerpo, error: e1 } = await supabase
      .from('cuerpo')
      .select('id, sigla, cuerpo')
      .eq('id', cuerpoId)
      .single();
    if (e1 || !cuerpo) return res.status(404).json({ error: 'Cuerpo no encontrado' });
    const folder = await ensureTesoreriaRootFolder(cuerpoId, req.user.id);
    const { data: items, error: e2 } = await supabase
      .from('file')
      .select('id, code, filename, description, is_folder, download_count, created_at')
      .eq('folder_id', folder.id)
      .eq('is_folder', false)
      .order('created_at', { ascending: false });
    if (e2) throw e2;
    res.json({
      cuerpo: cuerpo.cuerpo,
      sigla: cuerpo.sigla,
      folder_id: folder.id,
      items: items || [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Sube el libro Excel completo (Estado de cuentas): cada solapa cuyo nombre coincide con un cuerpo
 * (ej. "LP14 CONCORDIA") se guarda para que los hermanos de ese cuerpo la vean en Tesorería.
 */
router.post('/admin/import-libro-planillas', adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Seleccioná un archivo Excel (.xlsx)' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const allNames = [...wb.SheetNames];
    const { data: cuerpos, error } = await supabase.from('cuerpo').select('id, sigla, cuerpo').order('sigla');
    if (error) throw error;
    const used = new Set();
    const imported = [];
    const not_found = [];
    const origName = String(req.file.originalname || 'libro.xlsx').slice(0, 255);
    for (const c of cuerpos || []) {
      const avail = allNames.filter((n) => !used.has(n));
      const sheetName = pickSheetForCuerpo(avail, c.sigla, c.cuerpo);
      if (!sheetName) {
        not_found.push({ cuerpo_id: c.id, sigla: c.sigla, cuerpo: c.cuerpo });
        continue;
      }
      used.add(sheetName);
      const ws = wb.Sheets[sheetName];
      if (!ws) {
        not_found.push({ cuerpo_id: c.id, sigla: c.sigla, cuerpo: c.cuerpo, reason: 'hoja vacía' });
        continue;
      }
      const rows = worksheetToGrid(ws);
      await upsertPlanillaRows(c.id, sheetName, rows, origName);
      imported.push({ cuerpo_id: c.id, sigla: c.sigla, sheet_name: sheetName, filas: rows.length });
    }
    res.json({
      ok: true,
      source_filename: origName,
      sheets_en_archivo: allNames.length,
      importadas: imported.length,
      imported,
      sin_hoja: not_found,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/upload', adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Seleccioná un archivo Excel (.xls o .xlsx)' });
    }
    const cuerpoId = req.body?.cuerpo_id != null ? parseInt(req.body.cuerpo_id, 10) : NaN;
    if (isNaN(cuerpoId)) return res.status(400).json({ error: 'cuerpo_id es requerido' });
    const description = req.body?.description ? String(req.body.description).trim().slice(0, 255) : '';
    const folder = await ensureTesoreriaRootFolder(cuerpoId, req.user.id);
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const storagePath = `tesoreria/${cuerpoId}/${Date.now()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });
    if (uploadErr) throw uploadErr;
    const code = generateCode();
    const { data: row, error: insErr } = await supabase
      .from('file')
      .insert({
        code,
        filename: req.file.originalname,
        description: description || null,
        is_folder: false,
        folder_id: folder.id,
        storage_path: storagePath,
        user_id: req.user.id,
      })
      .select('id, code, filename, description, created_at')
      .single();
    if (insErr) throw insErr;
    let planilla_sync = null;
    try {
      planilla_sync = await syncPlanillaFromUploadBuffer(
        req.file.buffer,
        cuerpoId,
        req.file.originalname?.slice(0, 255) || 'upload.xlsx'
      );
    } catch (syncErr) {
      planilla_sync = { ok: false, code: 'parse_error', message: syncErr.message };
    }
    res.status(201).json({ ...row, planilla_sync });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/admin/item/:id', adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const { data: row, error } = await supabase
      .from('file')
      .select('id, is_folder, storage_path, folder_id')
      .eq('id', id)
      .single();
    if (error || !row) return res.status(404).json({ error: 'No encontrado' });
    if (row.is_folder) return res.status(400).json({ error: 'No se puede eliminar una carpeta desde aquí' });
    const chain = await getFolderChainFromId(row.folder_id);
    if (getCuerpoIdFromTesoreriaChain(chain) == null) {
      return res.status(400).json({ error: 'Este archivo no pertenece a estados de cuenta' });
    }
    if (row.storage_path) {
      await supabase.storage.from(BUCKET).remove([row.storage_path]);
    }
    await supabase.from('file').delete().eq('id', id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Miembro: planillas por cuerpo (embed_planilla=1 incluye filas para ver en pantalla)
router.get('/', async (req, res) => {
  try {
    const rawEmb = req.query.embed_planilla;
    const embedPlanilla =
      rawEmb === '1' ||
      String(Array.isArray(rawEmb) ? rawEmb[0] : rawEmb).toLowerCase() === 'true';
    const userId = req.user.id;
    const { data: pcRows, error: e0 } = await supabase
      .from('profile_cuerpo')
      .select('cuerpo_id, cuerpo(id, cuerpo, sigla)')
      .eq('profile_id', userId);
    if (e0) throw e0;

    const blocks = [];
    const ids = (pcRows || []).map((r) => r.cuerpo?.id).filter(Boolean);
    let planillaMap = new Map();
    if (ids.length) {
      const selectCols = embedPlanilla
        ? 'cuerpo_id, sheet_name, updated_at, rows'
        : 'cuerpo_id, sheet_name, updated_at';
      const { data: sheets, error: sheetsErr } = await supabase
        .from('tesoreria_cuerpo_sheet')
        .select(selectCols)
        .in('cuerpo_id', ids);
      if (sheetsErr) {
        console.error('[tesoreria GET /] tesoreria_cuerpo_sheet:', sheetsErr.message);
        throw sheetsErr;
      }
      planillaMap = new Map((sheets || []).map((s) => [Number(s.cuerpo_id), s]));
    }
    for (const row of pcRows || []) {
      const c = row.cuerpo;
      if (!c?.id) continue;
      const pl = planillaMap.get(Number(c.id));
      let items = [];
      if (!embedPlanilla) {
        const raiz = await findTesoreriaRootFolder(c.id);
        if (raiz) {
          const { data: list, error: e3 } = await supabase
            .from('file')
            .select('id, code, filename, description, is_folder, download_count, created_at')
            .eq('folder_id', raiz.id)
            .eq('is_folder', false)
            .order('created_at', { ascending: false });
          if (!e3) items = list || [];
        }
      }
      const planillaPayload = pl
        ? embedPlanilla
          ? {
              sheet_name: pl.sheet_name,
              updated_at: pl.updated_at,
              rows: normalizeSheetRows(pl.rows),
            }
          : { sheet_name: pl.sheet_name, updated_at: pl.updated_at }
        : null;
      blocks.push({
        cuerpo_id: c.id,
        cuerpo: c.cuerpo,
        sigla: c.sigla,
        items,
        planilla: planillaPayload,
      });
    }

    blocks.sort((a, b) => String(a.sigla || a.cuerpo || '').localeCompare(String(b.sigla || b.cuerpo || ''), 'es'));
    res.json({ blocks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
