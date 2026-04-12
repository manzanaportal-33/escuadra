import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';

export default function AdminNuevaCarpetaScreen() {
  const { token } = useAuth();
  const { parent_id } = useLocalSearchParams<{ parent_id?: string }>();
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    const trim = nombre.trim();
    if (!trim) {
      setError('Escribí el nombre de la carpeta.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiPath('/api/biblioteca/carpetas'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nombre: trim,
          parent_id: parent_id != null && parent_id !== '' ? parent_id : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || 'No se pudo crear la carpeta';
        setError(msg);
        if (Platform.OS !== 'web') Alert.alert('Error', msg);
        return;
      }
      if (Platform.OS === 'web') {
        window.alert('Carpeta creada.');
        router.back();
      } else {
        Alert.alert('Listo', 'Carpeta creada.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de conexión';
      setError(msg);
      if (Platform.OS !== 'web') Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.label}>Nombre de la carpeta *</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={(t) => { setNombre(t); setError(null); }}
          placeholder="Ej: Actas 2025"
          placeholderTextColor={colors.textMuted}
          autoFocus
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={[styles.submit, loading && styles.submitDisabled]} onPress={enviar} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Creando...' : 'Crear carpeta'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: colors.backgroundCard, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
  submit: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginTop: 28, alignItems: 'center' },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.text, fontSize: 17, fontWeight: '600' },
  errorText: { color: colors.primary, fontSize: 14, marginTop: 10 },
});
