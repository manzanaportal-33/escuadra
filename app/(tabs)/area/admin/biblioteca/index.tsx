import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type Categoria = { code: string; nombre: string; id: number };

export default function AdminBibliotecaIndexScreen() {
  const { fetchWithAuth } = useAuth();
  const [list, setList] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetchWithAuth(apiPath('/api/biblioteca/categorias'));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setList(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      if (e instanceof Error && e.message !== 'SESSION_EXPIRED') {
        setError(e.message || 'Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const eliminar = (c: Categoria) => {
    const mensaje = `¿Eliminar "${c.nombre}" y todo su contenido?`;

    const ejecutarEliminar = async () => {
      try {
        const res = await fetchWithAuth(apiPath(`/api/biblioteca/item/${c.id}`), {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = data.error || 'No se pudo eliminar';
          if (Platform.OS === 'web') window.alert(err);
          else Alert.alert('Error', err);
          return;
        }
        load();
      } catch {
        if (Platform.OS === 'web') window.alert('Error de conexión');
        else Alert.alert('Error', 'Error de conexión');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(mensaje)) ejecutarEliminar();
    } else {
      Alert.alert('Eliminar carpeta', mensaje, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: ejecutarEliminar },
      ]);
    }
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
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <View style={styles.listColumn}>
      <Text style={styles.screenTitle}>Biblioteca (admin)</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/area/admin/biblioteca/nueva-carpeta')}
        >
          <Ionicons name="add-circle" size={24} color={colors.primary} />
          <Text style={styles.addBtnText}>Nueva carpeta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => router.push('/area/admin/biblioteca/subir-archivo')}
        >
          <Ionicons name="cloud-upload" size={24} color={colors.text} />
          <Text style={styles.uploadBtnText}>Subir archivo</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>PDF, Word o Excel. Entrá a una carpeta para ver su contenido o subir ahí.</Text>
      <Text style={styles.sectionTitle}>Carpetas</Text>
      {list.map((c) => (
        <View key={c.code} style={styles.row}>
          <TouchableOpacity
            style={styles.rowMain}
            onPress={() => router.push(`/area/admin/biblioteca/${c.code}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="folder-open" size={24} color={colors.primary} style={styles.rowIcon} />
            <Text style={styles.rowTitle}>{c.nombre}</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => eliminar(c)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ))}
      {list.length === 0 && (
        <Text style={styles.empty}>No hay carpetas. Creá una carpeta raíz para empezar.</Text>
      )}
      </View>
    </ScrollView>
  );
}

const LIST_MAX_WIDTH = 560;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  listColumn: { width: '100%', maxWidth: LIST_MAX_WIDTH },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  error: { color: colors.primary, fontSize: 16 },
  screenTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  addBtnText: { marginLeft: 10, fontSize: 16, color: colors.primary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  uploadBtnText: { marginLeft: 10, fontSize: 16, color: colors.text, fontWeight: '600' },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deleteBtn: { padding: 8 },
  rowIcon: { marginRight: 12 },
  rowTitle: { flex: 1, fontSize: 16, color: colors.text },
  empty: { color: colors.textMuted, fontSize: 15 },
});
