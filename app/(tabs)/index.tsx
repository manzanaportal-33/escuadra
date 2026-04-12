import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '@/theme/colors';
import { INSTITUTION } from '@/theme/institution';

export default function AreaReservadaScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.webTitle}>Área reservada</Text>
        <Text style={styles.webIntro}>
          Espacio privado para miembros del {INSTITUTION.short}. Usá el menú de la izquierda para acceder a biblioteca, secretaría, tesorería y trámites en línea.
        </Text>
      </View>
      <View style={styles.logoWrap}>
        <Image
          source={require('../../assets/images/logo-area-reservada.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Emblema del Supremo Consejo Grado 33°"
        />
      </View>
    </View>
  );
}

const LOGO_SIZE = 320;

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    alignSelf: 'stretch',
    paddingBottom: 8,
  },
  logoWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 280,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
  },
  webTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  webIntro: { fontSize: 16, lineHeight: 24, color: colors.textSecondary, maxWidth: 560 },
});
