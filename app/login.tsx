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
  Image,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';
import { INSTITUTION } from '@/theme/institution';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      router.replace('/(tabs)');
    } else {
      setError(result.error ?? 'Error al ingresar');
    }
  };

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
        <View style={styles.outerCard}>
          <Text style={[styles.loginHeaderLine1, { color: colors.text }]}>
            {INSTITUTION.loginHeaderLine1}
          </Text>
          <Text style={[styles.loginHeaderLine2, { color: colors.textSecondary }]}>
            {INSTITUTION.loginHeaderLine2}
          </Text>

          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Área reservada</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ingresá con tu cuenta de miembro
            </Text>

            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.text, borderColor: colors.border }]}
                placeholder="tu@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.text, borderColor: colors.border }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError('');
                }}
                secureTextEntry
                autoComplete="password"
                editable={!loading}
              />

              {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Ingresar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.restoreLink}
                onPress={() => router.push('/restablecer-password')}
                disabled={loading}
              >
                <Text style={[styles.restoreLinkText, { color: colors.primary }]}>
                  Restablecer la contraseña
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.footerName, { color: colors.textMuted }]} numberOfLines={2}>
            {INSTITUTION.full}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  outerCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  loginHeaderLine1: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  loginHeaderLine2: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 28,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(93, 71, 139, 0.25)',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f3f0f9',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 28,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 18,
    width: '100%',
    borderWidth: 1,
  },
  error: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreLink: {
    marginTop: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  restoreLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerName: {
    marginTop: 28,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
