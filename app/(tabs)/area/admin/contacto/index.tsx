import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

type Filtro = 'todos' | 'nuevo' | 'respondido';

type Row = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  estado: string;
  created_at: string;
  responded_at: string | null;
  mensaje_preview: string;
  /** "SIGLA – nombre" unidos con " · " si hay varios cuerpos */
  cuerpos_etiqueta?: string | null;
};

export default function AdminContactoListScreen() {
  const { fetchWithAuth, user } = useAuth();
  const isAdmin = user?.user_level === 1;
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    if (filtro === 'nuevo') return '?estado=nuevo';
    if (filtro === 'respondido') return '?estado=respondido';
    return '';
  }, [filtro]);

  const load = useCallback(
    async (opts?: { skipFullLoading?: boolean }) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      if (!opts?.skipFullLoading) setLoading(true);
      try {
        const res = await fetchWithAuth(apiPath(`/api/contacto/admin${query}`));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Error al cargar');
        setRows(Array.isArray(data) ? data : []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWithAuth, isAdmin, query]
  );

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Solo administradores.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.sub}>Mensajes enviados desde Contáctenos</Text>

      <View style={styles.chips}>
        {(
          [
            { key: 'todos' as const, label: 'Todos' },
            { key: 'nuevo' as const, label: 'Nuevos' },
            { key: 'respondido' as const, label: 'Respondidos' },
          ] as const
        ).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filtro === key && styles.chipOn]}
            onPress={() => setFiltro(key)}
          >
            <Text style={[styles.chipText, filtro === key && styles.chipTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errBox}>{error}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load({ skipFullLoading: true });
            }}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay mensajes en esta vista.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/area/admin/contacto/${item.id}` as any)}
            activeOpacity={0.75}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>
                {item.apellido}, {item.nombre}
              </Text>
              <View style={[styles.pill, item.estado === 'nuevo' ? styles.pillNuevo : styles.pillOk]}>
                <Text style={styles.pillText}>{item.estado === 'nuevo' ? 'Nuevo' : 'Respondido'}</Text>
              </View>
            </View>
            <Text style={styles.cardEmail}>{item.email}</Text>
            <Text style={styles.cardCuerpos} numberOfLines={2}>
              {item.cuerpos_etiqueta?.trim()
                ? item.cuerpos_etiqueta
                : 'Sin cuerpo asignado'}
            </Text>
            <Text style={styles.cardPreview} numberOfLines={3}>
              {item.mensaje_preview}
            </Text>
            <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleString('es-AR')}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  err: { color: colors.error, fontSize: 16 },
  sub: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 12, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary + '44', borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  chipTextOn: { color: colors.text },
  errBox: { color: colors.error, paddingHorizontal: 16, marginBottom: 8 },
  listContent: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 24, fontSize: 15 },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  cardEmail: { fontSize: 13, color: colors.primaryLight, marginTop: 4 },
  cardCuerpos: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  cardPreview: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  cardDate: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillNuevo: { backgroundColor: colors.warning + '33' },
  pillOk: { backgroundColor: colors.success + '33' },
  pillText: { fontSize: 11, fontWeight: '700', color: colors.text },
});
