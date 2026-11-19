import { useEffect } from 'react';

import { getSetting, setSetting } from '@/db/repos/settings';
import { parsePrefs, readDevicePrefs, samePrefs, writeDevicePrefs } from '@/services/devicePrefs';
import { restartApp } from '@/theme/select';

/**
 * Görünmez: oturum açılınca hesaptaki tema ve dili cihazdakiyle karşılaştırır.
 * Hesapta kayıt yoksa (eski sürüm) cihazdakini yükler; farklıysa hesabınkini uygular ve yeniden başlatır.
 */
export function PrefsSync() {
  useEffect(() => {
    let alive = true;
    (async () => {
      const remote = parsePrefs(await getSetting('appearance'));
      const local = readDevicePrefs();
      if (!alive) return;
      if (!remote) { await setSetting('appearance', local); return; }
      if (samePrefs(remote, local)) return;
      writeDevicePrefs(remote);
      await restartApp('Görünüm hesaptan yüklendi');
    })().catch((e) => console.warn('Görünüm eşitlenemedi', e));
    return () => { alive = false; };
  }, []);
  return null;
}
