import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { colors } from '@/theme/colors';

const COL_W = 78;
/** Misma anchura en leyenda y en cada fila (separación tipo columna G). */
const GUTTER_W = 52;

const IDX_A_F = [0, 1, 2, 3, 4, 5] as const;
const IDX_H_L = [7, 8, 9, 10, 11] as const;
const HDR_A_F = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const HDR_H_L = ['H', 'I', 'J', 'K', 'L'] as const;

type Props = {
  rows: (string | null)[][];
  expand?: boolean;
  maxHeight?: number;
  splitExcelColumns?: boolean;
};

function cellAt(row: unknown[], ci: number): string {
  if (!Array.isArray(row) || ci < 0) return '';
  const v = row[ci];
  return v != null && v !== '' ? String(v) : '';
}

export function TesoreriaPlanillaGrid({ rows, expand, maxHeight, splitExcelColumns = true }: Props) {
  const safe = Array.isArray(rows) ? rows : [];

  const tableFull = () => {
    const colCount =
      safe.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0) || 1;
    return (
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
        <View style={styles.tableFull}>
          {safe.map((row, ri) => (
            <View key={ri} style={[styles.trFull, ri % 2 === 0 ? styles.stripEven : styles.stripOdd]}>
              {Array.from({ length: colCount }).map((_, ci) => (
                <Text key={ci} style={styles.tdFull} selectable={Platform.OS === 'web'}>
                  {cellAt(row as unknown[], ci)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderTh = (h: string, i: number, len: number) => (
    <Text
      key={h}
      style={[
        styles.th,
        i === len - 1 ? styles.cellLastInPanel : null,
      ]}
    >
      {h}
    </Text>
  );

  const renderTd = (row: unknown[], ci: number, i: number, len: number) => (
    <Text
      key={`c-${ci}`}
      style={[
        styles.td,
        i === len - 1 ? styles.cellLastInPanel : null,
      ]}
      selectable={Platform.OS === 'web'}
    >
      {cellAt(row, ci)}
    </Text>
  );

  const tableSplit = () => (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
      <View style={styles.splitCard}>
        <View style={styles.legendRow}>
          <View style={styles.legendBlock}>
            <Text style={styles.legendKicker}>Columnas A a F</Text>
            <Text style={styles.legendTitle}>Movimientos y saldo</Text>
            <Text style={styles.legendHint}>Recibos, fechas, importes, detalle</Text>
          </View>
          <View style={styles.legendGutter}>
            <View style={styles.legendBarShort} />
            <Text style={styles.legendG}>G</Text>
            <Text style={styles.legendGEmpty}>sin datos{'\n'}en Excel</Text>
            <View style={styles.legendBarShort} />
          </View>
          <View style={[styles.legendBlock, styles.legendBlockRight]}>
            <Text style={styles.legendKicker}>Columnas H a L</Text>
            <Text style={styles.legendTitle}>Cuotas y miembros</Text>
            <Text style={styles.legendHint}>Apellido y nombre, grado, cápita</Text>
          </View>
        </View>

        <View style={styles.headerStrip}>
          <View style={[styles.panel, styles.panelLeft]}>
            {HDR_A_F.map((h, i) => renderTh(h, i, HDR_A_F.length))}
          </View>
          <View style={styles.gutter} />
          <View style={[styles.panel, styles.panelRight]}>
            {HDR_H_L.map((h, i) => renderTh(h, i, HDR_H_L.length))}
          </View>
        </View>

        {safe.map((row, ri) => (
          <View
            key={ri}
            style={[styles.dataStrip, ri % 2 === 0 ? styles.stripEven : styles.stripOdd]}
          >
            <View style={[styles.panel, styles.panelLeft]}>
              {IDX_A_F.map((ci, i) => renderTd(row as unknown[], ci, i, IDX_A_F.length))}
            </View>
            <View style={styles.gutter}>
              <View style={styles.gutterBar} />
            </View>
            <View style={[styles.panel, styles.panelRight]}>
              {IDX_H_L.map((ci, i) => renderTd(row as unknown[], ci, i, IDX_H_L.length))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const table = splitExcelColumns ? tableSplit() : tableFull();

  if (expand) {
    return (
      <ScrollView
        style={[styles.outerExpand, maxHeight != null ? { maxHeight } : { flex: 1 }]}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {table}
      </ScrollView>
    );
  }

  return <View style={styles.embeddedWrap}>{table}</View>;
}

const styles = StyleSheet.create({
  embeddedWrap: { alignSelf: 'stretch', width: '100%' as const },
  outerExpand: { minHeight: 0 },

  splitCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  legendBlock: { flex: 1, justifyContent: 'center', paddingRight: 8 },
  legendBlockRight: { paddingRight: 0, paddingLeft: 8, alignItems: 'flex-end' },
  legendKicker: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  legendTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  legendHint: { fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 15 },
  legendGutter: {
    width: GUTTER_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  legendBarShort: {
    width: 3,
    height: 10,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
  },
  legendG: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryLight,
    marginVertical: 4,
  },
  legendGEmpty: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 12,
  },

  headerStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dataStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  stripEven: { backgroundColor: colors.backgroundCard },
  stripOdd: { backgroundColor: colors.backgroundElevated },

  panel: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelLeft: {},
  panelRight: {},

  gutter: {
    width: GUTTER_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  gutterBar: {
    width: 3,
    alignSelf: 'stretch',
    minHeight: 24,
    backgroundColor: colors.primary,
    opacity: 0.35,
    borderRadius: 2,
  },

  th: {
    width: COL_W,
    minHeight: 30,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  td: {
    width: COL_W,
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    backgroundColor: 'transparent',
  },
  cellLastInPanel: { borderRightWidth: 0 },

  tableFull: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  trFull: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tdFull: {
    width: COL_W,
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    color: colors.text,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
});
