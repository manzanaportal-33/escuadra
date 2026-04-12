import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert, RefreshControl, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { BibliotecaItemsGrid, type BibliotecaGridItem } from '@/components/BibliotecaItemsGrid';

type Item = BibliotecaGridItem & { download_count?: number; created_at?: string };

export default function BibliotecaCarpetaScreen() {
  const { fetchWithAuth, user } = useAuth();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [carpetaNombre, setCarpetaNombre] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.user_level === 1;

  const load = async () => {
    if (!code) return;
    try {
      const res = await fetchWithAuth(apiPath(`/api/biblioteca/carpeta/${code}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setCarpetaNombre(data.carpeta || '');
      setFolderId(data.folderId ?? null);
      setItems(Array.isArray(data.items) ? data.items : []);
      setError(null);
    } catch (e) {
      if (e instanceof Error && e.message !== 'SESSION_EXPIRED') {
        setError(e.message || 'Error de conexión');
        setItems([]);
        setFolderId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [code]);

  const openFile = async (id: number) => {
    try {
      const res = await fetchWithAuth(apiPath(`/api/biblioteca/archivo/${id}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : 'No se pudo abrir el archivo';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Biblioteca', msg);
        return;
      }
      if (data?.url) await Linking.openURL(data.url);
      else Alert.alert('Error', 'No se pudo abrir el archivo');
    } catch {
      Alert.alert('Error', 'No se pudo abrir el archivo');
    }
  };

  const eliminar = (it: Item) => {
    const mensaje = it.is_folder
      ? `¿Eliminar la carpeta "${it.filename}" y todo su contenido?`
      : `¿Eliminar "${it.filename}"?`;

    const ejecutarEliminar = async () => {
      try {
        const res = await fetchWithAuth(apiPath(`/api/biblioteca/item/${it.id}`), {
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
      Alert.alert('Eliminar', mensaje, [
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
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={colors.primary} />
        <Text style={styles.backBtnText}>Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{carpetaNombre || 'Carpeta'}</Text>
      {isAdmin && folderId != null && (
        <View style={styles.adminBar}>
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push({ pathname: '/area/admin/biblioteca/subir-archivo', params: { folder_id: String(folderId) } })}
          >
            <Ionicons name="cloud-upload" size={20} color={colors.text} />
            <Text style={styles.adminBtnText}>Subir archivo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adminBtnOutline}
            onPress={() => router.push({ pathname: '/area/admin/biblioteca/nueva-carpeta', params: { parent_id: String(folderId) } })}
          >
            <Ionicons name="folder-open" size={20} color={colors.primary} />
            <Text style={styles.adminBtnTextOutline}>Nueva subcarpeta</Text>
          </TouchableOpacity>
        </View>
      )}
      <BibliotecaItemsGrid
        items={items}
        isAdmin={isAdmin}
        folderHrefPrefix="/area/biblioteca/carpeta"
        onOpenFile={openFile}
        onDelete={eliminar}
      />
      {items.length === 0 && <Text style={styles.empty}>No hay archivos en esta carpeta.</Text>}
      </View>
    </ScrollView>
  );
}

const LIST_MAX_WIDTH = 960;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  listColumn: { width: '100%', maxWidth: LIST_MAX_WIDTH },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  error: { color: colors.primary, fontSize: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtnText: { marginLeft: 8, fontSize: 16, color: colors.primary },
  title: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 },
  adminBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  adminBtnText: { marginLeft: 8, fontSize: 15, color: colors.text, fontWeight: '600' },
  adminBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  adminBtnTextOutline: { marginLeft: 8, fontSize: 15, color: colors.primary, fontWeight: '600' },
  empty: { color: colors.textMuted, fontSize: 15 },
});
