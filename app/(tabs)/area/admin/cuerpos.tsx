import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type Cuerpo = {
  id: number;
  sigla: string;
  cuerpo: string;
  localidad?: string;
  status?: number;
  presidente?: string | null;
  secretario?: string | null;
  tesorero?: string | null;
};

export default function AdminCuerposScreen() {
  const { token } = useAuth();
  const [list, setList] = useState<Cuerpo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const res = await fetch(apiPath('/api/cuerpos'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setList(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    const words = q.split(/\s+/).filter(Boolean);
    return list.filter((c) => {
      const hay = [
        c.sigla,
        c.cuerpo,
        c.localidad,
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

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const eliminar = (id: number, sigla: string) => {
    Alert.alert(
      'Eliminar cuerpo',
      `¿Eliminar "${sigla}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(apiPath(`/api/cuerpos/${id}`), {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                Alert.alert('Error', d.error || 'No se pudo eliminar');
                return;
              }
              load();
            } catch {
              Alert.alert('Error', 'Error de conexión');
            }
          },
        },
      ]
    );
  };

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push('/area/admin/cuerpos/nuevo')}
      >
        <Ionicons name="add-circle" size={24} color={colors.primary} />
        <Text style={styles.addBtnText}>Agregar cuerpo</Text>
      </TouchableOpacity>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
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

      {list.length > 0 && (
        <Text style={styles.count}>
          {search.trim()
            ? `${filtered.length} de ${list.length} cuerpos`
            : `${list.length} cuerpo${list.length === 1 ? '' : 's'}`}
        </Text>
      )}

      {filtered.map((c) => (
        <View key={c.id} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{c.sigla} – {c.cuerpo}</Text>
            {c.localidad ? (
              <Text style={styles.rowMeta}>{c.localidad}</Text>
            ) : null}
            {c.presidente ? (
              <Text style={styles.rowCargo} numberOfLines={1}>
                Presidente: {c.presidente}
              </Text>
            ) : null}
            {c.secretario ? (
              <Text style={styles.rowCargo} numberOfLines={1}>
                Secretario: {c.secretario}
              </Text>
            ) : null}
            {c.tesorero ? (
              <Text style={styles.rowCargo} numberOfLines={1}>
                Tesorero: {c.tesorero}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push(`/area/admin/cuerpos/editar/${c.id}`)}
          >
            <Ionicons name="pencil" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => eliminar(c.id, c.sigla)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ))}
      {list.length === 0 && (
        <Text style={styles.empty}>No hay cuerpos cargados.</Text>
      )}
      {list.length > 0 && filtered.length === 0 && (
        <Text style={styles.empty}>Ningún cuerpo coincide con la búsqueda.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  error: { color: colors.primary, fontSize: 16 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  addBtnText: { marginLeft: 10, fontSize: 16, color: colors.primary, fontWeight: '600' },
  searchRow: { marginBottom: 12 },
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
  count: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  rowCargo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  iconBtn: { padding: 8 },
  empty: { color: colors.textMuted, fontSize: 15 },
});
