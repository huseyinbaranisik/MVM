import { seedHabits } from '@/data/seedProgram';
import { must, supabase } from '@/db/supabase';
import { today } from '@/services/dates';

/**
 * İlk girişte hesaba örnek alışkanlıkları ve hedefleri yazar; program ve gün atamaları boş başlar.
 * tracker_settings en son yazılır ve "kurulum tamam" işaretidir: yarıda kalırsa bir sonraki açılışta yarım kayıtlar silinip baştan yazılır.
 */
export async function ensureUserData() {
  const done = must(await supabase.from('tracker_settings').select('type').limit(1));
  if (done.length) return;

  // yarım kalmış önceki denemenin izleri
  must(await supabase.from('habits').delete().gte('id', 0));

  must(await supabase.from('habits').insert(seedHabits.map((h, position) => ({ name: h.name, icon: h.icon, position }))));
  must(await supabase.from('streak_state').upsert({ current: 0 }, { onConflict: 'user_id' }));
  must(await supabase.from('settings').upsert({ key: 'startDate', value: today() }, { onConflict: 'user_id,key' }));
  must(await supabase.from('tracker_settings').insert([
    { type: 'water', goal: 2500, display_unit: 'glass', unit_size: 250 },
    { type: 'steps', goal: 10000, display_unit: 'steps', unit_size: null },
    { type: 'sleep', goal: 480, display_unit: 'hm', unit_size: null },
    { type: 'calories', goal: 2000, display_unit: 'kcal', unit_size: null },
  ]));
}
