#!/usr/bin/env node
/**
 * Import masivo desde data/lista_hh_import.json (generado con scripts/parse_lista_hh.py).
 *
 * Requiere: migración profiles_lista_hh aplicada + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en server/.env
 *
 * Uso (desde la carpeta api):
 *   node scripts/import_lista_hh.mjs [ruta/al.json]
 *
 * Opciones:
 *   --dry-run              Solo muestra qué haría, sin crear ni actualizar
 *   --update-existing      Si el email ya existe, actualiza perfil + cuerpos (no crea otro usuario)
 *   --password "clave"     Contraseña inicial para usuarios nuevos (o variable IMPORT_DEFAULT_PASSWORD)
 *   --start 0              Índice inicial en el array rows (para reanudar)
 *   --limit 50             Máximo de filas a procesar
 *
 * Cuerpos: asigna profile_cuerpo usando siglas (CUERPO1–5) y, si hace falta, coincidencia de
 * la línea completa "SIGLA NOMBRE" con la tabla public.cuerpo. Ejecutá antes el seed de cuerpos.
 *
 * Ejemplo prueba:
 *   node scripts/import_lista_hh.mjs --dry-run --limit 5
 *   node scripts/import_lista_hh.mjs --password "Cambiar123!" --limit 10
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(apiRoot, '..');
const defaultJsonPath = path.join(repoRoot, 'data', 'lista_hh_import.json');

function parseArgs(argv) {
  let dryRun = false;
  let updateExisting = false;
  let password = process.env.IMPORT_DEFAULT_PASSWORD || '';
  let jsonPath = null;
  let limit = Infinity;
  let start = 0;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--update-existing') updateExisting = true;
    else if (a === '--password') password = argv[++i] || '';
    else if (a === '--limit') limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (a === '--start') start = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (!a.startsWith('-')) jsonPath = a;
  }
  return { dryRun, updateExisting, password, jsonPath, limit, start };
}

function trunc(s, n) {
  if (s == null) return '';
  const t = String(s).trim();
  return t.length <= n ? t : t.slice(0, n);
}

async function loadExistingEmails(supabase) {
  const map = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email) map.set(u.email.toLowerCase(), u.id);
    }
    if (!data.users.length || data.users.length < 1000) break;
    page += 1;
  }
  return map;
}

function normCuerpoLine(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;]/g, '');
}

/** LP67, CAP01, GIG05, etc. (incluye variantes en medio del texto) */
const SIGLA_IN_TEXT = /\b([A-Za-z]{2,4}\d{1,3})\b/g;

async function loadCuerpoMaps(supabase) {
  const { data, error } = await supabase.from('cuerpo').select('id, sigla, cuerpo');
  if (error) throw error;
  const bySigla = new Map();
  const lineToId = new Map();

  for (const r of data || []) {
    const sig = String(r.sigla || '').trim().toUpperCase();
    if (sig) bySigla.set(sig, r.id);
    const lineKey = normCuerpoLine(`${r.sigla || ''} ${r.cuerpo || ''}`);
    if (lineKey) lineToId.set(lineKey, r.id);
  }

  return { bySigla, lineToId };
}

function collectSiglasFromRow(row) {
  const ordered = [];
  const seen = new Set();
  const add = (s) => {
    const k = String(s || '').trim().toUpperCase();
    if (!k || seen.has(k)) return;
    seen.add(k);
    ordered.push(k);
  };

  for (const s of row.cuerpos_sigla_sugeridas || []) add(s);

  for (const key of ['cuerpo1', 'cuerpo2', 'cuerpo3', 'cuerpo4', 'cuerpo5']) {
    const t = row[key];
    if (t == null || typeof t !== 'string') continue;
    const text = t.trim();
    if (!text || text === '-') continue;
    const first = text.split(/\s+/)[0];
    if (first) add(first);
    let m;
    const re = new RegExp(SIGLA_IN_TEXT.source, 'gi');
    while ((m = re.exec(text)) !== null) add(m[1]);
  }
  return ordered;
}

async function loadValidUserLevels(supabase) {
  const { data, error } = await supabase.from('user_groups').select('group_level');
  if (error) throw error;
  return new Set((data || []).map((r) => r.group_level));
}

function resolveCuerpoIds(row, bySigla, lineToId) {
  const siglas = collectSiglasFromRow(row);
  const ids = [];
  const unknown = [];
  for (const s of siglas) {
    const k = String(s || '').trim().toUpperCase();
    if (!k) continue;
    const id = bySigla.get(k);
    if (id != null) ids.push(id);
    else unknown.push(k);
  }

  for (const key of ['cuerpo1', 'cuerpo2', 'cuerpo3', 'cuerpo4', 'cuerpo5']) {
    const t = row[key];
    if (t == null || typeof t !== 'string') continue;
    const text = t.trim();
    if (!text || text === '-') continue;
    const lineKey = normCuerpoLine(text);
    const id = lineToId.get(lineKey);
    if (id != null) ids.push(id);
  }

  return { ids: [...new Set(ids)], unknown };
}

async function syncProfileCuerpos(supabase, profileId, cuerpoIds) {
  const { error: delErr } = await supabase.from('profile_cuerpo').delete().eq('profile_id', profileId);
  if (delErr) throw delErr;
  if (!cuerpoIds.length) return;
  const rows = cuerpoIds.map((cuerpo_id) => ({ profile_id: profileId, cuerpo_id }));
  const { error: insErr } = await supabase.from('profile_cuerpo').insert(rows);
  if (insErr) throw insErr;
}

async function upsertProfileExtras(supabase, userId, row, userLevel) {
  const payload = {
    name: trunc(row.nombre, 60) || '—',
    apellido: trunc(row.apellido, 60) || '—',
    user_level: userLevel,
    grado: Number.isInteger(row.grado) ? row.grado : parseInt(row.grado, 10) || 0,
    grado_troncal:
      row.grado_troncal == null || row.grado_troncal === ''
        ? null
        : parseInt(row.grado_troncal, 10) || null,
    obs_scg33: row.obs_scg33 ? trunc(row.obs_scg33, 255) : null,
    detalle: row.detalle ? String(row.detalle).trim() || null : null,
    exencion: row.exencion ? trunc(row.exencion, 120) : null,
    fechas_cuotas: row.fechas_cuotas && typeof row.fechas_cuotas === 'object' ? row.fechas_cuotas : null,
  };
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) throw error;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const jsonPath = path.resolve(args.jsonPath || defaultJsonPath);

  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (server/.env).');
    process.exit(1);
  }

  if (!args.dryRun && !args.password && !args.updateExisting) {
    console.error('Para crear usuarios nuevos: --password "..." o IMPORT_DEFAULT_PASSWORD en server/.env');
    console.error('Solo dry-run no requiere contraseña. Con --update-existing podés omitir contraseña (solo actualiza existentes; filas nuevas se omiten).');
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`No existe el JSON: ${jsonPath}`);
    console.error('Generalo con: python3 scripts/parse_lista_hh.py "/ruta/al.xlsx"');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const rows = Array.isArray(raw.rows) ? raw.rows : [];
  const slice = rows.slice(args.start, args.start + args.limit);

  console.log(`Archivo: ${jsonPath}`);
  console.log(`Filas en JSON: ${rows.length} | Procesando desde ${args.start}, cantidad: ${slice.length}`);
  console.log(`Modo: ${args.dryRun ? 'DRY-RUN' : 'REAL'}${args.updateExisting ? ' + update-existing' : ''}\n`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [emailToId, cuerpoMaps, validLevels] = await Promise.all([
    loadExistingEmails(supabase),
    loadCuerpoMaps(supabase),
    loadValidUserLevels(supabase),
  ]);
  const { bySigla, lineToId } = cuerpoMaps;

  console.log(
    `Cuerpos en BD: ${bySigla.size} siglas | líneas únicas para match completo: ${lineToId.size}\n`
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let sinCuerpo = 0;
  const errors = [];

  for (let i = 0; i < slice.length; i++) {
    const row = slice[i];
    const idx = args.start + i;
    const email = (row.email || '').trim().toLowerCase();
    if (!email) {
      console.warn(`[${idx}] Sin email — ${row.apellido_y_nombre_original || '?'}`);
      skipped += 1;
      continue;
    }

    const gradoNum = Number.isInteger(row.grado) ? row.grado : parseInt(row.grado, 10);
    const userLevel =
      Number.isInteger(gradoNum) && validLevels.has(gradoNum) ? gradoNum : 3;

    const { ids: cuerpoIds, unknown } = resolveCuerpoIds(row, bySigla, lineToId);
    if (unknown.length) {
      console.warn(`[${idx}] ${email} siglas sin cuerpo en BD: ${unknown.join(', ')}`);
    }
    if (cuerpoIds.length === 0) {
      sinCuerpo += 1;
      console.warn(`[${idx}] ${email} — sin ningún cuerpo vinculado (revisá BD o texto CUERPOx en Excel)`);
    }

    const existingId = emailToId.get(email);

    if (args.dryRun) {
      if (existingId) {
        console.log(`[${idx}] EXISTE ${email} → actualizaría perfil + ${cuerpoIds.length} cuerpo(s)`);
      } else {
        console.log(`[${idx}] NUEVO ${email} nivel=${userLevel} grado=${gradoNum} cuerpos=${cuerpoIds.join(',') || '—'}`);
      }
      continue;
    }

    try {
      if (existingId) {
        if (!args.updateExisting) {
          console.warn(`[${idx}] Ya existe ${email} — omitido (usá --update-existing para pisar perfil/cuerpos)`);
          skipped += 1;
          continue;
        }
        await upsertProfileExtras(supabase, existingId, row, userLevel);
        await syncProfileCuerpos(supabase, existingId, cuerpoIds);
        updated += 1;
        console.log(`[${idx}] OK actualizado ${email}`);
        continue;
      }

      if (!args.password) {
        console.warn(`[${idx}] Nuevo ${email} — sin contraseña (--password / IMPORT_DEFAULT_PASSWORD), omitido`);
        skipped += 1;
        continue;
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: args.password,
        email_confirm: true,
        user_metadata: {
          name: trunc(row.nombre, 60),
          apellido: trunc(row.apellido, 60),
          user_level: userLevel,
          grado: Number.isInteger(row.grado) ? row.grado : parseInt(row.grado, 10) || 0,
        },
      });

      if (authError) {
        if (/already registered|already exists/i.test(authError.message)) {
          console.warn(`[${idx}] Email ya registrado ${email} — ${authError.message}`);
          skipped += 1;
          continue;
        }
        throw authError;
      }

      const userId = authData?.user?.id;
      if (!userId) throw new Error('createUser sin id');

      emailToId.set(email, userId);
      await upsertProfileExtras(supabase, userId, row, userLevel);
      await syncProfileCuerpos(supabase, userId, cuerpoIds);
      created += 1;
      console.log(`[${idx}] OK creado ${email}`);
    } catch (e) {
      const msg = e?.message || String(e);
      errors.push({ idx, email, msg });
      console.error(`[${idx}] ERROR ${email}: ${msg}`);
    }
  }

  console.log('\n--- Resumen ---');
  console.log(
    `Creados: ${created} | Actualizados: ${updated} | Omitidos: ${skipped} | Errores: ${errors.length} | Filas sin cuerpo: ${sinCuerpo}`
  );
  if (errors.length) {
    console.log('Primeros errores:', errors.slice(0, 5));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
