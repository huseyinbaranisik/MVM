import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DB_NAME, migrate } from '@/db/migrate';
import '@/services/notifications'; // bildirim gösterim davranışını kaydeder
import { colors } from '@/theme';

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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={navTheme}>
        <Suspense fallback={<Loading />}>
          <SQLiteProvider databaseName={DB_NAME} onInit={migrate} useSuspense options={{ enableChangeListener: true }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="quick-add" options={{ presentation: 'transparentModal', animation: 'fade' }} />
            </Stack>
          </SQLiteProvider>
        </Suspense>
      </ThemeProvider>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
