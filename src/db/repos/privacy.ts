import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getSetting } from '@/db/repos/settings';
import { must, supabase } from '@/db/supabase';
import { t } from '@/i18n';

/** Kullanıcının kendi verisini tuttuğu tüm tablolar (RLS yalnızca kendi satırlarını döndürür). */
const TABLES = [
  'settings', 'workout_templates', 'template_exercises', 'day_schedule_items', 'workout_sessions', 'session_sets',
  'habits', 'habit_logs', 'daily_trackers', 'tracker_settings', 'sleep_logs', 'body_measurements', 'user_foods',
  'food_logs', 'user_exercises', 'exercise_favorites', 'streak_days', 'streak_state', 'badges',
] as const;

/** Tüm veriyi JSON dosyası olarak paylaşım menüsüyle dışa aktarır. */
export async function exportMyData() {
  const user = (await supabase.auth.getUser()).data.user;
  const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), email: user?.email ?? null };
  for (const t of TABLES) data[t] = must(await supabase.from(t).select('*'));
  const file = new File(Paths.cache, `mvm-veri-${new Date().toISOString().slice(0, 10)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: t('MVM verilerim') });
}

/** Hesabı ve tüm veriyi kalıcı olarak siler, sonra oturumu kapatır. */
export async function deleteMyAccount() {
  const p = await getSetting('profile');
  if (p.avatarPath) must(await supabase.storage.from('avatars').remove([p.avatarPath]));
  must(await supabase.rpc('delete_my_account'));
  await supabase.auth.signOut({ scope: 'local' });
}
