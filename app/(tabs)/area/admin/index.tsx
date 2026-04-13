import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

const ALL_ADMIN_ITEMS = [
  { title: 'Hermanos', subtitle: 'Grupos y usuarios', href: '/area/admin/hermanos', icon: 'people' as const },
  {
    title: 'Registro de accesos',
    subtitle: 'Quién ingresó y desde qué IP / navegador (solo superadmin)',
    href: '/area/admin/accesos',
    icon: 'finger-print' as const,
  },
  { title: 'Cuerpos', subtitle: 'Cuerpos escocistas', href: '/area/admin/cuerpos', icon: 'business' as const },
  {
    title: 'Mensajes (contacto)',
    subtitle: 'Consultas de Contáctenos: nuevos y respondidos',
    href: '/area/admin/contacto',
    icon: 'chatbubbles-outline' as const,
  },
  { title: 'Solicitudes', subtitle: 'Trámites enviados por los hermanos', href: '/area/admin/tramites', icon: 'document-text' as const },
  { title: 'Otros Orientes', subtitle: 'Otros orientes', href: '/area/admin/orientes', icon: 'globe' as const },
  { title: 'Biblioteca', subtitle: 'Carpetas y archivos (PDF, Word, Excel)', href: '/area/admin/biblioteca', icon: 'folder-open' as const },
  { title: 'Estados de cuenta', subtitle: 'Excel mensual por logia (tesorería)', href: '/area/admin/tesoreria', icon: 'wallet' as const },
  {
    title: 'Resumen Estado de Cuentas',
    subtitle: 'Totales y saldos (solapa RESUMEN del Excel)',
    href: '/area/admin/resumen-estado-cuentas',
    icon: 'stats-chart' as const,
  },
];

export default function AdminIndexScreen() {
  const { user } = useAuth();
  const items = useMemo(
    () =>
      ALL_ADMIN_ITEMS.filter(
        (item) => item.href !== '/area/admin/accesos' || user?.is_superadmin === true
      ),
    [user?.is_superadmin]
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>Administración del área reservada.</Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item.href}
          style={[styles.card, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.push(item.href as any)}
          activeOpacity={0.8}
        >
          <Ionicons name={item.icon} size={28} color={colors.primary} style={styles.cardIcon} />
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 15, marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, marginBottom: 12 },
  cardIcon: { marginRight: 14 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
});
