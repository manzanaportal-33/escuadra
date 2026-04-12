import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export default function CambioContrasenaScreen() {
  const { fetchWithAuth } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    if (!actual.trim()) {
      if (Platform.OS === 'web') window.alert('Ingresá tu contraseña actual.');
      else Alert.alert('Campo requerido', 'Ingresá tu contraseña actual.');
      return;
    }
    if (!nueva.trim() || nueva.length < 6) {
      if (Platform.OS === 'web') window.alert('La nueva contraseña debe tener al menos 6 caracteres.');
      else Alert.alert('Contraseña', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      if (Platform.OS === 'web') window.alert('La confirmación no coincide con la nueva contraseña.');
      else Alert.alert('Contraseña', 'La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(apiPath('/api/users/me/password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: actual,
          new_password: nueva,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : 'No se pudo actualizar la contraseña';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
        return;
      }
      setActual('');
      setNueva('');
      setConfirmar('');
      const ok = typeof data?.message === 'string' ? data.message : 'Contraseña actualizada correctamente.';
      if (Platform.OS === 'web') window.alert(ok);
      else Alert.alert('Listo', ok);
    } catch (e) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') return;
      const msg = 'Error de conexión';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Ingresá tu contraseña actual y la nueva contraseña que querés usar.
        </Text>

        <Text style={styles.label}>Contraseña actual</Text>
        <TextInput
          style={styles.input}
          value={actual}
          onChangeText={setActual}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Nueva contraseña</Text>
        <TextInput
          style={styles.input}
          value={nueva}
          onChangeText={setNueva}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Repetir nueva contraseña</Text>
        <TextInput
          style={styles.input}
          value={confirmar}
          onChangeText={setConfirmar}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          placeholder="Repetí la nueva contraseña"
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={enviar}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={colors.text} />
              <Text style={styles.buttonText}>Guardar contraseña</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, maxWidth: 480, width: '100%', alignSelf: 'center' },
  intro: { fontSize: 15, color: colors.textSecondary, marginBottom: 22, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 18,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '700', color: colors.text },
});
