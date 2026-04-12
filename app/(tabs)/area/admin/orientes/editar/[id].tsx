import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/theme/colors';

export default function OrienteEditarScreen() {
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [pais, setPais] = useState('');
  const [web, setWeb] = useState('');
  const [direccion, setDireccion] = useState('');
  const [mail_institucional, setMail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [soberano, setSoberano] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiPath(`/api/orientes/${id}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!cancelled && res.ok && data) {
          setPais(data.pais ?? '');
          setWeb(data.web ?? '');
          setDireccion(data.direccion ?? '');
          setMail(data.mail_institucional ?? '');
          setTelefono(data.telefono ?? '');
          setSoberano(data.soberano ?? '');
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, token]);

  const enviar = async () => {
    if (!pais.trim()) {
      Alert.alert('Requerido', 'País es obligatorio.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiPath(`/api/orientes/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pais: pais.trim(),
          web: web.trim() || null,
          direccion: direccion.trim() || null,
          mail_institucional: mail_institucional.trim() || null,
          telefono: telefono.trim() || null,
          soberano: soberano.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', data.error || 'No se pudo actualizar');
        return;
      }
      Alert.alert('Listo', 'Oriente actualizado.', [{ text: 'OK', onPress: () => router.back() }]);
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
      <Text style={styles.label}>País *</Text>
      <TextInput style={styles.input} value={pais} onChangeText={setPais} placeholder="País" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Soberano</Text>
      <TextInput style={styles.input} value={soberano} onChangeText={setSoberano} placeholder="Soberano" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Web</Text>
      <TextInput style={styles.input} value={web} onChangeText={setWeb} placeholder="https://..." placeholderTextColor={colors.textMuted} keyboardType="url" />
      <Text style={styles.label}>Dirección</Text>
      <TextInput style={styles.input} value={direccion} onChangeText={setDireccion} placeholder="Dirección" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Mail institucional</Text>
      <TextInput style={styles.input} value={mail_institucional} onChangeText={setMail} placeholder="mail@..." placeholderTextColor={colors.textMuted} keyboardType="email-address" />
      <Text style={styles.label}>Teléfono</Text>
      <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Teléfono" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
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
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.backgroundCard, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
  submit: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginTop: 28, alignItems: 'center' },
  submitText: { color: colors.text, fontSize: 17, fontWeight: '600' },
});
