import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type Categoria = { code: string; nombre: string };

export default function BibliotecaIndexScreen() {
  const { fetchWithAuth } = useAuth();
  const [list, setList] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth(apiPath('/api/biblioteca/categorias'));
        const data = await res.json();
        if (!cancelled) {
          if (!res.ok) setError(data.error || 'Error al cargar');
          else setList(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled && (e instanceof Error && e.message !== 'SESSION_EXPIRED')) {
          setError('Error de conexión');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchWithAuth]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.listColumn}>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>Biblioteca y Secretaría: elegí una categoría.</Text>
      {list.map((c) => (
        <TouchableOpacity
          key={c.code}
          style={[styles.card, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.push(`/area/biblioteca/${c.code}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="folder-open" size={24} color={colors.primary} style={styles.cardIcon} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{c.nombre}</Text>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
      {list.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>No hay categorías cargadas.</Text>
      )}
      </View>
    </ScrollView>
  );
}

const LIST_MAX_WIDTH = 560;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  listColumn: { width: '100%', maxWidth: LIST_MAX_WIDTH },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  intro: { fontSize: 15, marginBottom: 20 },
  error: { fontSize: 16 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, marginBottom: 12 },
  cardIcon: { marginRight: 14 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  empty: { fontSize: 15 },
});
