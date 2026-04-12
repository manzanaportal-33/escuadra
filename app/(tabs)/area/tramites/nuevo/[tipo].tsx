import { useState, useRef, createElement } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

const MSG_SOLICITUD_ENVIADA = 'Su solicitud ha sido enviada.';

/** Web: React Native `Alert.alert` often does nothing; use the browser dialog. */
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

function mostrarSolicitudEnviada(alCerrar: () => void) {
  if (Platform.OS === 'web') {
    aviso(MSG_SOLICITUD_ENVIADA);
    alCerrar();
    return;
  }
  Alert.alert('Listo', MSG_SOLICITUD_ENVIADA, [{ text: 'OK', onPress: alCerrar }]);
}

const TIPOS: Record<string, string> = {
  ingreso: 'Solicitud de Ingreso',
  reingreso: 'Solicitud de Re-Ingreso',
  ascenso: 'Ascenso Troncal',
  dimision: 'Dimisi\u00f3n',
  pase: 'Pase',
};

/** Etiqueta del boton de adjunto por tipo de tramite */
const ADJUNTO_LABEL: Record<string, string> = {
  ingreso: 'Adjuntar solicitud de ingreso',
  reingreso: 'Adjuntar solicitud de re-ingreso',
  ascenso: 'Adjuntar solicitud de ascenso troncal',
  dimision: 'Adjuntar dimisi\u00f3n',
  pase: 'Adjuntar solicitud de pase',
};

type AdjuntoState =
  | { kind: 'web'; file: File }
  | { kind: 'native'; uri: string; name: string; mime: string }
  | null;

export default function TramiteNuevoScreen() {
  const { token } = useAuth();
  const { tipo } = useLocalSearchParams<{ tipo: string }>();
  const webInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [mail, setMail] = useState('');
  const [nombreSolicitante, setNombreSolicitante] = useState('');
  const [apellidoSolicitante, setApellidoSolicitante] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [cuerpoPasa, setCuerpoPasa] = useState('');
  const [plomo, setPlomo] = useState<'SI' | 'NO'>('NO');
  const [fechaPropuesta, setFechaPropuesta] = useState('');
  const [adjunto, setAdjunto] = useState<AdjuntoState>(null);

  const titulo = (tipo && TIPOS[tipo]) || 'Tr\u00e1mite';
  const labelAdjunto = (tipo && ADJUNTO_LABEL[tipo]) || 'Adjuntar solicitud';
  const pideMail = tipo === 'ingreso' || tipo === 'ascenso' || tipo === 'dimision';
  const pideSolicitante = tipo === 'dimision' || tipo === 'pase';
  const pideCuerpoPasa = tipo === 'pase';
  const pidePlomo = tipo === 'ingreso' || tipo === 'ascenso' || tipo === 'dimision' || tipo === 'pase';
  const pideFechaPropuesta = tipo === 'ingreso' || tipo === 'reingreso' || tipo === 'ascenso';

  const elegirArchivoWeb = () => {
    webInputRef.current?.click();
  };

  const onWebFileChange = (e: { target?: HTMLInputElement | null }) => {
    const input = e?.target;
    const f = input?.files?.[0];
    if (f) setAdjunto({ kind: 'web', file: f });
    if (input) input.value = '';
  };

  const elegirArchivoNative = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/webp',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      setAdjunto({
        kind: 'native',
        uri: a.uri,
        name: a.name || 'solicitud.pdf',
        mime: a.mimeType || 'application/pdf',
      });
    } catch {
      aviso('Error', 'No se pudo elegir el archivo.');
    }
  };

  const enviar = async () => {
    if (!nombre.trim() || !apellido.trim() || !cuerpo.trim()) {
      aviso('Campos requeridos', 'Complet\u00e1 nombre, apellido y cuerpo.');
      return;
    }
    if (pideMail && !mail.trim()) {
      aviso('Campo requerido', 'Complet\u00e1 el mail.');
      return;
    }
    if (pideSolicitante && (!nombreSolicitante.trim() || !apellidoSolicitante.trim())) {
      aviso('Campos requeridos', 'Complet\u00e1 nombre y apellido del solicitante.');
      return;
    }
    if (pideCuerpoPasa && !cuerpoPasa.trim()) {
      aviso('Campo requerido', 'Complet\u00e1 el cuerpo al que pasa.');
      return;
    }
    if (pideFechaPropuesta && !fechaPropuesta.trim()) {
      aviso('Campo requerido', 'Complet\u00e1 la fecha propuesta (dd/mm/aaaa).');
      return;
    }
    if (!tipo || !['ingreso', 'reingreso', 'ascenso', 'dimision', 'pase'].includes(tipo)) {
      aviso('Error', 'Tipo de tr\u00e1mite inv\u00e1lido.');
      return;
    }
    if (!adjunto) {
      aviso('Adjunto requerido', 'Ten\u00e9s que adjuntar el archivo de la solicitud (PDF, Word o imagen).');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('tipo', tipo);
      fd.append('nombre', nombre.trim());
      fd.append('apellido', apellido.trim());
      fd.append('cuerpo', cuerpo.trim());
      fd.append('plomo', plomo);
      fd.append('fecha_propuesta', fechaPropuesta.trim() || '');
      fd.append('cuerpo_pasa', pideCuerpoPasa ? cuerpoPasa.trim() : '');
      fd.append('mail', pideMail ? mail.trim() : '');
      if (pideSolicitante) {
        fd.append('nombre_solicitante', nombreSolicitante.trim());
        fd.append('apellido_solicitante', apellidoSolicitante.trim());
      }
      if (adjunto.kind === 'web') {
        fd.append('adjunto', adjunto.file);
      } else {
        fd.append('adjunto', {
          uri: adjunto.uri,
          name: adjunto.name,
          type: adjunto.mime,
        } as unknown as Blob);
      }

      const res = await fetch(apiPath('/api/tramites'), {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        aviso('Error', typeof data.error === 'string' ? data.error : 'No se pudo enviar el tr\u00e1mite.');
        return;
      }
      mostrarSolicitudEnviada(() => router.back());
    } catch {
      aviso('Error', 'Error de conexi\u00f3n.');
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
        {Platform.OS === 'web' &&
          createElement('input', {
            type: 'file',
            accept: '.pdf,.doc,.docx,image/jpeg,image/png,image/webp',
            style: { display: 'none' },
            ref: (el: HTMLInputElement | null) => {
              webInputRef.current = el;
            },
            onChange: onWebFileChange,
          })}

        <Text style={styles.titulo}>{titulo}</Text>

        <Text style={styles.label}>{labelAdjunto}</Text>
        <Text style={styles.adjuntoHint}>
          PDF, Word (.doc / .docx) o imagen JPG, PNG o WEBP (m\u00e1x. 25 MB).
        </Text>
        <TouchableOpacity
          style={styles.btnAdjunto}
          onPress={Platform.OS === 'web' ? elegirArchivoWeb : elegirArchivoNative}
          activeOpacity={0.8}
        >
          <Ionicons name="attach" size={22} color={colors.primaryLight} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.btnAdjuntoText}>
              {adjunto
                ? adjunto.kind === 'web'
                  ? adjunto.file.name
                  : adjunto.name
                : 'Elegir archivo\u2026'}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre completo"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Apellido</Text>
        <TextInput
          style={styles.input}
          value={apellido}
          onChangeText={setApellido}
          placeholder="Apellido completo"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />

        {pideMail && (
          <>
            <Text style={styles.label}>Mail</Text>
            <TextInput
              style={styles.input}
              value={mail}
              onChangeText={setMail}
              placeholder="ej: nombre@mail.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        )}

        {pideSolicitante && (
          <>
            <Text style={styles.label}>Nombre solicitante</Text>
            <TextInput
              style={styles.input}
              value={nombreSolicitante}
              onChangeText={setNombreSolicitante}
              placeholder="Nombre del solicitante"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            <Text style={styles.label}>Apellido solicitante</Text>
            <TextInput
              style={styles.input}
              value={apellidoSolicitante}
              onChangeText={setApellidoSolicitante}
              placeholder="Apellido del solicitante"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </>
        )}

        <Text style={styles.label}>Cuerpo</Text>
        <TextInput
          style={styles.input}
          value={cuerpo}
          onChangeText={setCuerpo}
          placeholder="Cuerpo"
          placeholderTextColor={colors.textMuted}
        />

        {pideCuerpoPasa && (
          <>
            <Text style={styles.label}>Cuerpo al que pasa</Text>
            <TextInput
              style={styles.input}
              value={cuerpoPasa}
              onChangeText={setCuerpoPasa}
              placeholder="Cuerpo de destino"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        {pidePlomo && (
          <>
            <Text style={styles.label}>{'\u00bfEst\u00e1 a plomo?'}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btnPlomo, plomo === 'NO' && styles.btnPlomoActive]}
                onPress={() => setPlomo('NO')}
              >
                <Text style={plomo === 'NO' ? styles.btnPlomoTextActive : styles.btnPlomoText}>NO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPlomo, plomo === 'SI' && styles.btnPlomoActive]}
                onPress={() => setPlomo('SI')}
              >
                <Text style={plomo === 'SI' ? styles.btnPlomoTextActive : styles.btnPlomoText}>SI</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {pideFechaPropuesta && (
          <>
            <Text style={styles.label}>Fecha propuesta</Text>
            <TextInput
              style={styles.input}
              value={fechaPropuesta}
              onChangeText={setFechaPropuesta}
              placeholder="dd/mm/aaaa"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.submit, loading && styles.submitDisabled]}
          onPress={enviar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>Enviar</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  adjuntoHint: { fontSize: 12, color: colors.textMuted, marginBottom: 8, lineHeight: 17 },
  btnAdjunto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnAdjuntoText: { fontSize: 15, color: colors.text },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnPlomo: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
  },
  btnPlomoActive: { backgroundColor: colors.primary },
  btnPlomoText: { color: colors.textMuted, fontSize: 16 },
  btnPlomoTextActive: { color: colors.text, fontSize: 16, fontWeight: '600' },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 28,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.text, fontSize: 17, fontWeight: '600' },
});
