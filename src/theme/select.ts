import { reloadAppAsync } from 'expo';
import { DevSettings } from 'react-native';

import { CUSTOM_KEY, THEME_KEY, type CustomColors, type ThemeId } from './colors';

/** Temayı kaydeder ve uygulamayı yeniden başlatır (stiller açılışta oluştuğu için gerekli). */
export async function setTheme(id: ThemeId | 'custom') {
  localStorage.setItem(THEME_KEY, id);
  // Expo Go'da reloadAppAsync sessizce hiçbir şey yapmıyor; geliştirme modunda RN'in kendi yenilemesi
  if (__DEV__) DevSettings.reload('Tema değişti');
  else await reloadAppAsync('Tema değişti');
}

/** Özel temanın renklerini kaydeder ve uygular. */
export function setCustomTheme(c: CustomColors) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(c));
  return setTheme('custom');
}
