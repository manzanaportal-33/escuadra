import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

const TIPO_LABEL: Record<string, string> = {
  ingreso: 'Solicitud de Ingreso',
  reingreso: 'Solicitud de Re-Ingreso',
  ascenso: 'Ascenso Troncal',
  dimision: 'Dimisión',
  pase: 'Pase',
};

const ESTADOS_SUGERIDOS = ['pendiente', 'en_curso', 'finalizado', 'rechazado'];

type AdjuntoMeta = {
  id: number;
  nombre_original: string;
  created_at: string;
};

type Tramite = {
  id: number;
  tipo: string;
  nombre: string;
  apellido: string;
  mail: string | null;
  cuerpo: string;
  cuerpo_pasa: string | null;
  plomo: string | null;
  fecha_propuesta: string | null;
  datos_json: string | null;
  estado: string | null;
  created_at: string;
  user_id: string | null;
  adjuntos?: AdjuntoMeta[];
};

function formatDatosJson(raw: string | null) {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    return JSON.stringify(j, null, 2);
  } catch {
    return raw;
  }
}

export default function AdminTramiteDetalleScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = String(rawId);
  const { fetchWithAuth, user } = useAuth();
  const isAdmin = user?.user_level === 1;
  const [row, setRow] = useState<Tramite | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin || !id) return;
    try {
      const res = await fetchWithAuth(apiPath(`/api/tramites/admin/${id}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Error al cargar');
      setRow(data as Tramite);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, isAdmin, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const descargarAdjunto = async (adj: AdjuntoMeta) => {
    try {
      const res = await fetchWithAuth(
        apiPath(`/api/tramites/admin/${id}/adjuntos/${adj.id}/signed-url`)
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', typeof data?.error === 'string' ? data.error : 'No se pudo obtener el enlace');
        return;
      }
      const url = typeof data?.url === 'string' ? data.url : '';
      if (!url) {
        Alert.alert('Error', 'Respuesta inválida del servidor.');
        return;
      }
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else Alert.alert('Error', 'No se pudo abrir el archivo.');
    } catch {
      Alert.alert('Error', 'Error de conexión');
    }
  };

  const cambiarEstado = async (nuevo: string) => {
    if (!row || nuevo === row.estado) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(apiPath(`/api/tramites/admin/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', typeof data?.error === 'string' ? data.error : 'No se pudo guardar');
        return;
      }
      setRow(data as Tramite);
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Acceso denegado.</Text>
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

  if (error || !row) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>{error || 'No encontrado'}</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Volver al listado</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const datosFmt = formatDatosJson(row.datos_json);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.tipo}>{TIPO_LABEL[row.tipo] || row.tipo}</Text>
      <Text style={styles.estadoActual}>Estado: {row.estado || '—'}</Text>

      <Text style={styles.section}>Cambiar estado</Text>
      <View style={styles.estadosRow}>
        {ESTADOS_SUGERIDOS.map((e) => (
          <TouchableOpacity
            key={e}
            style={[styles.estadoChip, row.estado === e && styles.estadoChipActive]}
            onPress={() => cambiarEstado(e)}
            disabled={saving}
          >
            <Text style={[styles.estadoChipText, row.estado === e && styles.estadoChipTextActive]}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {row.adjuntos && row.adjuntos.length > 0 ? (
        <>
          <Text style={styles.section}>Solicitud adjunta</Text>
          <View style={styles.adjuntosBox}>
            {row.adjuntos.map((adj, idx) => (
              <TouchableOpacity
                key={adj.id}
                style={[
                  styles.adjuntoRow,
                  idx === row.adjuntos!.length - 1 ? styles.adjuntoRowLast : null,
                ]}
                onPress={() => descargarAdjunto(adj)}
                activeOpacity={0.75}
              >
                <Text style={styles.adjuntoName} numberOfLines={2}>
                  {adj.nombre_original}
                </Text>
                <Text style={styles.adjuntoAction}>Descargar</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.section}>Datos</Text>
      <View style={styles.block}>
        <Row label="Nombre" value={`${row.nombre} ${row.apellido}`} />
        <Row label="Mail" value={row.mail || '—'} />
        <Row label="Cuerpo / logia" value={row.cuerpo} />
        <Row label="Cuerpo al que pasa" value={row.cuerpo_pasa || '—'} />
        <Row label="Plomo" value={row.plomo || '—'} />
        <Row label="Fecha propuesta" value={row.fecha_propuesta || '—'} />
        <Row label="Enviado" value={new Date(row.created_at).toLocaleString('es-AR')} />
        <Row label="ID usuario (auth)" value={row.user_id || '—'} />
        <Row label="ID trámite" value={String(row.id)} />
      </View>

      {datosFmt ? (
        <>
          <Text style={styles.section}>Información adicional</Text>
          <Text style={styles.pre}>{datosFmt}</Text>
        </>
      ) : null}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Volver al listado</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowLine}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  err: { color: colors.primary, fontSize: 16, textAlign: 'center' },
  tipo: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 6 },
  estadoActual: { fontSize: 15, color: colors.primary, marginBottom: 16 },
  section: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 10 },
  estadosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  estadoChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.backgroundCard,
  },
  estadoChipActive: { backgroundColor: colors.primary + '33', borderWidth: 1, borderColor: colors.primary },
  estadoChipText: { fontSize: 14, color: colors.textMuted },
  estadoChipTextActive: { color: colors.primary, fontWeight: '600' },
  block: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
  },
  rowLine: { marginBottom: 12 },
  rowLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  rowValue: { fontSize: 16, color: colors.text },
  pre: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundCard,
    padding: 12,
    borderRadius: 10,
  },
  backBtn: { marginTop: 28, paddingVertical: 12 },
  backBtnText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  backLink: { marginTop: 16 },
  backLinkText: { color: colors.primary, fontSize: 15 },
  adjuntosBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjuntoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  adjuntoName: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  adjuntoAction: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  adjuntoRowLast: { borderBottomWidth: 0 },
});
