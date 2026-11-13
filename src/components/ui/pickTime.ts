import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { parseHM, toHM } from '@/services/sleep';

// shortcut: sadece Android'in yerel saat diyaloğu; iOS desteği gerekirse satır içi DateTimePicker eklenmeli.
/** Saat seçtirir ('HH:MM'); iptal edilirse null. */
export function pickTime(initial: string): Promise<string | null> {
  const m = parseHM(initial);
  const value = new Date();
  value.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onValueChange: (_event, date) => resolve(toHM(date.getHours() * 60 + date.getMinutes())),
      onDismiss: () => resolve(null),
    });
  });
}
