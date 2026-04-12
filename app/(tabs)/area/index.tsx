import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export default function AreaMenuScreen() {
  return (
    <View style={styles.center}>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        Elegí una sección del menú de la izquierda para acceder a contenidos y trámites.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  intro: { fontSize: 15 },
});
