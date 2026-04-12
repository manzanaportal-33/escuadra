import { useState, useEffect, useRef, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { BibliotecaItemsGrid, type BibliotecaGridItem } from '@/components/BibliotecaItemsGrid';

type Item = BibliotecaGridItem & { download_count?: number; created_at?: string };

export default function AdminBibliotecaCarpetaScreen() {
  const { fetchWithAuth, token } = useAuth();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [carpetaNombre, setCarpetaNombre] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      Alert.alert(
        'Eliminar',
        mensaje,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: ejecutarEliminar },
        ]
      );
    }
  };

  const load = async () => {
    if (!code) return;
    try {
      const res = await fetchWithAuth(apiPath(`/api/biblioteca/carpeta/${code}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setCarpetaNombre(data.carpeta || '');
      setFolderId(data.folderId ?? null);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      if (e instanceof Error && e.message !== 'SESSION_EXPIRED') {
        Alert.alert('Error', e.message || 'Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [code]);

  useFocusEffect(
    useCallback(() => {
      if (code) load();
    }, [code])
  );

  const pickAndUpload = async () => {
    if (uploading) return;
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    try {
      const DocumentPicker = require('expo-document-picker').default;
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      await doUpload(result.assets[0]);
    } catch (e) {
      if ((e as Error).message?.includes('canceled')) return;
      Alert.alert('Error', 'No se pudo abrir el selector de archivos. ¿Instalaste expo-document-picker?');
    }
  };

  const doUpload = async (file: { uri: string; name: string; mimeType?: string } | File) => {
    if (!token) return;
    setUploading(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web' && file instanceof File) {
        formData.append('file', file);
      } else if (file && typeof file === 'object' && 'uri' in file) {
        (formData as any).append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        });
      }
      if (folderId != null) formData.append('folder_id', String(folderId));

      const res = await fetchWithAuth(apiPath('/api/biblioteca/upload'), {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', data.error || 'No se pudo subir el archivo');
        return;
      }
      load();
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const onWebFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = '';
  };

  const openFile = async (id: number) => {
    try {
      const res = await fetchWithAuth(apiPath(`/api/biblioteca/archivo/${id}`));
      const d = await res.json();
      if (d?.url) await Linking.openURL(d.url);
      else Alert.alert('Error', 'No se pudo abrir el archivo');
    } catch {
      Alert.alert('Error', 'No se pudo abrir el archivo');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          onChange={onWebFileSelected}
        />
      )}
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

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/area/admin/biblioteca/nueva-carpeta', params: { parent_id: folderId != null ? String(folderId) : '' } })}
          >
            <Ionicons name="folder-open" size={20} color={colors.primary} />
            <Text style={styles.actionBtnText}>Nueva subcarpeta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.uploadBtnInner, uploading && styles.actionBtnDisabled]} onPress={pickAndUpload} disabled={uploading}>
            <Ionicons name="cloud-upload" size={20} color={colors.text} />
            <Text style={styles.uploadBtnInnerText}>{uploading ? 'Subiendo...' : 'Subir archivo'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Contenido</Text>
        <BibliotecaItemsGrid
          items={items}
          isAdmin
          folderHrefPrefix="/area/admin/biblioteca"
          onOpenFile={openFile}
          onDelete={eliminar}
        />
        {items.length === 0 && (
          <Text style={styles.empty}>Vacío. Creá una subcarpeta o subí un archivo (PDF, Word, Excel).</Text>
        )}
        </View>
      </ScrollView>
    </>
  );
}

const LIST_MAX_WIDTH = 960;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  listColumn: { width: '100%', maxWidth: LIST_MAX_WIDTH },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtnText: { marginLeft: 8, fontSize: 16, color: colors.primary },
  title: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { marginLeft: 8, fontSize: 15, color: colors.primary, fontWeight: '600' },
  uploadBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  uploadBtnInnerText: { marginLeft: 8, fontSize: 15, color: colors.text, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' },
  empty: { color: colors.textMuted, fontSize: 15 },
});
