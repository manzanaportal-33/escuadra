import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/theme/colors';

export default function CuerpoEditarScreen() {
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [sigla, setSigla] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [trabajos, setTrabajos] = useState('');
  const [presidente, setPresidente] = useState('');
  const [secretario, setSecretario] = useState('');
  const [tesorero, setTesorero] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiPath(`/api/cuerpos/${id}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!cancelled && res.ok && data) {
          setSigla(data.sigla ?? '');
          setCuerpo(data.cuerpo ?? '');
          setLocalidad(data.localidad ?? '');
          setTrabajos(data.trabajos ?? '');
          setPresidente(data.presidente ?? '');
          setSecretario(data.secretario ?? '');
          setTesorero(data.tesorero ?? '');
          setObservaciones(data.observaciones ?? '');
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, token]);

  const enviar = async () => {
    if (!sigla.trim() || !cuerpo.trim()) {
      Alert.alert('Requerido', 'Sigla y cuerpo son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiPath(`/api/cuerpos/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sigla: sigla.trim(),
          cuerpo: cuerpo.trim(),
          localidad: localidad.trim() || null,
          trabajos: trabajos.trim() || null,
          presidente: presidente.trim() || null,
          secretario: secretario.trim() || null,
          tesorero: tesorero.trim() || null,
          observaciones: observaciones.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', data.error || 'No se pudo actualizar');
        return;
      }
      Alert.alert('Listo', 'Cuerpo actualizado.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Sigla *</Text>
      <TextInput style={styles.input} value={sigla} onChangeText={setSigla} placeholder="Sigla" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Cuerpo *</Text>
      <TextInput style={styles.input} value={cuerpo} onChangeText={setCuerpo} placeholder="Cuerpo" placeholderTextColor={colors.textMuted} />
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
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
