import 'expo-sqlite/localStorage/install'; // oturumun saklandığı localStorage (Supabase'in Expo önerisi)
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  { auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);

// Uygulama ön plandayken oturum anahtarını yenile, arka plandayken dur (Supabase RN önerisi).
AppState.addEventListener('change', (s) => {
  if (s === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/** Supabase yanıtındaki hatayı fırlatır, veriyi döner (hata yoksa liste/single verisi null olmaz). */
export function must<T>(r: { data: T; error: unknown }): NonNullable<T> {
  if (r.error) throw r.error;
  return r.data as NonNullable<T>;
}

/** maybeSingle() için: kayıt yoksa null. */
export function maybe<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}
