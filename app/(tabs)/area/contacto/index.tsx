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
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

function aviso(titulo: string, mensaje?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    const texto =
      mensaje != null && String(mensaje).trim() !== '' ? `${titulo}\n\n${mensaje}` : titulo;
    window.alert(texto);
    return;
  }
  if (mensaje != null && String(mensaje).trim() !== '') Alert.alert(titulo, mensaje);
  else Alert.alert(titulo);
}

export default function ContactoScreen() {
  const { token } = useAuth();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    const n = nombre.trim();
    const a = apellido.trim();
    const e = email.trim();
    const m = mensaje.trim();
    if (!n || !a) {
      aviso('Datos requeridos', 'Completá nombre y apellido.');
      return;
    }
    if (!e) {
      aviso('Datos requeridos', 'Completá tu correo electrónico.');
      return;
    }
    if (!m) {
      aviso('Datos requeridos', 'Escribí el mensaje.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiPath('/api/contacto'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ nombre: n, apellido: a, email: e, mensaje: m }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        aviso('Error', typeof data.error === 'string' ? data.error : 'No se pudo enviar el mensaje.');
        return;
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert('Su mensaje ha sido enviado. Nos pondremos en contacto a la brevedad.');
      } else {
        Alert.alert(
          'Enviado',
          'Su mensaje ha sido enviado. Nos pondremos en contacto a la brevedad.',
          [{ text: 'OK' }]
        );
      }
      setNombre('');
      setApellido('');
      setEmail('');
      setMensaje('');
    } catch {
      aviso('Error', 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Contáctenos</Text>
        <Text style={styles.intro}>
          Escribinos tu consulta o comentario. Los administradores lo verán en el área de gestión y podrán
          responderte.
        </Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Apellido</Text>
        <TextInput
          style={styles.input}
          value={apellido}
          onChangeText={setApellido}
          placeholder="Apellido"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="ejemplo@correo.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Mensaje</Text>
        <TextInput
          style={[styles.input, styles.mensajeBox]}
          value={mensaje}
          onChangeText={setMensaje}
          placeholder="Escribí tu mensaje aquí…"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          maxLength={8000}
        />
        <Text style={styles.hint}>{mensaje.length} / 8000</Text>

        <TouchableOpacity
          style={[styles.submit, loading && styles.submitDisabled]}
          onPress={enviar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.submitText}>Enviar mensaje</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkMis}
          onPress={() => router.push('/area/contacto/mis-mensajes' as any)}
        >
          <Text style={styles.linkMisText}>Ver mis consultas y respuestas</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 10 },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 20 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mensajeBox: { minHeight: 160, paddingTop: 14 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6, textAlign: 'right' },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.text, fontSize: 17, fontWeight: '600' },
  linkMis: { marginTop: 20, paddingVertical: 12, alignItems: 'center' },
  linkMisText: { fontSize: 15, color: colors.primaryLight, fontWeight: '600' },
});
