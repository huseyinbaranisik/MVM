import { reloadAppAsync } from 'expo';
import { DevSettings } from 'react-native';

import { THEME_KEY, type ThemeId } from './colors';

/** Temayı kaydeder ve uygulamayı yeniden başlatır (stiller açılışta oluştuğu için gerekli). */
export async function setTheme(id: ThemeId) {
  localStorage.setItem(THEME_KEY, id);
  // Expo Go'da reloadAppAsync sessizce hiçbir şey yapmıyor; geliştirme modunda RN'in kendi yenilemesi
  if (__DEV__) DevSettings.reload('Tema değişti');
  else await reloadAppAsync('Tema değişti');
}
