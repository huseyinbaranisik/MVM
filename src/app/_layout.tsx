import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Icon } from '@/components/Icon';
import { SignIn } from '@/components/SignIn';
import { StreakSync } from '@/components/StreakSync';
import { WidgetSync } from '@/components/WidgetSync';
import { OverlayHost } from '@/components/ui/overlays';
import { PillButton } from '@/components/ui/PillButton';
import { notify } from '@/db/bus';
import { ensureUserData } from '@/db/repos/bootstrap';
import { supabase } from '@/db/supabase';
import '@/services/notifications'; // bildirim gösterim davranışını kaydeder
import { colors, spacing, type } from '@/theme';

const navTheme = {
  ...(colors.dark ? DarkTheme : DefaultTheme),
  colors: { ...(colors.dark ? DarkTheme : DefaultTheme).colors, background: colors.background, card: colors.background, primary: colors.primaryLight, text: colors.textPrimary, border: colors.divider },
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

/** Oturum yoksa giriş ekranı; varsa hesabı ilk kez kurar, sonra uygulamayı gösterir. */
function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [ready, setReady] = useState<string | null>(null); // kurulumu tamamlanan kullanıcı id'si
  const [failed, setFailed] = useState(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); notify('*'); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    ensureUserData().then(() => { if (alive) { setFailed(false); setReady(userId); } }, (e) => {
      console.warn('Hesap kurulamadı', e);
      if (alive) setFailed(true);
    });
    return () => { alive = false; };
  }, [userId, failed]);

  if (session === undefined) return <Loading />;
  if (!session) return <SignIn />;
  if (failed) {
    return (
      <View style={styles.error}>
        <Icon name="cloud_off" size={48} color={colors.primaryLight} />
        <Text style={[type.title, styles.center]}>Sunucuya ulaşılamadı</Text>
        <Text style={[type.caption, styles.center]}>İnternet bağlantını kontrol edip tekrar dene.</Text>
        <PillButton label="Tekrar dene" variant="primary" onPress={() => setFailed(false)} />
      </View>
    );
  }
  if (ready !== userId) return <Loading />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={navTheme}>
        <AuthGate>
            <StreakSync />
            <WidgetSync />
            <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right', contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="workout/summary/[sessionId]" options={{ animation: 'fade_from_bottom' }} />
            </Stack>
        </AuthGate>
        <OverlayHost />
      </ThemeProvider>
      <StatusBar style={colors.dark ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxl },
  center: { textAlign: 'center' },
});
