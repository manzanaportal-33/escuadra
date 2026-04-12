import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

const TIPOS = [
  { tipo: 'ingreso', label: 'Solicitud de Ingreso', icon: 'person-add' as const },
  { tipo: 'reingreso', label: 'Solicitud de Re-Ingreso', icon: 'refresh' as const },
  { tipo: 'ascenso', label: 'Ascenso Troncal', icon: 'trending-up' as const },
  { tipo: 'dimision', label: 'Dimisión', icon: 'exit' as const },
  { tipo: 'pase', label: 'Pase', icon: 'swap-horizontal' as const },
];

export default function TramitesIndexScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>Elegí el tipo de trámite que querés iniciar.</Text>
      {TIPOS.map((t) => (
        <TouchableOpacity
          key={t.tipo}
          style={styles.card}
          onPress={() => router.push(`/area/tramites/nuevo/${t.tipo}`)}
          activeOpacity={0.8}
        >
          <Ionicons name={t.icon} size={26} color={colors.primary} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>{t.label}</Text>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 15, color: colors.textSecondary, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  cardIcon: { marginRight: 14 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text },
});
