import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type CuerpoRow = {
  id: number;
  sigla: string;
  cuerpo: string;
  folder_id: number | null;
  archivo_count: number;
  planilla_cargada?: boolean;
};

export default function AdminTesoreriaIndexScreen() {
  const { fetchWithAuth, token } = useAuth();
  const [rows, setRows] = useState<CuerpoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingLibro, setImportingLibro] = useState(false);
  const libroInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiPath('/api/tesoreria/admin/cuerpos'));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Error al cargar');
        setRows([]);
        return;
      }
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError('Error de conexión');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const runImportLibro = async (file: File | { uri: string; name: string; mimeType?: string }) => {
    if (!token) {
      Alert.alert('Sesión', 'No hay token de acceso.');
      return;
    }
    setImportingLibro(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web' && file instanceof File) {
        formData.append('file', file);
      } else if (file && typeof file === 'object' && 'uri' in file) {
        (formData as unknown as { append: (k: string, v: unknown) => void }).append('file', {
          uri: file.uri,
          name: file.name,
          type:
            file.mimeType ||
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
      const res = await fetch(apiPath('/api/tesoreria/admin/import-libro-planillas'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', typeof data?.error === 'string' ? data.error : 'No se pudo importar');
        return;
      }
      const n = typeof data.importadas === 'number' ? data.importadas : 0;
      const miss = Array.isArray(data.sin_hoja) ? data.sin_hoja.length : 0;
      Alert.alert(
        'Libro importado',
        `Planillas guardadas: ${n}. Cuerpos sin hoja con el mismo nombre en el Excel: ${miss}.`
      );
      await load();
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setImportingLibro(false);
    }
  };

  const pickLibroPlanillas = async () => {
    if (Platform.OS === 'web') {
      libroInputRef.current?.click();
      return;
    }
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      await runImportLibro({
        uri: a.uri,
        name: a.name || 'libro.xlsx',
        mimeType: a.mimeType ?? undefined,
      });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo elegir el archivo');
    }
  };

  const onLibroWebChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void runImportLibro(f);
  };

  if (loading && rows.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {Platform.OS === 'web' ? (
        <input
          ref={libroInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          style={{ display: 'none' }}
          onChange={onLibroWebChange}
        />
      ) : null}
      <Text style={styles.intro}>
        Subí el estado de cuentas mensual (Excel) por cada logia. Los hermanos lo verán en Tesorería según su cuerpo.
      </Text>
      <TouchableOpacity
        style={[styles.importLibro, importingLibro && styles.importLibroDisabled]}
        onPress={() => void pickLibroPlanillas()}
        disabled={importingLibro}
        activeOpacity={0.8}
      >
        <Ionicons name="cloud-upload-outline" size={24} color={colors.primaryLight} />
        <View style={styles.importLibroText}>
          <Text style={styles.importLibroTitle}>
            {importingLibro ? 'Importando…' : 'Importar libro completo (planillas por cuerpo)'}
          </Text>
          <Text style={styles.importLibroSub}>
            Subí el Excel de estado de cuentas: cada solapa con el nombre del cuerpo (ej. LP14 CONCORDIA) queda
            disponible para los hermanos de ese cuerpo en Tesorería.
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.linkResumen}
        onPress={() => router.push('/area/admin/resumen-estado-cuentas' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="stats-chart" size={22} color={colors.primary} />
        <Text style={styles.linkResumenText}>Ver resumen global (solapa RESUMEN)</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {rows.map((r) => (
        <TouchableOpacity
          key={r.id}
          style={styles.card}
          onPress={() => router.push(`/area/admin/tesoreria/cuerpo/${r.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={styles.cardIcon}>
            <Ionicons name="business" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{r.sigla}</Text>
            <Text style={styles.cardSub} numberOfLines={2}>
              {r.cuerpo}
            </Text>
            <Text style={styles.cardMeta}>
              {r.planilla_cargada ? 'Planilla Excel · ' : ''}
              {r.archivo_count === 0 ? 'Sin archivos' : `${r.archivo_count} archivo(s)`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
      {rows.length === 0 && !error ? (
        <Text style={styles.empty}>No hay cuerpos cargados. Creá logias en Cuerpos primero.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  intro: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, lineHeight: 20 },
  linkResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  linkResumenText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  importLibro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    gap: 12,
  },
  importLibroDisabled: { opacity: 0.65 },
  importLibroText: { flex: 1, minWidth: 0 },
  importLibroTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  importLibroSub: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  err: { color: colors.primary, marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardIcon: { marginRight: 12 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  empty: { color: colors.textMuted, fontSize: 15 },
});
