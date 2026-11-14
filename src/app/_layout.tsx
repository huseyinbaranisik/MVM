import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Icon } from '@/components/Icon';
import { OverlayHost } from '@/components/ui/overlays';
import { PillButton } from '@/components/ui/PillButton';
import { DB_NAME, migrate } from '@/db/migrate';
import '@/services/notifications'; // bildirim gösterim davranışını kaydeder
import { colors, spacing, type } from '@/theme';

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.background, primary: colors.primaryLight, text: colors.textPrimary, border: colors.divider },
};

function Loading() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

/** Uygulamanın kendi hata ekranı (Expo Router, render hatalarında bunu gösterir). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.error}>
      <Icon name="error" size={48} color={colors.primaryLight} />
      <Text style={[type.title, styles.center]}>Bir şeyler ters gitti</Text>
      <Text style={[type.caption, styles.center]} numberOfLines={4}>
        Verilerin güvende. Tekrar denemek genelde sorunu çözer. ({error.message})
      </Text>
      <PillButton label="Tekrar dene" variant="primary" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={navTheme}>
        <Suspense fallback={<Loading />}>
          <SQLiteProvider databaseName={DB_NAME} onInit={migrate} useSuspense options={{ enableChangeListener: true }}>
            <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right', contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="quick-add" options={{ presentation: 'transparentModal', animation: 'none' }} />
              <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="workout/summary/[sessionId]" options={{ animation: 'fade_from_bottom' }} />
            </Stack>
          </SQLiteProvider>
        </Suspense>
        <OverlayHost />
      </ThemeProvider>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxl },
  center: { textAlign: 'center' },
});
