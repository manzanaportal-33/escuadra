import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { colors } from '@/theme/colors';

export type Indicador = { label: string; value: number };
export type CuerpoResumen = {
  orden: number;
  nombre: string;
  localidad: string | null;
  saldo: number | null;
  capitantes: number | null;
  capita_mensual: number | null;
};

export type ResumenHeaderFields = {
  fecha_corte?: string | null;
  source?: string;
  indicadores?: Indicador[];
  totales_por_tipo?: Indicador[];
};

export function fmtNum(n: number | null | undefined, opts?: { maxFrac?: number }) {
  if (n == null || Number.isNaN(n)) return '—';
  const maxFrac = opts?.maxFrac ?? 0;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  }).format(n);
}

function isMontoLabel(label: string) {
  const l = label.toLowerCase();
  return (
    l.includes('saldo') ||
    l.includes('deuda') ||
    l.includes('ingreso') ||
    l === 'total' ||
    l.includes('flotante')
  );
}

type Props = {
  header: ResumenHeaderFields;
  cuerpos: CuerpoResumen[];
  /** Título de la tabla de cuerpos (ej. "Detalle por cuerpo" vs "Tus cuerpos"). */
  detalleSectionTitle?: string;
  showSearch?: boolean;
  rowKey?: (r: CuerpoResumen, index: number) => string;
};

export function ResumenEstadoCuentasBody({
  header,
  cuerpos,
  detalleSectionTitle = 'Detalle por cuerpo',
  showSearch = true,
  rowKey = (r, i) => `${i}-${r.orden}-${r.nombre}`,
}: Props) {
  const [filtro, setFiltro] = useState('');

  const cuerposFiltrados = useMemo(() => {
    const list = cuerpos || [];
    const q = filtro.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const n = (r.nombre || '').toLowerCase();
      const l = (r.localidad || '').toLowerCase();
      return n.includes(q) || l.includes(q);
    });
  }, [cuerpos, filtro]);

  const indicadores = header.indicadores || [];
  const totalesTipo = header.totales_por_tipo || [];

  return (
    <>
      {header.fecha_corte ? (
        <Text style={styles.fecha}>Corte: {header.fecha_corte}</Text>
      ) : null}
      {header.source ? (
        <Text style={styles.source} numberOfLines={2}>
          Fuente: {header.source}
        </Text>
      ) : null}

      <Text style={styles.sectionTitle}>Indicadores</Text>
      <View style={styles.kpiGrid}>
        {indicadores.map((item) => {
          const monto = isMontoLabel(item.label);
          return (
            <View key={item.label} style={[styles.kpiCard, { backgroundColor: colors.backgroundCard }]}>
              <Text style={styles.kpiLabel}>{item.label}</Text>
              <Text
                style={[
                  styles.kpiValue,
                  monto && item.value < 0 ? styles.kpiNeg : null,
                  monto && item.value > 0 ? styles.kpiPos : null,
                ]}
              >
                {monto ? fmtNum(item.value, { maxFrac: 2 }) : fmtNum(item.value)}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Totales por tipo de cuerpo</Text>
      <View style={styles.tipoRow}>
        {totalesTipo.map((item) => (
          <View key={item.label} style={[styles.tipoChip, { backgroundColor: colors.backgroundCard }]}>
            <Text style={styles.tipoValue}>{fmtNum(item.value)}</Text>
            <Text style={styles.tipoLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>
        {detalleSectionTitle} ({cuerposFiltrados.length})
      </Text>
      {showSearch ? (
        <TextInput
          style={[styles.search, { backgroundColor: colors.backgroundCard, color: colors.text }]}
          value={filtro}
          onChangeText={setFiltro}
          placeholder="Buscar por nombre o localidad…"
          placeholderTextColor={colors.textMuted}
        />
      ) : null}

      <View style={[styles.tableHead, { borderBottomColor: colors.textMuted }]}>
        <Text style={[styles.th, styles.colN]}>#</Text>
        <Text style={[styles.th, styles.colNombre]}>Cuerpo</Text>
        <Text style={[styles.th, styles.colLoc]}>Loc.</Text>
        <Text style={[styles.th, styles.colNum]}>Saldo</Text>
        <Text style={[styles.th, styles.colNumSm]}>Cap.</Text>
        <Text style={[styles.th, styles.colNumSm]}>Cáp.</Text>
      </View>

      {cuerposFiltrados.map((r, idx) => (
        <View
          key={rowKey(r, idx)}
          style={[styles.tableRow, { borderBottomColor: colors.backgroundCard }]}
        >
          <Text style={[styles.td, styles.colN]}>{r.orden}</Text>
          <Text style={[styles.td, styles.colNombre]} numberOfLines={3}>
            {r.nombre}
          </Text>
          <Text style={[styles.td, styles.colLoc]} numberOfLines={2}>
            {r.localidad || '—'}
          </Text>
          <Text
            style={[
              styles.td,
              styles.colNum,
              r.saldo != null && r.saldo < 0 ? styles.kpiNeg : null,
              r.saldo != null && r.saldo > 0 ? styles.kpiPos : null,
            ]}
          >
            {fmtNum(r.saldo)}
          </Text>
          <Text style={[styles.td, styles.colNumSm]}>{fmtNum(r.capitantes)}</Text>
          <Text style={[styles.td, styles.colNumSm]}>{fmtNum(r.capita_mensual)}</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  fecha: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  source: { fontSize: 11, color: colors.textMuted, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 20, marginBottom: 10 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '48%', borderRadius: 12, padding: 12, minWidth: 150 },
  kpiLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  kpiValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  kpiNeg: { color: '#e57373' },
  kpiPos: { color: '#81c784' },
  tipoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoChip: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, minWidth: '30%', flexGrow: 1 },
  tipoValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  tipoLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  search: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  th: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  td: { fontSize: 12, color: colors.text },
  colN: { width: 28 },
  colNombre: { flex: 2.2, paddingRight: 6 },
  colLoc: { flex: 1.1, paddingRight: 4 },
  colNum: { width: 64, textAlign: 'right' },
  colNumSm: { width: 44, textAlign: 'right' },
});
