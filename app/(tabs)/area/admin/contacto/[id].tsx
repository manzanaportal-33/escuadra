import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiPath } from '@/config/api';
import { colors } from '@/theme/colors';

type Mensaje = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  mensaje: string;
  estado: string;
  respuesta: string | null;
  responded_at: string | null;
  created_at: string;
  cuerpos_etiqueta?: string | null;
};

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

export default function AdminContactoDetalleScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = String(rawId);
  const { fetchWithAuth, user } = useAuth();
  const isAdmin = user?.user_level === 1;
  const [row, setRow] = useState<Mensaje | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respuestaDraft, setRespuestaDraft] = useState('');

  const load = useCallback(async () => {
    if (!isAdmin || !id) return;
    try {
      const res = await fetchWithAuth(apiPath(`/api/contacto/admin/${id}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Error al cargar');
      const m = data as Mensaje;
      setRow(m);
      setRespuestaDraft(m.respuesta || '');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, isAdmin, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const guardarRespuesta = async () => {
    const r = respuestaDraft.trim();
    if (!r) {
      aviso('Requerido', 'Escribí la respuesta antes de enviar.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth(apiPath(`/api/contacto/admin/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuesta: r }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        aviso('Error', typeof data?.error === 'string' ? data.error : 'No se pudo guardar');
        return;
      }
      setRow(data as Mensaje);
      if (Platform.OS === 'web' && window.alert) window.alert('Respuesta guardada.');
      else Alert.alert('Listo', 'Respuesta guardada.');
    } catch {
      aviso('Error', 'Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Solo administradores.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !row) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>{error || 'No encontrado'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backL}>
          <Text style={styles.backT}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.badgeRow}>
          <View style={[styles.pill, row.estado === 'nuevo' ? styles.pillNuevo : styles.pillOk]}>
            <Text style={styles.pillText}>{row.estado === 'nuevo' ? 'Nuevo' : 'Respondido'}</Text>
          </View>
        </View>

        <Text style={styles.section}>Remitente</Text>
        <View style={styles.block}>
          <Text style={styles.v}>
            {row.apellido}, {row.nombre}
          </Text>
          <Text style={styles.mail}>{row.email}</Text>
          <Text style={styles.cuerposLabel}>Cuerpo(s)</Text>
          <Text style={styles.cuerposVal}>
            {row.cuerpos_etiqueta?.trim() ? row.cuerpos_etiqueta : 'Sin cuerpo asignado'}
          </Text>
          <Text style={styles.meta}>Enviado: {new Date(row.created_at).toLocaleString('es-AR')}</Text>
        </View>

        <Text style={styles.section}>Mensaje</Text>
        <View style={styles.block}>
          <Text style={styles.mensajeBody}>{row.mensaje}</Text>
        </View>

        <Text style={styles.section}>Tu respuesta</Text>
        <Text style={styles.hint}>
          El texto queda registrado en el sistema. Podés copiarlo y enviarlo también por correo a {row.email}{' '}
          si lo preferís.
        </Text>
        <TextInput
          style={styles.textarea}
          value={respuestaDraft}
          onChangeText={setRespuestaDraft}
          placeholder="Escribí la respuesta al hermano…"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          maxLength={12000}
        />
        <Text style={styles.count}>{respuestaDraft.length} / 12000</Text>

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDis]}
          onPress={guardarRespuesta}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.btnTxt}>{row.estado === 'nuevo' ? 'Guardar y marcar respondido' : 'Actualizar respuesta'}</Text>
          )}
        </TouchableOpacity>

        {row.responded_at ? (
          <Text style={styles.meta2}>
            Última respuesta registrada: {new Date(row.responded_at).toLocaleString('es-AR')}
          </Text>
        ) : null}

        <TouchableOpacity onPress={() => router.back()} style={styles.backL}>
          <Text style={styles.backT}>Volver al listado</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  err: { color: colors.error, fontSize: 16, textAlign: 'center' },
  badgeRow: { marginBottom: 12 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pillNuevo: { backgroundColor: colors.warning + '33' },
  pillOk: { backgroundColor: colors.success + '33' },
  pillText: { fontSize: 12, fontWeight: '800', color: colors.text },
  section: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  block: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  v: { fontSize: 18, fontWeight: '700', color: colors.text },
  mail: { fontSize: 15, color: colors.primaryLight, marginTop: 6 },
  cuerposLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  cuerposVal: { fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
  meta2: { fontSize: 12, color: colors.textMuted, marginTop: 12, textAlign: 'center' },
  mensajeBody: { fontSize: 15, color: colors.text, lineHeight: 22 },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 8 },
  textarea: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  count: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDis: { opacity: 0.7 },
  btnTxt: { color: colors.text, fontSize: 16, fontWeight: '700' },
  backL: { marginTop: 24, paddingVertical: 12 },
  backT: { fontSize: 16, color: colors.primary, fontWeight: '600' },
});
