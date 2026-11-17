import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Icon } from '@/components/Icon';
import { BRAND, Logo } from '@/components/Logo';
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

/** Açılış/yükleme ekranı: yerel açılış ekranıyla aynı zeminde nefes alan logo ve kayan çizgi. */
function Loading() {
  const pulse = useSharedValue(0);
  const bar = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })), -1));
    bar.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), -1));
  }, [pulse, bar]);
  const logo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.get() * 0.06 }] }));
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: -48 + bar.get() * 144 }] }));
  return (
    <View style={styles.loading} accessibilityLabel="Yükleniyor">
      <Animated.View style={logo}><Logo size={120} /></Animated.View>
      <Text style={styles.word}>MVM</Text>
      <View style={styles.track}><Animated.View style={[styles.slider, slide]} /></View>
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
  loading: { flex: 1, backgroundColor: BRAND.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  word: { color: BRAND.mark, fontSize: 22, fontWeight: '800', letterSpacing: 6 },
  track: { width: 96, height: 4, borderRadius: 2, backgroundColor: 'rgba(246,238,226,0.15)', overflow: 'hidden', marginTop: spacing.md },
  slider: { width: 48, height: 4, borderRadius: 2, backgroundColor: BRAND.top },
  error: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xxl },
  center: { textAlign: 'center' },
});
