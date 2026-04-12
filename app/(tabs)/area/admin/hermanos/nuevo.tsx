import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { CuerpoMultiSelect } from '@/components/CuerpoMultiSelect';

type Group = { id: number; group_name: string; group_level: number };
type Cuerpo = { id: number; sigla: string; cuerpo: string };

const INDICES_FECHA_CUOTA = Array.from({ length: 30 }, (_, i) => i + 4);

export default function HermanoNuevoScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [cuerpos, setCuerpos] = useState<Cuerpo[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [apellido, setApellido] = useState('');
  const [user_level, setUser_level] = useState<number>(3);
  const [cuerpoSel, setCuerpoSel] = useState<number[]>([]);
  const [grado, setGrado] = useState('');
  const [telefono, setTelefono] = useState('');
  const [profesion, setProfesion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [hist_grado, setHist_grado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [grado_troncal, setGrado_troncal] = useState('');
  const [obs_scg33, setObs_scg33] = useState('');
  const [detalle, setDetalle] = useState('');
  const [exencion, setExencion] = useState('');
  const [fechasCuota, setFechasCuota] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [gRes, cRes] = await Promise.all([
          fetch(apiPath('/api/groups'), { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(apiPath('/api/cuerpos'), { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        ]);
        const gData = await gRes.json();
        const cData = await cRes.json();
        if (!cancelled) {
          if (gRes.ok) setGroups(Array.isArray(gData) ? gData : []);
          if (cRes.ok) setCuerpos(Array.isArray(cData) ? cData : []);
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const enviar = async () => {
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim) {
      Alert.alert('Requerido', 'Email es obligatorio.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Requerido', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!name.trim() || !apellido.trim()) {
      Alert.alert('Requerido', 'Nombre y apellido son obligatorios.');
      return;
    }

    const fechas_cuotas: Record<string, string> = {};
    for (const n of INDICES_FECHA_CUOTA) {
      const v = (fechasCuota[String(n)] ?? '').trim();
      if (v) fechas_cuotas[String(n)] = v;
    }

    setLoading(true);
    try {
      const res = await fetch(apiPath('/api/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: emailTrim,
          password,
          name: name.trim(),
          apellido: apellido.trim(),
          user_level,
          cuerpo_ids: cuerpoSel,
          grado: grado.trim() ? parseInt(grado, 10) : undefined,
          grado_troncal: grado_troncal.trim() || undefined,
          telefono: telefono.trim() || undefined,
          profesion: profesion.trim() || undefined,
          direccion: direccion.trim() || undefined,
          hist_grado: hist_grado.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
          obs_scg33: obs_scg33.trim() || undefined,
          detalle: detalle.trim() || undefined,
          exencion: exencion.trim() || undefined,
          fechas_cuotas: Object.keys(fechas_cuotas).length ? fechas_cuotas : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', data.error || 'No se pudo crear el hermano');
        return;
      }
      Alert.alert('Listo', 'Hermano dado de alta. Ya puede iniciar sesión con su email y contraseña.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Contraseña *</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />
        <Text style={styles.label}>Apellido *</Text>
        <TextInput style={styles.input} value={apellido} onChangeText={setApellido} placeholder="Apellido" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Nombre *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nombre" placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>Grupo / rol</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, user_level === g.group_level && styles.chipActive]}
              onPress={() => setUser_level(g.group_level)}
            >
              <Text style={[styles.chipText, user_level === g.group_level && styles.chipTextActive]}>{g.group_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Cuerpos (elegí uno o más)</Text>
        <CuerpoMultiSelect cuerpos={cuerpos} selectedIds={cuerpoSel} onSelectionChange={setCuerpoSel} />

        <Text style={styles.label}>Grado troncal</Text>
        <TextInput
          style={styles.input}
          value={grado_troncal}
          onChangeText={setGrado_troncal}
          placeholder="Como en planilla LISTA_HH"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
        <Text style={styles.label}>Grado</Text>
        <TextInput
          style={styles.input}
          value={grado}
          onChangeText={setGrado}
          placeholder="Ej: 33"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
        <Text style={styles.label}>OBS. (SCG33)</Text>
        <TextInput
          style={styles.input}
          value={obs_scg33}
          onChangeText={setObs_scg33}
          placeholder="Observación / teléfono en planilla"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Detalle</Text>
        <TextInput style={[styles.input, styles.textArea]} value={detalle} onChangeText={setDetalle} placeholder="Detalle" placeholderTextColor={colors.textMuted} multiline />
        <Text style={styles.label}>Exención</Text>
        <TextInput style={styles.input} value={exencion} onChangeText={setExencion} placeholder="Exención" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Teléfono</Text>
        <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Teléfono" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        <Text style={styles.label}>Profesión</Text>
        <TextInput style={styles.input} value={profesion} onChangeText={setProfesion} placeholder="Profesión" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Dirección</Text>
        <TextInput style={styles.input} value={direccion} onChangeText={setDireccion} placeholder="Dirección" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Historial de grado</Text>
        <TextInput style={styles.input} value={hist_grado} onChangeText={setHist_grado} placeholder="Historial de grado" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Observaciones</Text>
        <TextInput style={[styles.input, styles.textArea]} value={observaciones} onChangeText={setObservaciones} placeholder="Observaciones" placeholderTextColor={colors.textMuted} multiline />

        <Text style={styles.label}>Fechas cuota (FECHA4 … FECHA33)</Text>
        <Text style={styles.hint}>Formato sugerido: AAAA-MM-DD (vacío = sin fecha)</Text>
        <View style={styles.fechaGrid}>
          {INDICES_FECHA_CUOTA.map((n) => (
            <View key={n} style={styles.fechaCell}>
              <Text style={styles.fechaIdx}>{n}</Text>
              <TextInput
                style={styles.inputFecha}
                value={fechasCuota[String(n)] ?? ''}
                onChangeText={(t) => setFechasCuota((p) => ({ ...p, [String(n)]: t }))}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.submit, loading && styles.submitDisabled]} onPress={enviar} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Creando...' : 'Dar de alta'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: colors.backgroundCard, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
  textArea: { minHeight: 80 },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  fechaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fechaCell: { width: '47%', minWidth: 140 },
  fechaIdx: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  inputFecha: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.backgroundCard,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipTextActive: { color: colors.text, fontWeight: '600' },
  submit: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginTop: 28, alignItems: 'center' },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.text, fontSize: 17, fontWeight: '600' },
});
