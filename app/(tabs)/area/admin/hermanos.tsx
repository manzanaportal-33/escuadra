import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Switch,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath, getApiUrlForDisplay } from '@/config/api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type User = {
  id: string;
  name: string;
  apellido: string;
  user_level: number;
  group_name?: string;
  cuerpo?: string;
  cuerpo_sigla?: string;
  status?: number;
  grado?: number;
};

type Meta = {
  groups: { level: number; name: string }[];
  cuerpos: { id: number; sigla: string; cuerpo: string }[];
};

type ListResponse = {
  items: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const PAGE_SIZE = 50;
const FILTER_ALL = 'all';
const CUERPO_NONE = 'none';

export default function AdminHermanosScreen() {
  const { fetchWithAuth } = useAuth();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterGrupo, setFilterGrupo] = useState<string>(FILTER_ALL);
  const [filterCuerpo, setFilterCuerpo] = useState<string>(FILTER_ALL);
  const [filterGrado, setFilterGrado] = useState('');
  const [debouncedGrado, setDebouncedGrado] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [filterOpen, setFilterOpen] = useState<'grupo' | 'cuerpo' | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 380);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedGrado(filterGrado.trim()), 400);
    return () => clearTimeout(t);
  }, [filterGrado]);

  const filtersKey = useMemo(
    () =>
      `${debouncedSearch}|${filterGrupo}|${filterCuerpo}|${debouncedGrado}|${soloActivos ? '1' : '0'}`,
    [debouncedSearch, filterGrupo, filterCuerpo, debouncedGrado, soloActivos]
  );

  const lastFetchKeyRef = useRef<string | null>(null);
  const prevFiltersKeyRef = useRef<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const loadMeta = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiPath('/api/users/meta'));
      const data = await res.json();
      if (res.ok && data?.groups && data?.cuerpos) setMeta(data);
    } catch {
      /* meta opcional */
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const filtersChanged = prevFiltersKeyRef.current !== null && prevFiltersKeyRef.current !== filtersKey;
    prevFiltersKeyRef.current = filtersKey;
    const pageToUse = filtersChanged ? 1 : page;
    if (filtersChanged) setPage(1);

    const dedupeKey = `${filtersKey}|${pageToUse}`;
    if (lastFetchKeyRef.current === dedupeKey) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pageToUse));
        params.set('limit', String(PAGE_SIZE));
        if (debouncedSearch) params.set('q', debouncedSearch);
        if (filterGrupo !== FILTER_ALL) params.set('user_level', filterGrupo);
        if (filterCuerpo === CUERPO_NONE) params.set('cuerpo_id', 'none');
        else if (filterCuerpo !== FILTER_ALL) params.set('cuerpo_id', filterCuerpo);
        if (debouncedGrado && /^\d+$/.test(debouncedGrado)) params.set('grado', debouncedGrado);
        params.set('solo_activos', soloActivos ? '1' : '0');

        const res = await fetchWithAuth(apiPath(`/api/users?${params}`));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar hermanos');
        const payload = data as ListResponse | User[];
        if (Array.isArray(payload)) {
          if (!cancelled) {
            setError('Actualizá la API: se esperaba respuesta paginada { items, total, page }.');
            setUsers([]);
          }
          return;
        }
        if (!cancelled) {
          lastFetchKeyRef.current = dedupeKey;
          setUsers(Array.isArray(payload.items) ? payload.items : []);
          setTotal(typeof payload.total === 'number' ? payload.total : 0);
          setTotalPages(typeof payload.totalPages === 'number' ? payload.totalPages : 1);
          setLimit(typeof payload.limit === 'number' ? payload.limit : PAGE_SIZE);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Error de conexión';
          const isNetwork = /network|failed|fetch/i.test(msg);
          setError(
            isNetwork
              ? 'No se pudo conectar a la API. ¿Está encendida? En celular físico configurá EXPO_PUBLIC_API_URL en .env con la IP de tu compu (ej. http://192.168.1.5:4000).'
              : msg
          );
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, filtersKey, refreshTick, debouncedSearch, filterGrupo, filterCuerpo, debouncedGrado, soloActivos, fetchWithAuth]);

  const onRefresh = useCallback(() => {
    lastFetchKeyRef.current = null;
    setRefreshing(true);
    setRefreshTick((t) => t + 1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilterGrupo(FILTER_ALL);
    setFilterCuerpo(FILTER_ALL);
    setFilterGrado('');
    setSoloActivos(true);
    setFilterOpen(null);
  }, []);

  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    filterGrupo !== FILTER_ALL ||
    filterCuerpo !== FILTER_ALL ||
    debouncedGrado.length > 0 ||
    !soloActivos;

  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/area/admin/hermanos/editar/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>
            {item.apellido}, {item.name}
          </Text>
          <Text style={styles.rowMeta}>
            {[item.group_name, item.cuerpo_sigla, item.grado != null ? `Gr. ${item.grado}` : null]
              .filter(Boolean)
              .join(' · ') || '—'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    ),
    []
  );

  const keyExtractor = useCallback((item: User) => item.id, []);

  const grupoLabel = useMemo(() => {
    if (filterGrupo === FILTER_ALL) return 'Grupo';
    const g = meta?.groups.find((x) => String(x.level) === filterGrupo);
    return g?.name ?? 'Grupo';
  }, [filterGrupo, meta]);

  const cuerpoLabel = useMemo(() => {
    if (filterCuerpo === FILTER_ALL) return 'Cuerpo';
    if (filterCuerpo === CUERPO_NONE) return 'Sin cuerpo';
    const c = meta?.cuerpos.find((x) => String(x.id) === filterCuerpo);
    return c?.sigla ?? 'Cuerpo';
  }, [filterCuerpo, meta]);

  const fromIdx = total === 0 ? 0 : (page - 1) * limit + 1;
  const toIdx = Math.min(page * limit, total);

  if (loading && users.length === 0 && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (error && users.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        {__DEV__ && <Text style={styles.apiUrl}>API: {getApiUrlForDisplay()}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/area/admin/hermanos/nuevo')}>
        <Ionicons name="add-circle" size={24} color={colors.primary} />
        <Text style={styles.addBtnText}>Agregar hermano</Text>
      </TouchableOpacity>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o apellido…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterGrupo !== FILTER_ALL && styles.filterChipActive]}
          onPress={() => setFilterOpen(filterOpen === 'grupo' ? null : 'grupo')}
        >
          <Text
            style={[styles.filterChipText, filterGrupo !== FILTER_ALL && styles.filterChipTextActive]}
            numberOfLines={1}
          >
            {grupoLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={filterGrupo !== FILTER_ALL ? colors.text : colors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterCuerpo !== FILTER_ALL && styles.filterChipActive]}
          onPress={() => setFilterOpen(filterOpen === 'cuerpo' ? null : 'cuerpo')}
        >
          <Text
            style={[styles.filterChipText, filterCuerpo !== FILTER_ALL && styles.filterChipTextActive]}
            numberOfLines={1}
          >
            {cuerpoLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={filterCuerpo !== FILTER_ALL ? colors.text : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.gradoRow}>
        <Text style={styles.gradoLabel}>Grado</Text>
        <TextInput
          style={styles.gradoInput}
          placeholder="Todos"
          placeholderTextColor={colors.textMuted}
          value={filterGrado}
          onChangeText={setFilterGrado}
          keyboardType="number-pad"
          maxLength={3}
        />
        <View style={styles.switchWrap}>
          <Text style={styles.switchLabel}>Solo activos</Text>
          <Switch value={soloActivos} onValueChange={setSoloActivos} trackColor={{ false: colors.border, true: colors.primary + '88' }} />
        </View>
      </View>

      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearFilters} onPress={clearFilters} hitSlop={{ top: 8, bottom: 8 }}>
          <Ionicons name="close-outline" size={18} color={colors.primary} />
          <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
        </TouchableOpacity>
      )}

      {filterOpen === 'grupo' && meta && (
        <View style={styles.filterDropdown}>
          <ScrollView style={styles.filterScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setFilterGrupo(FILTER_ALL);
                setFilterOpen(null);
              }}
            >
              <Text style={styles.filterOptionText}>Todos los grupos</Text>
            </TouchableOpacity>
            {meta.groups.map((g) => (
              <TouchableOpacity
                key={g.level}
                style={styles.filterOption}
                onPress={() => {
                  setFilterGrupo(String(g.level));
                  setFilterOpen(null);
                }}
              >
                <Text style={styles.filterOptionText}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {filterOpen === 'cuerpo' && meta && (
        <View style={styles.filterDropdown}>
          <ScrollView style={styles.filterScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setFilterCuerpo(FILTER_ALL);
                setFilterOpen(null);
              }}
            >
              <Text style={styles.filterOptionText}>Todos los cuerpos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setFilterCuerpo(CUERPO_NONE);
                setFilterOpen(null);
              }}
            >
              <Text style={styles.filterOptionText}>Sin cuerpo asignado</Text>
            </TouchableOpacity>
            {meta.cuerpos.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.filterOption}
                onPress={() => {
                  setFilterCuerpo(String(c.id));
                  setFilterOpen(null);
                }}
              >
                <Text style={styles.filterOptionText}>
                  {c.sigla} – {c.cuerpo}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.countRow}>
        {listLoading && <ActivityIndicator size="small" color={colors.primary} style={styles.countSpinner} />}
        <Text style={styles.count}>
          {total === 0
            ? 'Sin resultados'
            : `Mostrando ${fromIdx}–${toIdx} de ${total.toLocaleString('es-AR')} hermanos`}
          {hasActiveFilters ? ' · filtrado' : ''}
        </Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {total === 0 && !hasActiveFilters
              ? 'No hay hermanos cargados.'
              : 'Ningún hermano coincide con los filtros. Probá otra búsqueda o limpiá filtros.'}
          </Text>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            onPress={() => page > 1 && setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            <Ionicons name="chevron-back" size={22} color={page <= 1 ? colors.textMuted : colors.primary} />
            <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Anterior</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            Página {page} / {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
            onPress={() => page < totalPages && setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>Siguiente</Text>
            <Ionicons name="chevron-forward" size={22} color={page >= totalPages ? colors.textMuted : colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  error: { color: colors.primary, fontSize: 16, textAlign: 'center' },
  apiUrl: { marginTop: 12, fontSize: 12, color: colors.textMuted },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
  },
  addBtnText: { marginLeft: 10, fontSize: 16, color: colors.primary, fontWeight: '600' },
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
  clearBtn: { padding: 4 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
    maxWidth: '48%',
  },
  filterChipActive: { backgroundColor: colors.primary + '22', borderWidth: 1, borderColor: colors.primary },
  filterChipText: { fontSize: 14, color: colors.textMuted, flexShrink: 1 },
  filterChipTextActive: { color: colors.primary, fontWeight: '600' },
  gradoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  gradoLabel: { fontSize: 14, color: colors.textSecondary },
  gradoInput: {
    width: 72,
    backgroundColor: colors.backgroundCard,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 16,
    color: colors.text,
  },
  switchWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 8 },
  switchLabel: { fontSize: 14, color: colors.textSecondary },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 8,
    gap: 4,
  },
  clearFiltersText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  filterDropdown: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 280,
  },
  filterScroll: { maxHeight: 280 },
  filterOption: { paddingVertical: 14, paddingHorizontal: 16 },
  filterOptionText: { fontSize: 15, color: colors.text },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    minHeight: 22,
  },
  countSpinner: { marginRight: 8 },
  count: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowContent: { flex: 1, paddingRight: 8 },
  rowTitle: { fontSize: 16, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  empty: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: 24 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  pageBtnTextDisabled: { color: colors.textMuted },
  pageInfo: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
});
