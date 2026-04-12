import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

type Detalle = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  mensaje: string;
  estado: string;
  respuesta: string | null;
  responded_at: string | null;
  created_at: string;
};

export default function ContactoDetalleHermanoScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw);
  const { fetchWithAuth } = useAuth();
  const [row, setRow] = useState<Detalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiPath(`/api/contacto/mios/${id}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Error al cargar');
      setRow(data as Detalle);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, id]);

  useEffect(() => {
    void load();
  }, [load]);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backT}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const respondido = row.estado === 'respondido' && row.respuesta;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={[styles.pill, respondido ? styles.pillOk : styles.pillWait]}>
        <Text style={styles.pillTxt}>{respondido ? 'Respondido' : 'Pendiente de respuesta'}</Text>
      </View>

      <Text style={styles.section}>Tu mensaje</Text>
      <Text style={styles.meta}>Enviado el {new Date(row.created_at).toLocaleString('es-AR')}</Text>
      <View style={styles.block}>
        <Text style={styles.body}>{row.mensaje}</Text>
      </View>

      <Text style={styles.section}>Respuesta de la institución</Text>
      {respondido ? (
        <>
          <Text style={styles.meta}>
            {row.responded_at ? `Registrada el ${new Date(row.responded_at).toLocaleString('es-AR')}` : ''}
          </Text>
          <View style={[styles.block, styles.blockResp]}>
            <Text style={styles.body}>{row.respuesta}</Text>
          </View>
          <Text style={styles.hint}>
            Esta es la respuesta cargada en el sistema por secretaría / administración. Si no recibiste también un
            correo, podés usar los datos de contacto habituales de la logia.
          </Text>
        </>
      ) : (
        <View style={styles.block}>
          <Text style={styles.pending}>
            Cuando un administrador conteste, el texto de la respuesta se mostrará aquí. Podés volver más tarde o
            revisar la bandeja de entrada del correo que indicaste: {row.email}
          </Text>
        </View>
      )}

      <TouchableOpacity onPress={() => router.push('/area/contacto/mis-mensajes' as any)} style={styles.back}>
        <Text style={styles.backT}>Volver a mis consultas</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  err: { color: colors.error, fontSize: 16, textAlign: 'center' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 16 },
  pillWait: { backgroundColor: colors.textMuted + '33' },
  pillOk: { backgroundColor: colors.success + '33' },
  pillTxt: { fontSize: 12, fontWeight: '800', color: colors.text },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meta: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  block: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockResp: { borderColor: colors.primary + '55', backgroundColor: colors.backgroundElevated },
  body: { fontSize: 15, color: colors.text, lineHeight: 23 },
  pending: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 12, lineHeight: 18 },
  back: { marginTop: 24 },
  backT: { fontSize: 16, color: colors.primary, fontWeight: '600' },
});
