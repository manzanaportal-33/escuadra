import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
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
  cuerpo: string;
  estado: string | null;
  created_at: string;
};

export default function MisSolicitudesScreen() {
  const { fetchWithAuth, user, isLoading: authLoading } = useAuth();
  const isAdmin = user?.user_level === 1;
  const [rows, setRows] = useState<TramiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) {
      router.replace('/area/admin/tramites' as any);
    }
  }, [authLoading, isAdmin]);

  const load = useCallback(async () => {
    if (isAdmin) return;
    try {
      const res = await fetchWithAuth(apiPath('/api/tramites'));
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

  useFocusEffect(
    useCallback(() => {
      if (authLoading || isAdmin) return;
      void load();
    }, [authLoading, isAdmin, load])
  );

  if (authLoading || (user && isAdmin)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
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
      <Text style={styles.intro}>Tus solicitudes enviadas desde la app y su estado actual.</Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Todavía no enviaste ninguna solicitud.</Text>}
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
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>
                {TIPO_LABEL[item.tipo] || item.tipo} · {item.cuerpo}
              </Text>
              <Text style={styles.rowMeta}>
                {item.apellido}, {item.nombre}
              </Text>
              <Text style={styles.rowDate}>{new Date(item.created_at).toLocaleString('es-AR')}</Text>
            </View>
            <View style={styles.badgeWrap}>
              <Text style={styles.badge}>{item.estado || '—'}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  error: { color: colors.primary, fontSize: 16, textAlign: 'center' },
  intro: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowMain: { flex: 1, paddingRight: 8 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  rowDate: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  badgeWrap: { alignItems: 'flex-end' },
  badge: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: 120,
  },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24, fontSize: 15 },
});
