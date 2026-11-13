import { Pedometer } from 'expo-sensors';

// shortcut: Android'de expo-sensors sadece uygulama açıkken sayar (geçmiş okunamaz).
// Tam gün adımı için dev build + Health Connect gerekir (Aşama 6); ekranlar bu fonksiyonun arkasında değişmez.

/** Canlı adım sayımını başlatır; her yeni adım grubunda onDelta çağrılır. Sensör/izin yoksa null döner (manuel giriş). */
export async function startStepTracking(onDelta: (steps: number) => void): Promise<(() => void) | null> {
  try {
    if (!(await Pedometer.isAvailableAsync())) return null;
    if (!(await Pedometer.requestPermissionsAsync()).granted) return null;
  } catch {
    return null;
  }
  let last = 0;
  const sub = Pedometer.watchStepCount(({ steps }) => {
    const delta = steps - last;
    last = steps;
    if (delta > 0) onDelta(delta);
  });
  return () => sub.remove();
}
