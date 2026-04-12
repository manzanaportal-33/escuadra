import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

const TIPO_LABEL: Record<string, string> = {
  ingreso: 'Ingreso',
  reingreso: 'Re-Ingreso',
  ascenso: 'Ascenso',
  dimision: 'Dimisión',
  pase: 'Pase',
};

type TramiteRow = {
  id: number;
  tipo: string;
  nombre: string;
  apellido: string;
  mail: string | null;
  cuerpo: string;
  cuerpo_pasa: string | null;
  plomo: string | null;
  fecha_propuesta: string | null;
  estado: string | null;
  created_at: string;
  user_id: string | null;
  adjuntos_count?: number;
};

const FILTER_TIPO_ALL = 'all';
const FILTER_ESTADO_ALL = 'all';

export default function AdminTramitesScreen() {
  const { fetchWithAuth, user } = useAuth();
  const isAdmin = user?.user_level === 1;
  const [rows, setRows] = useState<TramiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState(FILTER_TIPO_ALL);
  const [filterEstado, setFilterEstado] = useState(FILTER_ESTADO_ALL);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetchWithAuth(apiPath('/api/tramites/admin'));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Error al cargar');
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuth, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const estadosUnicos = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.estado) s.add(r.estado);
    });
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filterTipo !== FILTER_TIPO_ALL) list = list.filter((r) => r.tipo === filterTipo);
    if (filterEstado !== FILTER_ESTADO_ALL) list = list.filter((r) => (r.estado || '') === filterEstado);
    const q = search.trim().toLowerCase();
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      list = list.filter((r) => {
        const hay = [
          r.nombre,
          r.apellido,
          r.mail,
          r.cuerpo,
          r.cuerpo_pasa,
          TIPO_LABEL[r.tipo] || r.tipo,
          r.estado,
          String(r.id),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    }
    return list;
  }, [rows, search, filterTipo, filterEstado]);

  const renderItem = useCallback(
    ({ item }: { item: TramiteRow }) => (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/area/admin/tramites/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>
            {item.apellido}, {item.nombre}
          </Text>
          <Text style={styles.rowMeta}>
            {TIPO_LABEL[item.tipo] || item.tipo} · {item.cuerpo}
          </Text>
          <Text style={styles.rowDate}>{new Date(item.created_at).toLocaleString('es-AR')}</Text>
        </View>
        <View style={styles.badgeWrap}>
          {(item.adjuntos_count ?? 0) > 0 ? (
            <Ionicons name="attach" size={18} color={colors.primaryLight} style={{ marginRight: 6 }} />
          ) : null}
          <Text style={styles.badge}>{item.estado || '—'}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    ),
    []
  );

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Solo los administradores pueden ver esta pantalla.</Text>
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

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>Todas las solicitudes enviadas por los hermanos desde la app.</Text>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, mail, cuerpo, tipo…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.chipsRow}>
        <Text style={styles.chipLabel}>Tipo:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <TouchableOpacity
            style={[styles.chip, filterTipo === FILTER_TIPO_ALL && styles.chipActive]}
            onPress={() => setFilterTipo(FILTER_TIPO_ALL)}
          >
            <Text style={[styles.chipText, filterTipo === FILTER_TIPO_ALL && styles.chipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {Object.entries(TIPO_LABEL).map(([k, label]) => (
            <TouchableOpacity
              key={k}
              style={[styles.chip, filterTipo === k && styles.chipActive]}
              onPress={() => setFilterTipo(k)}
            >
              <Text style={[styles.chipText, filterTipo === k && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {estadosUnicos.length > 0 && (
        <View style={styles.chipsRow}>
          <Text style={styles.chipLabel}>Estado:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            <TouchableOpacity
              style={[styles.chip, filterEstado === FILTER_ESTADO_ALL && styles.chipActive]}
              onPress={() => setFilterEstado(FILTER_ESTADO_ALL)}
            >
              <Text style={[styles.chipText, filterEstado === FILTER_ESTADO_ALL && styles.chipTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>
            {estadosUnicos.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.chip, filterEstado === e && styles.chipActive]}
                onPress={() => setFilterEstado(e)}
              >
                <Text style={[styles.chipText, filterEstado === e && styles.chipTextActive]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.count}>
        {filtered.length === rows.length
          ? `${rows.length} solicitud${rows.length === 1 ? '' : 'es'}`
          : `${filtered.length} de ${rows.length} (filtrado)`}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No hay solicitudes o ninguna coincide con los filtros.</Text>}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  error: { color: colors.primary, fontSize: 16, textAlign: 'center' },
  intro: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchRow: { paddingHorizontal: 20, marginBottom: 10 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    ...(Platform.OS === 'web' ? {} : { paddingVertical: 10 }),
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    outlineStyle: 'none',
  },
  chipsRow: { marginBottom: 8 },
  chipLabel: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 20, marginBottom: 6 },
  chipsScroll: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.backgroundCard,
  },
  chipActive: { backgroundColor: colors.primary + '33', borderWidth: 1, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  count: { fontSize: 13, color: colors.textMuted, paddingHorizontal: 20, marginBottom: 8 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  rowDate: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  badgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    maxWidth: 100,
  },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24, fontSize: 15 },
});
