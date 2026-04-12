import { Redirect, Slot } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { WebHeader } from '@/components/WebAppShell';
import { AreaSidebar } from '@/components/AreaSidebar';
import { colors } from '@/theme/colors';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <View style={styles.webRoot}>
      <WebHeader />
      <View style={styles.mainRow}>
        <AreaSidebar />
        <View style={styles.webContent}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webRoot: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: '100vh' as unknown as number,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  webContent: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  tabBar: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
});
