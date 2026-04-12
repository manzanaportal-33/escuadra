import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';
import { TesoreriaPlanillaHermano } from '@/components/TesoreriaPlanillaHermano';

type Payload = {
  cuerpo_id: number;
  sigla: string | null;
  cuerpo: string | null;
  sheet_name: string;
  rows: (string | null)[][];
  updated_at: string;
};

export default function TesoreriaPlanillaCuerpoScreen() {
  const { cuerpoId: raw } = useLocalSearchParams<{ cuerpoId: string }>();
  const cuerpoId = parseInt(String(raw), 10);
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (Number.isNaN(cuerpoId)) {
      setError('ID inválido');
      setLoading(false);
      return;
    }
    try {
      const res = await fetchWithAuth(apiPath(`/api/tesoreria/planilla/${cuerpoId}`));
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json?.error === 'string' ? json.error : 'No se pudo cargar la planilla');
        setData(null);
        return;
      }
      setData(json as Payload);
      setError(null);
    } catch {
      setError('Error de conexión');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, cuerpoId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error || 'Sin datos'}</Text>
      </View>
    );
  }

  const rows = Array.isArray(data.rows) ? data.rows : [];

  return (
    <View style={styles.root}>
      <Text style={styles.pageTitle} numberOfLines={4}>
        {data.sheet_name}
      </Text>
      <Text style={styles.metaSecondary}>
        Actualizado:{' '}
        {data.updated_at ? new Date(data.updated_at).toLocaleString('es-AR') : '—'}
      </Text>
      <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={styles.infoText}>
          Movimientos arriba y cuotas con nómina abajo. En tablas anchas podés deslizar en horizontal.
        </Text>
      </View>
      <ScrollView
        style={styles.tableScroll}
        contentContainerStyle={styles.tableScrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <TesoreriaPlanillaHermano rows={rows} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    minHeight: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  error: { color: '#e57373', fontSize: 15, textAlign: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 10, lineHeight: 24 },
  metaSecondary: { fontSize: 11, color: colors.textMuted, marginBottom: 12 },
  infoCard: { borderRadius: 12, padding: 12, marginBottom: 12 },
  infoText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  tableScroll: { flex: 1, minHeight: 0 },
  tableScrollContent: { paddingBottom: 24 },
});
