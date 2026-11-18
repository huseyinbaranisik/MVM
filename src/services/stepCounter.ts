import { Pedometer } from 'expo-sensors';

import { notify } from '@/db/bus';
import { addTrackerValue } from '@/db/repos/trackers';
import { today } from '@/services/dates';
import { readStepCounter } from '../../modules/mvm-steps';

export interface CounterState { steps: number; bootTime: number }

const KEY = 'mvm.stepCounter';
const BOOT_TOLERANCE = 60_000; // açılış zamanı hesabı birkaç sn oynar
const MAX_DELTA = 100_000; // bozuk okumaya karşı

/**
 * Önceki okumadan bu yana atılan adımlar. Telefon yeniden başlatıldıysa sayaç sıfırdan başlar:
 * açılıştan beri sayılanların hepsi yeni. İlk okumada (önceki yok) yalnızca başlangıç alınır.
 */
export function counterDelta(prev: CounterState | null, cur: CounterState) {
  if (!prev) return 0;
  const sameBoot = Math.abs(cur.bootTime - prev.bootTime) < BOOT_TOLERANCE && cur.steps >= prev.steps;
  const d = sameBoot ? cur.steps - prev.steps : cur.steps;
  return d > 0 && d < MAX_DELTA ? Math.round(d) : 0;
}

let busy = false;

/**
 * Donanım adım sayacını okur ve son okumadan beri atılan adımları bugüne ekler (uygulama kapalıyken atılanlar dahil).
 * Sayaç yoksa (Expo Go, sensörsüz cihaz) ya da izin verilmediyse false.
 * shortcut: kapalıyken atılan adımların hepsi okunduğu güne yazılır; gece yarısını aşan aralık bölünmez.
 */
export async function syncStepCounter(): Promise<boolean> {
  if (busy) return true;
  busy = true;
  try {
    if (!(await Pedometer.requestPermissionsAsync()).granted) return false;
    const r = await readStepCounter();
    if (!r) return false;
    let prev: CounterState | null = null;
    try { prev = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { prev = null; }
    const d = counterDelta(prev, r);
    // önce kaydet: yazma başarısız olsa da aynı adımlar ikinci kez eklenmesin
    localStorage.setItem(KEY, JSON.stringify(r));
    if (d > 0) {
      await addTrackerValue('steps', today(), d);
      notify('daily_trackers');
    }
    return true;
  } catch (e) {
    console.warn('Adım sayacı okunamadı', e);
    return false;
  } finally {
    busy = false;
  }
}
