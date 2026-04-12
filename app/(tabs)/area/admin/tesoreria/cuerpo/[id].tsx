import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type Item = {
  id: number;
  filename: string;
  description?: string;
  created_at?: string;
};

export default function AdminTesoreriaCuerpoScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const cuerpoId = parseInt(String(rawId), 10);
  const { fetchWithAuth, token } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [sigla, setSigla] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notaMes, setNotaMes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (isNaN(cuerpoId)) return;
    try {
      const res = await fetchWithAuth(apiPath(`/api/tesoreria/admin/cuerpo/${cuerpoId}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', typeof data?.error === 'string' ? data.error : 'No se pudo cargar');
        return;
      }
      setTitulo(data.cuerpo || '');
      setSigla(data.sigla || '');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, cuerpoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const doUpload = async (file: File | { uri: string; name: string; mimeType?: string }) => {
    if (!token || isNaN(cuerpoId)) return;
    setUploading(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web' && file instanceof File) {
        formData.append('file', file);
      } else if (file && typeof file === 'object' && 'uri' in file) {
        (formData as any).append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
      formData.append('cuerpo_id', String(cuerpoId));
      if (notaMes.trim()) formData.append('description', notaMes.trim());

      const res = await fetch(apiPath('/api/tesoreria/admin/upload'), {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', typeof data?.error === 'string' ? data.error : 'No se pudo subir');
        return;
      }
      setNotaMes('');
      await load();
      const ps = data?.planilla_sync;
      if (ps?.ok) {
        Alert.alert(
          'Listo',
          `Archivo guardado. Los hermanos ya ven la planilla en Tesorería (${ps.sheet_name || 'hoja'}, ${ps.filas ?? '?'} filas).`
        );
      } else if (ps && !ps.ok) {
        Alert.alert(
          'Archivo subido',
          ps.code === 'no_matching_sheet'
            ? 'No se pudo elegir una solapa automáticamente (varias hojas y ninguna coincide con sigla + nombre del cuerpo). Usá “Importar libro completo” en el índice de tesorería o un Excel con una sola hoja.'
            : `Guardado en biblioteca; la vista en app no se actualizó (${ps.code || 'error'}).`
        );
      } else {
        Alert.alert('Listo', 'Archivo subido.');
      }
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const pickFile = () => {
    if (uploading) return;
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    Alert.alert('Subir Excel', 'En la versión web podés elegir .xlsx desde el explorador. En móvil, próximamente document picker.');
  };

  const onWebFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void doUpload(f);
  };

  const openFile = async (fileId: number) => {
    try {
      const res = await fetchWithAuth(apiPath(`/api/tesoreria/archivo/${fileId}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : 'No se pudo abrir';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Tesorería', msg);
        return;
      }
      if (data?.url) await Linking.openURL(data.url);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el archivo');
    }
  };

  const eliminar = (fileId: number, name: string) => {
    Alert.alert('Eliminar', `¿Quitar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetchWithAuth(apiPath(`/api/tesoreria/admin/item/${fileId}`), { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              Alert.alert('Error', typeof data?.error === 'string' ? data.error : 'No se pudo eliminar');
              return;
            }
            await load();
          } catch {
            Alert.alert('Error', 'Error de conexión');
          }
        },
      },
    ]);
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
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          onChange={onWebFile}
        />
      )}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {sigla ? `${sigla} – ` : ''}
          {titulo}
        </Text>
        <Text style={styles.hint}>Solo Excel (.xls, .xlsx). Podés repetir cada mes; los archivos quedan en orden de fecha.</Text>

        <Text style={styles.label}>Nota / período (opcional)</Text>
        <TextInput
          style={styles.input}
          value={notaMes}
          onChangeText={setNotaMes}
          placeholder="Ej. Marzo 2025"
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          onPress={pickFile}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
              <Text style={styles.uploadBtnText}>Subir Excel</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.section}>Archivos cargados</Text>
        {items.map((it) => (
          <View key={it.id} style={styles.row}>
            <TouchableOpacity style={styles.rowMain} onPress={() => openFile(it.id)} activeOpacity={0.7}>
              <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{it.filename}</Text>
                {it.description ? <Text style={styles.rowDesc}>{it.description}</Text> : null}
                {it.created_at ? (
                  <Text style={styles.rowDate}>{new Date(it.created_at).toLocaleDateString('es-AR')}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => eliminar(it.id, it.filename)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
        {items.length === 0 ? <Text style={styles.empty}>Todavía no hay archivos para esta logia.</Text> : null}

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>Volver al listado</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 18 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 14,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  uploadBtnDisabled: { opacity: 0.7 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  rowText: { flex: 1, marginLeft: 10 },
  rowTitle: { fontSize: 15, color: colors.text },
  rowDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rowDate: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  empty: { color: colors.textMuted, fontSize: 15 },
  back: { marginTop: 20, paddingVertical: 8 },
  backText: { color: colors.primary, fontSize: 15 },
});
