import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

type Row = {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string | null;
  event_type: string;
  ip: string | null;
  user_agent: string | null;
  path: string | null;
};

function fmtWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminAccesosScreen() {
  const { fetchWithAuth, user } = useAuth();
  const canView = user?.user_level === 1 && user?.is_superadmin === true;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(
    async (p: number, opts?: { skipFullLoading?: boolean }) => {
      if (!canView) {
        setLoading(false);
        return;
      }
      if (!opts?.skipFullLoading) setLoading(true);
      try {
        const res = await fetchWithAuth(apiPath(`/api/users/access-log?page=${p}&limit=40`));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Error al cargar');
        setRows(Array.isArray(data.items) ? data.items : []);
        setTotalPages(typeof data.totalPages === 'number' ? data.totalPages : 1);
        setPage(typeof data.page === 'number' ? data.page : p);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWithAuth, canView]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  if (!canView) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Solo el superadministrador puede ver el registro de accesos.</Text>
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
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        Inicios de sesión recientes: correo, IP (o proxy) y navegador/dispositivo. Visible solo para el perfil marcado
        como superadmin en la base de datos.
      </Text>
      {error ? <Text style={styles.errBox}>{error}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(page, { skipFullLoading: true });
            }}
          />
        }
        ListEmptyComponent={
          !error ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>No hay registros todavía.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.when, { color: colors.text }]}>{fmtWhen(item.created_at)}</Text>
            <Text style={[styles.email, { color: colors.primary }]} numberOfLines={1}>
              {item.email || '—'}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              IP: {item.ip || '—'}
            </Text>
            <Text style={[styles.ua, { color: colors.textMuted }]} numberOfLines={3}>
              {item.user_agent || '—'}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {totalPages > 1 ? (
        <View style={styles.pager}>
          <TouchableOpacity
            style={[styles.pageBtn, page <= 1 && styles.pageBtnOff]}
            disabled={page <= 1}
            onPress={() => void load(page - 1)}
          >
            <Text style={styles.pageBtnText}>Anterior</Text>
          </TouchableOpacity>
          <Text style={[styles.pageLabel, { color: colors.textSecondary }]}>
            {page} / {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= totalPages && styles.pageBtnOff]}
            disabled={page >= totalPages}
            onPress={() => void load(page + 1)}
          >
            <Text style={styles.pageBtnText}>Siguiente</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  intro: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  err: { color: colors.error, fontSize: 15 },
  errBox: { color: colors.error, fontSize: 14, marginHorizontal: 16, marginBottom: 8 },
  listContent: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 15 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  when: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  email: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 13, marginBottom: 6 },
  ua: { fontSize: 11, lineHeight: 15 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.primary + '33' },
  pageBtnOff: { opacity: 0.35 },
  pageBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  pageLabel: { fontSize: 14, minWidth: 56, textAlign: 'center' },
});
