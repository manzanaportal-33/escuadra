import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

type Row = {
  id: number;
  estado: string;
  created_at: string;
  responded_at: string | null;
  mensaje_preview: string;
  tiene_respuesta: boolean;
};

export default function MisConsultasContactoScreen() {
  const { fetchWithAuth } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetchWithAuth(apiPath('/api/contacto/mios'));
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
    [fetchWithAuth]
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && rows.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.intro}>
        Aquí ves el estado de los mensajes que enviaste desde Contáctenos. Cuando un administrador responda, el
        texto aparecerá en el detalle.
      </Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load({ silent: true });
            }}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Todavía no enviaste ninguna consulta.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/area/contacto/${item.id}` as any)}
            activeOpacity={0.75}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleString('es-AR')}</Text>
              <View style={[styles.pill, item.tiene_respuesta ? styles.pillOk : styles.pillWait]}>
                <Text style={styles.pillTxt}>{item.tiene_respuesta ? 'Respondido' : 'Pendiente'}</Text>
              </View>
            </View>
            <Text style={styles.preview} numberOfLines={3}>
              {item.mensaje_preview}
            </Text>
            {item.tiene_respuesta ? (
              <Text style={styles.verResp}>Ver tu mensaje y la respuesta</Text>
            ) : (
              <Text style={styles.verMuted}>Tocá para ver el mensaje enviado</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  intro: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  err: { color: colors.error, paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32, fontSize: 15 },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { fontSize: 12, color: colors.textMuted, flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillWait: { backgroundColor: colors.textMuted + '33' },
  pillOk: { backgroundColor: colors.success + '33' },
  pillTxt: { fontSize: 11, fontWeight: '800', color: colors.text },
  preview: { fontSize: 14, color: colors.text, lineHeight: 20 },
  verResp: { fontSize: 13, color: colors.primaryLight, fontWeight: '600', marginTop: 10 },
  verMuted: { fontSize: 13, color: colors.textMuted, marginTop: 10 },
});
