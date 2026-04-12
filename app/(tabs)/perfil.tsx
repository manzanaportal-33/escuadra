import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const paddingTop = Math.max(insets.top, 12);
  const paddingHorizontal = 20;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop, paddingHorizontal }]}>
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Nombre</Text>
        <Text style={[styles.value, { color: colors.text }]}>{user?.nombre ?? '-'}</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
        <Text style={[styles.value, { color: colors.text }]}>{user?.email ?? '-'}</Text>
      </View>
      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: colors.primary }]}
        onPress={handleLogout}
      >
        <Text style={[styles.logoutText, { color: colors.primary }]}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingVertical: 20 },
  card: { borderRadius: 16, padding: 24, marginBottom: 24 },
  label: { fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 17, marginBottom: 18, textTransform: 'capitalize' },
  logoutButton: { backgroundColor: 'transparent', borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '600' },
});
