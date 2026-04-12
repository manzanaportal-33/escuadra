import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';

export default function CuerpoNuevoScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sigla, setSigla] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [trabajos, setTrabajos] = useState('');
  const [presidente, setPresidente] = useState('');
  const [secretario, setSecretario] = useState('');
  const [tesorero, setTesorero] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const enviar = async () => {
    if (!sigla.trim() || !cuerpo.trim()) {
      Alert.alert('Requerido', 'Sigla y cuerpo son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiPath('/api/cuerpos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sigla: sigla.trim(),
          cuerpo: cuerpo.trim(),
          localidad: localidad.trim() || undefined,
          trabajos: trabajos.trim() || undefined,
          presidente: presidente.trim() || undefined,
          secretario: secretario.trim() || undefined,
          tesorero: tesorero.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', data.error || 'No se pudo crear');
        return;
      }
      Alert.alert('Listo', 'Cuerpo creado.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Sigla *</Text>
      <TextInput style={styles.input} value={sigla} onChangeText={setSigla} placeholder="Ej: LA PAZ" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Cuerpo *</Text>
      <TextInput style={styles.input} value={cuerpo} onChangeText={setCuerpo} placeholder="Nombre del cuerpo" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Localidad</Text>
      <TextInput style={styles.input} value={localidad} onChangeText={setLocalidad} placeholder="Localidad" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Trabajos</Text>
      <TextInput style={styles.input} value={trabajos} onChangeText={setTrabajos} placeholder="Trabajos" placeholderTextColor={colors.textMuted} />
      <Text style={styles.section}>Autoridades</Text>
      <Text style={styles.label}>Presidente</Text>
      <TextInput
        style={styles.input}
        value={presidente}
        onChangeText={setPresidente}
        placeholder="Nombre del presidente"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>Secretario</Text>
      <TextInput
        style={styles.input}
        value={secretario}
        onChangeText={setSecretario}
        placeholder="Nombre del secretario"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>Tesorero</Text>
      <TextInput
        style={styles.input}
        value={tesorero}
        onChangeText={setTesorero}
        placeholder="Nombre del tesorero"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>Observaciones</Text>
      <TextInput style={[styles.input, styles.textArea]} value={observaciones} onChangeText={setObservaciones} placeholder="Observaciones" placeholderTextColor={colors.textMuted} multiline />
      <TouchableOpacity style={styles.submit} onPress={enviar} disabled={loading}>
        <Text style={styles.submitText}>{loading ? 'Guardando...' : 'Guardar'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  section: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 20,
    marginBottom: 4,
  },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.backgroundCard, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
  textArea: { minHeight: 80 },
  submit: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginTop: 28, alignItems: 'center' },
  submitText: { color: colors.text, fontSize: 17, fontWeight: '600' },
});
