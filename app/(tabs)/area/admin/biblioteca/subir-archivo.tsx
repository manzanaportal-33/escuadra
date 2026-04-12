import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type Categoria = { code: string; nombre: string; id: number };

export default function AdminSubirArchivoScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ folder_id?: string }>();
  const [carpetas, setCarpetas] = useState<Categoria[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [folderId, setFolderId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiPath('/api/biblioteca/categorias'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          const list = Array.isArray(data) ? data : [];
          setCarpetas(list);
          const fromParam = params.folder_id != null && params.folder_id !== '' ? parseInt(params.folder_id, 10) : NaN;
          if (!isNaN(fromParam)) setFolderId(fromParam);
          else if (list.length > 0) setFolderId(list[0].id);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const doUpload = async (file: File | { uri: string; name: string; mimeType?: string }) => {
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

      const res = await fetch(apiPath('/api/biblioteca/upload'), {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', data.error || 'No se pudo subir el archivo');
        return;
      }
      Alert.alert('Listo', 'Archivo subido correctamente.', [
        { text: 'Subir otro', onPress: () => {} },
        { text: 'Volver', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const pickAndUpload = () => {
    if (uploading) return;
    if (carpetas.length === 0) {
      Alert.alert('Sin carpetas', 'Creá al menos una carpeta raíz antes de subir archivos.');
      return;
    }
    if (folderId === null) {
      Alert.alert('Elegí una carpeta', 'Seleccioná la carpeta de destino arriba.');
      return;
    }
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    (async () => {
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
        Alert.alert('Error', 'No se pudo abrir el selector. ¿Instalaste expo-document-picker?');
      }
    })();
  };

  const onWebFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = '';
  };

  if (loadingList) {
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Subir archivo</Text>
        <Text style={styles.label}>Carpeta de destino</Text>
        {carpetas.length === 0 ? (
          <Text style={styles.empty}>No hay carpetas. Creá una desde Biblioteca.</Text>
        ) : (
          <View style={styles.folderList}>
            {carpetas.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[styles.folderChip, folderId === c.id && styles.folderChipActive]}
                onPress={() => setFolderId(c.id)}
              >
                <Ionicons name="folder-open" size={18} color={folderId === c.id ? colors.text : colors.primary} />
                <Text style={[styles.folderChipText, folderId === c.id && styles.folderChipTextActive]}>{c.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={[styles.uploadBtn, (uploading || folderId === null) && styles.uploadBtnDisabled]}
          onPress={pickAndUpload}
          disabled={uploading || folderId === null}
        >
          <Ionicons name="cloud-upload" size={24} color={colors.text} />
          <Text style={styles.uploadBtnText}>
            {uploading ? 'Subiendo...' : 'Elegir archivo (PDF, Word, Excel)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtnText: { marginLeft: 8, fontSize: 16, color: colors.primary },
  title: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 20 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 10 },
  folderList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.backgroundCard,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  folderChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  folderChipText: { marginLeft: 8, fontSize: 15, color: colors.text },
  folderChipTextActive: { color: colors.text, fontWeight: '600' },
  empty: { color: colors.textMuted, marginBottom: 20 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { marginLeft: 10, fontSize: 17, color: colors.text, fontWeight: '600' },
});
