import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';
import { TesoreriaPlanillaHermano } from '@/components/TesoreriaPlanillaHermano';

type Planilla = {
  sheet_name: string;
  updated_at: string;
  rows?: (string | null)[][];
} | null;

type Block = {
  cuerpo_id: number;
  cuerpo: string;
  sigla: string | null;
  planilla?: Planilla;
};

function matrizFilas(raw: unknown): (string | null)[][] {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

function tieneFilas(p: Planilla): boolean {
  return matrizFilas(p?.rows).length > 0;
}

export default function TesoreriaScreen() {
  const { fetchWithAuth } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async () => {
    const first = !hasLoadedOnce.current;
    if (first) setLoading(true);
    try {
      const res = await fetchWithAuth(apiPath('/api/tesoreria?embed_planilla=1'));
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Error al cargar');
        setBlocks([]);
      } else {
        const list = Array.isArray(json.blocks) ? json.blocks : [];
        setBlocks(
          list.map((b: Block) => ({
            ...b,
            planilla: b.planilla ?? null,
          }))
        );
        setError(null);
      }
    } catch {
      setError('Error de conexión');
      setBlocks([]);
    } finally {
      hasLoadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && blocks.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.hint}>
          Un administrador debe subir el Excel por logia o importar el libro completo en Administración → Estados
          de cuenta. Después podés deslizar hacia abajo para actualizar.
        </Text>
      </ScrollView>
    );
  }

  const noCuerpos = blocks.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.subtitle}>Planilla del Excel · una solapa por logia</Text>

      <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={styles.infoCardText}>
          Primero movimientos y saldo del cuerpo; debajo, cuotas y listado de miembros, como en la planilla impresa.
        </Text>
      </View>

      {noCuerpos ? (
        <Text style={styles.empty}>
          No tenés cuerpos asignados en tu perfil. Consultá al administrador.
        </Text>
      ) : (
        blocks.map((block) => (
          <View
            key={block.cuerpo_id}
            style={[styles.bodyCard, { backgroundColor: colors.backgroundCard }]}
          >
            {tieneFilas(block.planilla ?? null) ? (
              <>
                <Text style={styles.cardTitle} numberOfLines={3}>
                  {block.planilla!.sheet_name}
                </Text>
                <Text style={styles.metaSecondary}>
                  Actualizado:{' '}
                  {block.planilla!.updated_at
                    ? new Date(block.planilla!.updated_at).toLocaleString('es-AR')
                    : '—'}
                </Text>
                <View style={styles.tableShell}>
                  <TesoreriaPlanillaHermano rows={matrizFilas(block.planilla!.rows)} />
                </View>
              </>
            ) : (
              <Text style={styles.cardTitle}>
                {block.sigla ? `${block.sigla} – ` : ''}
                {block.cuerpo}
              </Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

/** Misma base visual que admin/resumen-estado-cuentas + ResumenEstadoCuentasBody */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  infoCardText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  bodyCard: { borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  metaSecondary: { fontSize: 11, color: colors.textMuted, marginBottom: 12 },
  tableShell: { borderRadius: 12, overflow: 'hidden' },
  empty: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  errorText: { color: '#e57373', fontSize: 15, marginBottom: 12 },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
