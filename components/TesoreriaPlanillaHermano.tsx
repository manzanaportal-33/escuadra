import type { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { colors } from '@/theme/colors';

const IDX_A_F = [0, 1, 2, 3, 4, 5] as const;
const IDX_H_L = [7, 8, 9, 10, 11] as const;

const HDR_MOV = ['Recibo Nº', 'Fecha', 'Crédito', 'Débito', 'Saldo', 'Detalle'] as const;
const HDR_MEM = ['Apellido y nombre', 'Grado', 'Cápita', 'Fecha', 'Detalle'] as const;

function cellAt(row: unknown[], ci: number): string {
  if (!Array.isArray(row) || ci < 0) return '';
  const v = row[ci];
  return v != null && v !== '' ? String(v).trim() : '';
}

function normJoin(indices: readonly number[], row: unknown[]): string {
  return indices
    .map((i) => cellAt(row, i))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPanelEmpty(indices: readonly number[], row: unknown[]): boolean {
  return indices.every((i) => !cellAt(row, i));
}

function looksNegativeMoney(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/^\(\s*\$/.test(t) || /\)\s*$/.test(t)) return true;
  if (/^-\s*\$/.test(t) || /^-\s*[\d.]/.test(t)) return true;
  if (/\$\s*-\s*[\d.]/.test(t)) return true;
  return false;
}

type RowSlice = { row: unknown[]; ri: number };

function slicesForPanel(rows: unknown[][], indices: readonly number[]): RowSlice[] {
  const out: RowSlice[] = [];
  rows.forEach((row, ri) => {
    if (!Array.isArray(row)) return;
    if (isPanelEmpty(indices, row)) return;
    out.push({ row, ri });
  });
  return out;
}

function isMovHeaderRow(row: unknown[]): boolean {
  const j = normJoin(IDX_A_F, row).toLowerCase();
  if (j.length > 120) return false;
  return (
    /recibo/.test(j) &&
    /fecha/.test(j) &&
    (/crédito|credito/.test(j) || /débito|debito/.test(j)) &&
    (/saldo/.test(j) || /detalle/.test(j))
  );
}

function isBalanceRowAF(row: unknown[]): boolean {
  return /saldo\s+del\s+cuerpo|saldo.*cuerpo\s+al/i.test(normJoin(IDX_A_F, row));
}

function isOfficerLabel(s: string): boolean {
  return /^(presidente|secretario|tesorero)\b/i.test(s.trim());
}

function isOfficerRow(indices: readonly number[], row: unknown[]): boolean {
  const parts = indices.map((i) => cellAt(row, i)).filter(Boolean);
  if (parts.length === 0) return false;
  return parts.some((p) => isOfficerLabel(p));
}

function isMemHeaderRow(row: unknown[]): boolean {
  const j = normJoin(IDX_H_L, row).toLowerCase();
  if (j.length > 120) return false;
  return (
    (/apellido|nombre/.test(j) || /y\s+nombre/.test(j)) &&
    /grado/.test(j) &&
    (/cápita|capita/.test(j) || /capita/.test(j))
  );
}

function isStatsRowHL(row: unknown[]): boolean {
  const j = normJoin(IDX_H_L, row).toLowerCase();
  return (
    /capitant|capitante|valor\s*cuota|total\s*miembro/i.test(j) && !isMemHeaderRow(row)
  );
}

function isLikelyTitleRow(row: unknown[], indices: readonly number[]): boolean {
  if (isOfficerRow(indices, row)) return false;
  if (indices === IDX_A_F && isBalanceRowAF(row)) return false;
  if (indices === IDX_H_L && (isStatsRowHL(row) || isMemHeaderRow(row))) return false;
  if (indices === IDX_A_F && isMovHeaderRow(row)) return false;
  const parts = indices.map((i) => cellAt(row, i)).filter(Boolean);
  if (parts.length === 0) return false;
  if (parts.length >= 4) return false;
  const joined = parts.join(' ');
  if (joined.length > 100) return false;
  if (/\$\s*[\d.]/.test(joined)) return false;
  if (parts.length >= 2 && /^\d{1,2}$/.test(parts[1])) return false;
  if (parts.length >= 3) return false;
  return true;
}

function parseOfficer(indices: readonly number[], row: unknown[]): { label: string; value: string } {
  const cells = indices.map((i) => cellAt(row, i));
  let label = '';
  let value = '';
  for (const v of cells) {
    if (isOfficerLabel(v)) {
      label = v.trim();
      break;
    }
  }
  const nonEmpty = cells.map((v) => v).filter(Boolean);
  for (const v of nonEmpty) {
    if (v === label) continue;
    if (/,/.test(v) && v.length > 4) {
      value = v;
      break;
    }
  }
  if (!value) {
    value = nonEmpty.filter((v) => v !== label).join(' ').trim() || '—';
  }
  return { label: label || 'Cargo', value };
}

function parseBalanceRow(row: unknown[]): { left: string; right: string } {
  const cells = IDX_A_F.map((i) => cellAt(row, i));
  const joined = cells.filter(Boolean).join('  ');
  const moneyIdx = cells.findIndex((c) => /\$|^\s*-\s*[\d.]/.test(c) || looksNegativeMoney(c));
  if (moneyIdx >= 0) {
    const right = cells[moneyIdx];
    const left = [...cells.slice(0, moneyIdx), ...cells.slice(moneyIdx + 1)].filter(Boolean).join(' ');
    return { left: left || joined, right };
  }
  const m = joined.match(/^(.+?):\s*(.+)$/);
  if (m) return { left: m[1].trim() + ':', right: m[2].trim() };
  return { left: joined, right: '' };
}

function parseStatsGroup(group: RowSlice[]): { label: string; value: string }[] {
  const flat = group.flatMap(({ row }) => IDX_H_L.map((i) => cellAt(row, i)));
  const pairs: { label: string; value: string }[] = [];
  for (let i = 0; i < flat.length; i++) {
    const t = flat[i];
    if (/total\s+miembros\s+capitantes?|valor\s*cuota|total\s+miembros\b/i.test(t)) {
      const next = flat[i + 1];
      if (next && !/total\s+miembros|capitant|capitante|valor\s*cuota/i.test(next)) {
        pairs.push({ label: t, value: next });
        i++;
      } else if (next) {
        pairs.push({ label: t, value: next });
        i++;
      }
    }
  }
  if (pairs.length > 0) return pairs;
  const chunks = flat.filter(Boolean);
  for (let i = 0; i < chunks.length - 1; i += 2) {
    pairs.push({ label: chunks[i], value: chunks[i + 1] });
  }
  return pairs;
}

type Props = {
  rows: (string | null)[][];
};

function TitleBand({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={styles.titleBand}>
      <Text style={styles.titleBandText} selectable={Platform.OS === 'web'}>
        {text}
      </Text>
    </View>
  );
}

function OfficersBlock({ indices, slices }: { indices: readonly number[]; slices: RowSlice[] }) {
  const officers = slices.filter(({ row }) => isOfficerRow(indices, row));
  if (officers.length === 0) return null;
  return (
    <View style={styles.officersTable}>
      {officers.map(({ row, ri }) => {
        const { label, value } = parseOfficer(indices, row);
        return (
          <View key={ri} style={styles.officerRow}>
            <Text style={styles.officerLabel} selectable={Platform.OS === 'web'}>
              {label}
            </Text>
            <Text style={styles.officerValue} selectable={Platform.OS === 'web'}>
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function BalanceBar({ row, ri }: { row: unknown[]; ri: number }) {
  const { left, right } = parseBalanceRow(row);
  const neg = looksNegativeMoney(right);
  return (
    <View style={styles.balanceBar}>
      <Text style={styles.balanceLeft} selectable={Platform.OS === 'web'}>
        {left}
      </Text>
      {right ? (
        <Text
          style={[styles.balanceRight, neg ? styles.amountNegative : null]}
          selectable={Platform.OS === 'web'}
        >
          {right}
        </Text>
      ) : null}
    </View>
  );
}

function MovTableBlock({ headerRow, body }: { headerRow: unknown[]; body: RowSlice[] }) {
  const hdr = IDX_A_F.map((i) => cellAt(headerRow, i));
  const useHdr = hdr.some(Boolean) ? hdr : [...HDR_MOV];
  return (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator style={styles.tableScroll}>
      <View style={styles.movTable}>
        <View style={styles.movHeaderRow}>
          {useHdr.map((h, i) => (
            <Text
              key={`h-${i}`}
              style={[styles.movTh, i === 1 ? styles.movTdCenter : null, i === 5 ? styles.movTdDetalle : null]}
              selectable={Platform.OS === 'web'}
            >
              {h || HDR_MOV[i] || '—'}
            </Text>
          ))}
        </View>
        {body.map(({ row, ri }) => (
          <View key={ri} style={[styles.movDataRow, ri % 2 === 0 ? styles.stripEven : styles.stripOdd]}>
            {IDX_A_F.map((ci, i) => {
              const t = cellAt(row, ci);
              const neg = looksNegativeMoney(t);
              return (
                <Text
                  key={`c-${i}`}
                  style={[
                    styles.movTd,
                    i === 1 ? styles.movTdCenter : null,
                    i === 5 ? styles.movTdDetalle : null,
                    neg ? styles.amountNegative : null,
                  ]}
                  selectable={Platform.OS === 'web'}
                >
                  {t}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function StatsStrip({ group }: { group: RowSlice[] }) {
  const pairs = parseStatsGroup(group);
  const key = group[0]?.ri ?? 0;
  if (pairs.length === 0) {
    const raw = group.map(({ row }) => normJoin(IDX_H_L, row)).filter(Boolean).join(' · ');
    if (!raw) return null;
    return (
      <View style={styles.statsFallback}>
        <Text style={styles.fallbackText} selectable={Platform.OS === 'web'}>
          {raw}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.statsRow}>
      {pairs.map((p, i) => (
        <View key={`${key}-s-${i}`} style={styles.statCell}>
          <View style={styles.statHdr}>
            <Text style={styles.statHdrText} numberOfLines={3} selectable={Platform.OS === 'web'}>
              {p.label}
            </Text>
          </View>
          <View style={styles.statValBox}>
            <Text style={styles.statValText} selectable={Platform.OS === 'web'}>
              {p.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MemTableBlock({ headerRow, body }: { headerRow: unknown[]; body: RowSlice[] }) {
  const hdr = IDX_H_L.map((i) => cellAt(headerRow, i));
  const useHdr = hdr.some(Boolean) ? hdr : [...HDR_MEM];
  return (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator style={styles.tableScroll}>
      <View style={styles.memTable}>
        <View style={styles.memHeaderRow}>
          {useHdr.map((h, i) => (
            <Text
              key={`mh-${i}`}
              style={[
                styles.memTh,
                i === 0 ? styles.memTdNombre : null,
                i === 1 ? styles.memTdNarrow : null,
                i === 4 ? styles.memTdDetalle : null,
              ]}
              selectable={Platform.OS === 'web'}
            >
              {h || HDR_MEM[i] || '—'}
            </Text>
          ))}
        </View>
        {body.map(({ row, ri }) => (
          <View key={ri} style={[styles.memDataRow, ri % 2 === 0 ? styles.stripEven : styles.stripOdd]}>
            {IDX_H_L.map((ci, i) => {
              const t = cellAt(row, ci);
              const neg = looksNegativeMoney(t);
              return (
                <Text
                  key={`mc-${i}`}
                  style={[
                    styles.memTd,
                    i === 0 ? styles.memTdNombre : null,
                    i === 1 ? styles.memTdNarrow : null,
                    i === 4 ? styles.memTdDetalle : null,
                    neg ? styles.amountNegative : null,
                  ]}
                  selectable={Platform.OS === 'web'}
                >
                  {t}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function FallbackLine({ indices, row, ri }: { indices: readonly number[]; row: unknown[]; ri: number }) {
  const text = normJoin(indices, row);
  if (!text) return null;
  return (
    <View key={ri} style={styles.fallbackLine}>
      <Text style={styles.fallbackText} selectable={Platform.OS === 'web'}>
        {text}
      </Text>
    </View>
  );
}

function renderMovimientoSection(slices: RowSlice[]): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < slices.length) {
    const { row, ri } = slices[i];
    if (isOfficerRow(IDX_A_F, row)) {
      const group: RowSlice[] = [];
      while (i < slices.length && isOfficerRow(IDX_A_F, slices[i].row)) {
        group.push(slices[i]);
        i++;
      }
      out.push(<OfficersBlock key={`off-af-${group[0].ri}`} indices={IDX_A_F} slices={group} />);
      continue;
    }
    if (isBalanceRowAF(row)) {
      out.push(<BalanceBar key={ri} row={row} ri={ri} />);
      i++;
      continue;
    }
    if (isMovHeaderRow(row)) {
      const body: RowSlice[] = [];
      i++;
      while (i < slices.length) {
        const next = slices[i];
        if (isMovHeaderRow(next.row)) break;
        if (isBalanceRowAF(next.row) || isOfficerRow(IDX_A_F, next.row)) break;
        if (isLikelyTitleRow(next.row, IDX_A_F)) break;
        body.push(next);
        i++;
      }
      out.push(<MovTableBlock key={`mov-${ri}`} headerRow={row} body={body} />);
      continue;
    }
    if (isLikelyTitleRow(row, IDX_A_F)) {
      out.push(<TitleBand key={ri} text={normJoin(IDX_A_F, row)} />);
      i++;
      continue;
    }
    out.push(<FallbackLine key={ri} indices={IDX_A_F} row={row} ri={ri} />);
    i++;
  }
  return out;
}

/**
 * En el Excel, logia / ciudad / cargos suelen repetirse en H–L igual que en A–F.
 * Si ya mostramos movimientos (A–F con datos), no repetimos ese encabezado en cuotas.
 */
function trimLeadingDuplicateCuotasPreamble(slices: RowSlice[]): RowSlice[] {
  let i = 0;
  while (i < slices.length && isLikelyTitleRow(slices[i].row, IDX_H_L)) i++;
  while (i < slices.length && isOfficerRow(IDX_H_L, slices[i].row)) i++;
  return slices.slice(i);
}

function renderCuotasSection(slices: RowSlice[]): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < slices.length) {
    const { row, ri } = slices[i];
    if (isOfficerRow(IDX_H_L, row)) {
      const group: RowSlice[] = [];
      while (i < slices.length && isOfficerRow(IDX_H_L, slices[i].row)) {
        group.push(slices[i]);
        i++;
      }
      out.push(<OfficersBlock key={`off-hl-${group[0].ri}`} indices={IDX_H_L} slices={group} />);
      continue;
    }
    if (isStatsRowHL(row)) {
      const group: RowSlice[] = [];
      while (i < slices.length && isStatsRowHL(slices[i].row)) {
        group.push(slices[i]);
        i++;
      }
      out.push(<StatsStrip key={`stats-${group[0].ri}`} group={group} />);
      continue;
    }
    if (isMemHeaderRow(row)) {
      const body: RowSlice[] = [];
      i++;
      while (i < slices.length) {
        const next = slices[i];
        if (isMemHeaderRow(next.row) || isStatsRowHL(next.row) || isOfficerRow(IDX_H_L, next.row)) break;
        if (isLikelyTitleRow(next.row, IDX_H_L)) break;
        body.push(next);
        i++;
      }
      out.push(<MemTableBlock key={`mem-${ri}`} headerRow={row} body={body} />);
      continue;
    }
    if (isLikelyTitleRow(row, IDX_H_L)) {
      out.push(<TitleBand key={ri} text={normJoin(IDX_H_L, row)} />);
      i++;
      continue;
    }
    out.push(<FallbackLine key={ri} indices={IDX_H_L} row={row} ri={ri} />);
    i++;
  }
  return out;
}

export function TesoreriaPlanillaHermano({ rows }: Props) {
  const safe = Array.isArray(rows) ? rows : [];
  const leftSlices = slicesForPanel(safe, IDX_A_F);
  const rightSlices = slicesForPanel(safe, IDX_H_L);
  const cuotasSlices =
    leftSlices.length > 0 ? trimLeadingDuplicateCuotasPreamble(rightSlices) : rightSlices;

  const movBlocks = renderMovimientoSection(leftSlices);
  const cuoBlocks = renderCuotasSection(cuotasSlices);

  return (
    <View style={styles.outer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Movimientos y saldo</Text>
        <View style={styles.sectionCard}>
          {leftSlices.length === 0 ? (
            <Text style={styles.emptyHint}>Sin datos en este bloque.</Text>
          ) : (
            movBlocks
          )}
        </View>
      </View>

      <View style={styles.sectionGap} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuotas y miembros</Text>
        <View style={styles.sectionCard}>
          {cuotasSlices.length === 0 ? (
            <Text style={styles.emptyHint}>Sin datos en este bloque.</Text>
          ) : (
            cuoBlocks
          )}
        </View>
      </View>
    </View>
  );
}

const PURPLE_BAND = '#3d2f5c';
const PURPLE_BAND_BORDER = '#5f478b88';
const AMBER_HDR = '#8a6919';
const AMBER_BG = '#2a2418';

const styles = StyleSheet.create({
  outer: { gap: 0 },
  section: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  sectionGap: { height: 20 },
  emptyHint: {
    padding: 16,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  titleBand: {
    backgroundColor: PURPLE_BAND,
    borderBottomWidth: 1,
    borderBottomColor: PURPLE_BAND_BORDER,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  titleBandText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  officersTable: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  officerRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.backgroundElevated,
  },
  officerLabel: {
    flex: 0.42,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  officerValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  balanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: AMBER_BG,
    borderBottomWidth: 2,
    borderColor: AMBER_HDR,
    gap: 12,
  },
  balanceLeft: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  balanceRight: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  amountNegative: {
    color: colors.error,
  },
  tableScroll: { maxWidth: '100%' as const },
  movTable: { minWidth: 600 },
  movHeaderRow: {
    flexDirection: 'row',
    backgroundColor: PURPLE_BAND,
    borderBottomWidth: 1,
    borderBottomColor: PURPLE_BAND_BORDER,
  },
  movTh: {
    width: 88,
    paddingVertical: 10,
    paddingHorizontal: 6,
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  movDataRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  movTd: {
    width: 88,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 11,
    lineHeight: 15,
    color: colors.text,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  movTdCenter: { textAlign: 'center' },
  movTdDetalle: { width: 160 },
  stripEven: { backgroundColor: colors.backgroundCard },
  stripOdd: { backgroundColor: colors.backgroundElevated },
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statCell: { flex: 1, minWidth: 96 },
  statHdr: {
    backgroundColor: AMBER_HDR,
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  statHdrText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f5e6b8',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statValBox: {
    backgroundColor: AMBER_BG,
    paddingVertical: 10,
    paddingHorizontal: 6,
    flex: 1,
    justifyContent: 'center',
  },
  statValText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  statsFallback: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: AMBER_BG,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memTable: { minWidth: 560 },
  memHeaderRow: {
    flexDirection: 'row',
    backgroundColor: PURPLE_BAND,
    borderBottomWidth: 1,
    borderBottomColor: PURPLE_BAND_BORDER,
  },
  memTh: {
    width: 120,
    paddingVertical: 10,
    paddingHorizontal: 6,
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  memDataRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  memTd: {
    width: 120,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 11,
    lineHeight: 15,
    color: colors.text,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  memTdNombre: { width: 200 },
  memTdNarrow: { width: 56, textAlign: 'center' },
  memTdDetalle: { width: 100 },
  fallbackLine: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fallbackText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
