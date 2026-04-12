import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { BibliotecaItemsGrid, type BibliotecaGridItem } from '@/components/BibliotecaItemsGrid';

type Item = BibliotecaGridItem & { download_count?: number; created_at?: string };

export default function BibliotecaCategoriaScreen() {
  const { fetchWithAuth, token, user } = useAuth();
  const { categoria } = useLocalSearchParams<{ categoria: string }>();
  const [carpetaNombre, setCarpetaNombre] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.user_level === 1;

  const load = useCallback(async () => {
    if (!categoria) return;
    try {
      const res = await fetchWithAuth(apiPath(`/api/biblioteca/carpeta/${categoria}`));
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al cargar');
        setItems([]);
        setFolderId(null);
      } else {
        setCarpetaNombre(data.carpeta || '');
        setFolderId(data.folderId ?? null);
        setItems(Array.isArray(data.items) ? data.items : []);
        setError(null);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== 'SESSION_EXPIRED') setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [categoria, fetchWithAuth]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (categoria) load();
    }, [categoria, load])
  );

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.listColumn}>
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
      {items.length === 0 && (
        <Text style={styles.empty}>No hay archivos en esta categoría.</Text>
      )}
      </View>
    </ScrollView>
  );
}

/** Ancho máximo del bloque (cuadrícula de íconos) */
const LIST_MAX_WIDTH = 960;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  listColumn: { width: '100%', maxWidth: LIST_MAX_WIDTH },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  error: { color: colors.primary, fontSize: 16 },
  empty: { color: colors.textMuted, fontSize: 15 },
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
});
