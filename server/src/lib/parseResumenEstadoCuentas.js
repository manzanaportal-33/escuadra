/**
 * Misma lógica que scripts/parse_resumen.py: solapa RESUMEN → JSON para la app.
 */
import XLSX from 'xlsx';

const CUERPO_RE = /^(LP|LF|CAP|ARE|CON|GIG)\d/i;

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

function parseNum(x) {
  if (x === undefined || x === null || x === '') return null;
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  const t = String(x).trim().replace(/,/g, '').replace(/\s/g, '');
  if (t === '-' || t === '—') return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function excelSerialToIso(serial) {
  const f = parseFloat(String(serial).trim());
  if (!Number.isFinite(f) || f <= 0 || f > 60000) return null;
  const d = new Date(EXCEL_EPOCH_MS + Math.floor(f) * 86400000);
  return d.toISOString().slice(0, 10);
}

function getCellRaw(ws, excelRow, colIdx) {
  const addr = XLSX.utils.encode_cell({ r: excelRow - 1, c: colIdx });
  const c = ws[addr];
  if (!c || c.t === 'z') return undefined;
  return c.v;
}

function cellStr(ws, excelRow, colIdx) {
  const v = getCellRaw(ws, excelRow, colIdx);
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function isCuerpoDataRow(col1) {
  const s = (col1 || '').trim();
  if (!s) return false;
  return CUERPO_RE.test(s);
}

/**
 * @param {Buffer} buffer
 * @param {string} [sourceLabel]
 * @returns {object}
 */
export function parseResumenEstadoCuentasFromBuffer(buffer, sourceLabel = 'buffer') {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: true });
  const sheetName = wb.SheetNames.find((n) => String(n).trim().toUpperCase() === 'RESUMEN');
  if (!sheetName) {
    throw new Error('No se encontró la solapa RESUMEN');
  }
  const ws = wb.Sheets[sheetName];
  if (!ws || !ws['!ref']) {
    throw new Error('Planilla RESUMEN vacía');
  }
  const range = XLSX.utils.decode_range(ws['!ref']);
  const maxRow = range.e.r + 1;

  const r2 = {};
  for (let c = 0; c <= range.e.c; c++) {
    r2[c] = getCellRaw(ws, 2, c);
  }
  const fechaSerial = parseNum(r2[0]);
  const fechaCorte = fechaSerial != null ? excelSerialToIso(fechaSerial) : null;

  const indicadores = [];
  const vistoInd = new Set();
  const totalesTipo = [];
  const vistoTt = new Set();

  for (let ri = 4; ri <= maxRow; ri++) {
    const lab7 = cellStr(ws, ri, 7);
    if (lab7) {
      const val8 = parseNum(getCellRaw(ws, ri, 8));
      if (val8 != null && !vistoInd.has(lab7)) {
        vistoInd.add(lab7);
        indicadores.push({ label: lab7, value: val8 });
      }
    }
    const lab10 = cellStr(ws, ri, 10);
    if (lab10) {
      const val11 = parseNum(getCellRaw(ws, ri, 11));
      if (val11 != null && !vistoTt.has(lab10)) {
        vistoTt.add(lab10);
        totalesTipo.push({ label: lab10, value: val11 });
      }
    }
  }

  const cuerpos = [];
  for (let ri = 5; ri <= maxRow; ri++) {
    const col1 = cellStr(ws, ri, 1);
    if (!isCuerpoDataRow(col1)) continue;
    const nRaw = parseNum(getCellRaw(ws, ri, 0));
    cuerpos.push({
      orden: nRaw != null && nRaw === Math.floor(nRaw) ? Math.floor(nRaw) : cuerpos.length + 1,
      nombre: col1,
      localidad: cellStr(ws, ri, 2) || null,
      saldo: parseNum(getCellRaw(ws, ri, 3)),
      capitantes: parseNum(getCellRaw(ws, ri, 4)),
      capita_mensual: parseNum(getCellRaw(ws, ri, 5)),
    });
  }

  return {
    source: sourceLabel,
    sheet: 'RESUMEN',
    excel_date_serial: fechaSerial,
    fecha_corte: fechaCorte,
    indicadores,
    totales_por_tipo: totalesTipo,
    cuerpos,
  };
}
