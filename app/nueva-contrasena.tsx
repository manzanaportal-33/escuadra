import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

function getTokenFromHash(): string | null {
  if (typeof window === 'undefined' || !window.location?.hash) return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return params.get('access_token');
}

export default function NuevaContrasenaScreen() {
  const params = useLocalSearchParams<{ access_token?: string }>();
  const [accessToken, setAccessToken] = useState<string | null>(() => params.access_token ?? null);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (accessToken) return;
    const fromHash = getTokenFromHash();
    if (fromHash) setAccessToken(fromHash);
  }, [accessToken]);

  const handleSubmit = async () => {
    setError('');
    if (!password.trim()) {
      setError('Ingresá la nueva contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== repeatPassword) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }
    const token = accessToken || getTokenFromHash();
    if (!token) {
      setError('Enlace inválido o expirado. Solicitá un nuevo restablecimiento desde el inicio de sesión.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiPath('/api/auth/confirm-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo actualizar la contraseña.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('No se pudo conectar. Revisá tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerContent}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Contraseña actualizada
          </Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>
            Ya podés iniciar sesión con tu nueva contraseña.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.buttonText}>Ir al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            CONTRASEÑA NUEVA
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Ingresá y confirmá tu nueva contraseña (mínimo 6 caracteres).
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.text }]}
            placeholder="Contraseña nueva"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!loading}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.text }]}
            placeholder="Repetir contraseña nueva"
            placeholderTextColor={colors.textMuted}
            value={repeatPassword}
            onChangeText={(t) => { setRepeatPassword(t); setError(''); }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!loading}
          />

          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>GUARDAR CONTRASEÑA</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 14,
    width: '100%',
  },
  error: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
});
