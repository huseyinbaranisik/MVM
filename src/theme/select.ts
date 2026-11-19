import { reloadAppAsync } from 'expo';
import { DevSettings } from 'react-native';

import { setSetting } from '@/db/repos/settings';
import { readDevicePrefs, writeDevicePrefs, type DevicePrefs, type Lang } from '@/services/devicePrefs';

import { type CustomColors, type ThemeId } from './colors';

/** Stiller ve metinler açılışta oluştuğu için görünüm değişince uygulama yeniden başlar. */
export async function restartApp(reason: string) {
  // Expo Go'da reloadAppAsync sessizce hiçbir şey yapmıyor; geliştirme modunda RN'in kendi yenilemesi
  if (__DEV__) DevSettings.reload(reason);
  else await reloadAppAsync(reason);
}

/** Cihaza yazar, hesaba kaydetmeyi dener (bağlantı yoksa cihazdaki değer sonra yüklenir), sonra yeniden başlatır. */
async function save(patch: Partial<DevicePrefs>) {
  const next = { ...readDevicePrefs(), ...patch };
  writeDevicePrefs(next);
  try { await setSetting('appearance', next); } catch { /* PrefsSync bir sonraki açılışta yükler */ }
  await restartApp('Görünüm değişti');
}

export const setTheme = (id: ThemeId | 'custom') => save({ theme: id });

export const setCustomTheme = (c: CustomColors) => save({ theme: 'custom', custom: JSON.stringify(c) });

export const setLanguage = (lang: Lang) => save({ lang });
