import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';

type Cuerpo = {
  id: number;
  sigla: string;
  cuerpo: string;
  localidad?: string | null;
  trabajos?: string | null;
  status?: number;
  folder?: string | null;
  presidente?: string | null;
  secretario?: string | null;
  tesorero?: string | null;
};

export default function CuerposScreen() {
  const { fetchWithAuth, user } = useAuth();
  const [list, setList] = useState<Cuerpo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const hasLoadedOnce = useRef(false);

  const misIds = useMemo(
    () => new Set((user?.cuerpo_ids || []).map((n) => Number(n))),
    [user?.cuerpo_ids]
  );

  const load = useCallback(async () => {
    const first = !hasLoadedOnce.current;
    if (first) setLoading(true);
    try {
      const res = await fetchWithAuth(apiPath('/api/cuerpos'));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Error al cargar');
        setList([]);
      } else {
        setList(Array.isArray(data) ? data : []);
        setError(null);
      }
    } catch {
      setError('Error de conexión');
      setList([]);
    } finally {
      hasLoadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    const words = q.split(/\s+/).filter(Boolean);
    return list.filter((c) => {
      const hay = [
        c.sigla,
        c.cuerpo,
        c.localidad,
        c.folder,
        c.trabajos,
        c.presidente,
        c.secretario,
        c.tesorero,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [list, search]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && list.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.hint}>Deslizá hacia abajo para reintentar.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.subtitle}>Directorio de logias y cuerpos</Text>

      <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={styles.infoText}>
          Tocá un cuerpo para ver la ficha completa (sin observaciones internas). Los datos los carga la
          administración.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchWrap, { backgroundColor: colors.backgroundCard }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por sigla, nombre, localidad o cargos…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {list.length > 0 ? (
        <Text style={styles.count}>
          {search.trim()
            ? `${filtered.length} de ${list.length} cuerpos`
            : `${list.length} cuerpo${list.length === 1 ? '' : 's'}`}
        </Text>
      ) : null}

      {filtered.map((c) => {
        const esMio = misIds.has(Number(c.id));
        const inactivo = c.status != null && c.status !== 1;
        return (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.card,
              { backgroundColor: colors.backgroundCard },
              esMio && styles.cardMio,
            ]}
            onPress={() => router.push(`/area/cuerpos/${c.id}` as any)}
            activeOpacity={0.75}
          >
            <View style={styles.cardHead}>
              <View style={styles.cardHeadText}>
                <Text style={styles.cardTitle}>
                  {c.sigla} – {c.cuerpo}
                </Text>
                {c.localidad?.trim() ? (
                  <Text style={styles.cardSubtitle} numberOfLines={2}>
                    {c.localidad.trim()}
                  </Text>
                ) : null}
                {inactivo ? <Text style={styles.badgeInactive}>Inactivo</Text> : null}
              </View>
              {esMio ? (
                <View style={styles.badgeMio}>
                  <Text style={styles.badgeMioText}>Tu cuerpo</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} style={styles.chevron} />
            </View>
          </TouchableOpacity>
        );
      })}

      {list.length === 0 ? <Text style={styles.empty}>No hay cuerpos cargados.</Text> : null}
      {list.length > 0 && filtered.length === 0 ? (
        <Text style={styles.empty}>Ningún cuerpo coincide con la búsqueda.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoCard: { borderRadius: 12, padding: 12, marginBottom: 14 },
  infoText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  searchRow: { marginBottom: 10 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    ...(Platform.OS === 'web' ? {} : { paddingVertical: 10 }),
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    outlineStyle: 'none',
  },
  count: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMio: {
    borderColor: colors.primaryLight,
    borderWidth: 1,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeadText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  chevron: { flexShrink: 0 },
  badgeMio: {
    backgroundColor: colors.primary + '33',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeMioText: { fontSize: 11, fontWeight: '700', color: colors.primaryLight },
  badgeInactive: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 6,
  },
  empty: { color: colors.textMuted, fontSize: 15, marginTop: 8 },
  errorText: { color: '#e57373', fontSize: 15, marginBottom: 12 },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
