import { useState } from 'react';
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
import { router } from 'expo-router';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

export default function RestablecerPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Ingresá tu correo electrónico.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== 'undefined' && window.location?.origin
          ? `${window.location.origin}/nueva-contrasena`
          : undefined;
      const res = await fetch(apiPath('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, redirect_to: redirectTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar el correo. Intentá de nuevo.');
        return;
      }
      setSent(true);
    } catch {
      setError('No se pudo conectar. Revisá tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerContent}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Correo enviado
          </Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>
            Si existe una cuenta con ese correo, vas a recibir un enlace para restablecer tu contraseña. Revisá tu bandeja de entrada y la carpeta de spam.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Volver al inicio de sesión</Text>
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
            Restablecer la contraseña
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Ingresá el correo electrónico de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.text }]}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
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
              <Text style={styles.buttonText}>RESTABLECER MI CONTRASEÑA</Text>
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
