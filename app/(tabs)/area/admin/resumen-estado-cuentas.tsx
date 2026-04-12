import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';
import {
  ResumenEstadoCuentasBody,
  type ResumenHeaderFields,
  type CuerpoResumen,
} from '@/components/ResumenEstadoCuentasBody';

type ResumenPayload = ResumenHeaderFields & {
  sheet?: string;
  cuerpos?: CuerpoResumen[];
};

function isLocalHost(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');
}

export default function ResumenEstadoCuentasScreen() {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<ResumenPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiPath('/api/tesoreria/admin/resumen-estado-cuentas'));
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json?.error === 'string' ? json.error : 'No se pudo cargar el resumen');
        setData(null);
        return;
      }
      setData(json as ResumenPayload);
      setError(null);
    } catch {
      setError('Error de conexión');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <Text style={styles.errorText}>{error}</Text>
        {Platform.OS === 'web' && typeof window !== 'undefined' && isLocalHost() ? (
          <Text style={styles.hint}>
            En tu máquina: generá <Text style={styles.mono}>data/resumen_estado_cuentas.json</Text> con{' '}
            <Text style={styles.mono}>python3 scripts/parse_resumen.py &quot;…xlsx&quot;</Text> o{' '}
            <Text style={styles.mono}>{'cd server && npm run parse:resumen -- "…xlsx"'}</Text>.
            Commiteá ese archivo y redeploy para verlo en producción.
          </Text>
        ) : (
          <Text style={styles.hint}>
            En el servidor (p. ej. Vercel) podés definir{' '}
            <Text style={styles.mono}>RESUMEN_ESTADO_CUENTAS_GOOGLE_DRIVE_FILE_ID</Text> o{' '}
            <Text style={styles.mono}>RESUMEN_ESTADO_CUENTAS_EXCEL_URL</Text> para leer el .xlsx desde Drive u otra URL.
            Si no, el resumen sale de <Text style={styles.mono}>data/resumen_estado_cuentas.json</Text> en el repo.
          </Text>
        )}
      </ScrollView>
    );
  }

  const header: ResumenHeaderFields = {
    fecha_corte: data?.fecha_corte,
    source: data?.source,
    indicadores: data?.indicadores,
    totales_por_tipo: data?.totales_por_tipo,
  };
  const cuerpos = data?.cuerpos || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <ResumenEstadoCuentasBody header={header} cuerpos={cuerpos} detalleSectionTitle="Detalle por cuerpo" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { color: '#e57373', fontSize: 15, marginBottom: 12 },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  mono: { fontFamily: Platform.select({ web: 'ui-monospace, monospace', default: undefined }) },
});
