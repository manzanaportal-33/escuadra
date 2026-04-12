import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

const rootStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: '100vh',
  } as { flex: number; backgroundColor: string; minHeight: string },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={rootStyles.root}>
          <StatusBar style="light" />
          <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.header },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: colors.background, flex: 1 },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="login"
            options={{
              title: 'Inicio de sesión',
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="restablecer-password"
            options={{
              title: 'Restablecer contraseña',
            }}
          />
          <Stack.Screen
            name="nueva-contrasena"
            options={{
              title: 'Contraseña nueva',
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        </Stack>
      </View>
    </AuthProvider>
    </SafeAreaProvider>
  );
}
