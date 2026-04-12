import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type Oriente = {
  id: number;
  pais: string;
  web?: string;
  direccion?: string;
  mail_institucional?: string;
  telefono?: string;
  soberano?: string;
};

export default function AdminOrientesScreen() {
  const { token } = useAuth();
  const [list, setList] = useState<Oriente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch(apiPath('/api/orientes'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setList(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const eliminar = (id: number, pais: string) => {
    Alert.alert(
      'Eliminar Oriente',
      `¿Eliminar "${pais}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(apiPath(`/api/orientes/${id}`), {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                Alert.alert('Error', d.error || 'No se pudo eliminar');
                return;
              }
              load();
            } catch {
              Alert.alert('Error', 'Error de conexión');
            }
          },
        },
      ]
    );
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push('/area/admin/orientes/nuevo')}
      >
        <Ionicons name="add-circle" size={24} color={colors.primary} />
        <Text style={styles.addBtnText}>Agregar Oriente</Text>
      </TouchableOpacity>
      {list.map((o) => (
        <View key={o.id} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{o.pais}</Text>
            {o.soberano ? (
              <Text style={styles.rowMeta}>{o.soberano}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push(`/area/admin/orientes/editar/${o.id}`)}
          >
            <Ionicons name="pencil" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => eliminar(o.id, o.pais)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ))}
      {list.length === 0 && (
        <Text style={styles.empty}>No hay otros orientes cargados.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  error: { color: colors.primary, fontSize: 16 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  addBtnText: { marginLeft: 10, fontSize: 16, color: colors.primary, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  iconBtn: { padding: 8 },
  empty: { color: colors.textMuted, fontSize: 15 },
});
