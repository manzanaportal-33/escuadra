import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

type CuerpoDetalle = {
  id: number;
  sigla: string;
  cuerpo: string;
  localidad?: string | null;
  trabajos?: string | null;
  status?: number;
  folder?: string | null;
  presidente?: string | null;
  secretario?: string | null;
  tesorero?: string | null;
};

function Field({ label, value }: { label: string; value: string }) {
  const v = value?.trim();
  if (!v) {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldEmpty}>—</Text>
      </View>
    );
  }
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} selectable>
        {v}
      </Text>
    </View>
  );
}

export default function CuerpoDetalleScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = parseInt(String(rawId), 10);
  const navigation = useNavigation();
  const { fetchWithAuth, user } = useAuth();
  const [data, setData] = useState<CuerpoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (Number.isNaN(id)) {
      setError('ID inválido');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth(apiPath(`/api/cuerpos/${id}`));
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json?.error === 'string' ? json.error : 'No se pudo cargar');
        setData(null);
        return;
      }
      setData(json as CuerpoDetalle);
      setError(null);
    } catch {
      setError('Error de conexión');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, id]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    if (data?.sigla && data?.cuerpo) {
      const t = `${data.sigla} – ${data.cuerpo}`;
      navigation.setOptions({ title: t.length > 42 ? `${t.slice(0, 40)}…` : t });
    }
  }, [data, navigation]);

  const esMio = user?.cuerpo_ids?.map(Number).includes(id);
  const activo = data?.status == null || data.status === 1;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error || 'Sin datos'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {esMio ? (
        <View style={styles.badgeMio}>
          <Text style={styles.badgeMioText}>Tu cuerpo</Text>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <Text style={styles.cardKicker}>Identificación</Text>
        <Field label="Sigla" value={data.sigla || ''} />
        <Field label="Nombre del cuerpo" value={data.cuerpo || ''} />
        <Field label="Número de registro" value={String(data.id)} />
        <Field label="Estado" value={activo ? 'Activo' : 'Inactivo'} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <Text style={styles.cardKicker}>Ubicación y biblioteca</Text>
        <Field label="Localidad" value={data.localidad || ''} />
        <Field label="Carpeta (biblioteca)" value={data.folder || ''} />
        <Field label="Trabajos" value={data.trabajos || ''} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <Text style={styles.cardKicker}>Autoridades</Text>
        <Field label="Presidente" value={data.presidente || ''} />
        <Field label="Secretario" value={data.secretario || ''} />
        <Field label="Tesorero" value={data.tesorero || ''} />
      </View>

      <Text style={styles.footerNote}>
        Las observaciones internas no se muestran en esta vista pública del cuerpo.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
  error: { color: '#e57373', fontSize: 15, textAlign: 'center' },
  badgeMio: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '33',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 14,
  },
  badgeMioText: { fontSize: 12, fontWeight: '700', color: colors.primaryLight },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fieldValue: { fontSize: 16, color: colors.text, lineHeight: 22 },
  fieldEmpty: { fontSize: 16, color: colors.textMuted },
  footerNote: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 4 },
});
