import * as Notifications from 'expo-notifications';
import { AndroidImportance, SchedulableTriggerInputTypes } from 'expo-notifications';

import { parseHM } from './sleep';

// Sadece yerel bildirimler (push yok). Uygulama açıkken de gösterilsin:
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

const CHANNEL = 'reminders';

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Her gün 'HH:MM'de tekrarlayan bildirim. Aynı id ile tekrar çağrılırsa eskisinin yerine geçer. İzin yoksa false. */
export async function scheduleDaily(id: string, time: string, title: string, body: string) {
  if (!(await ensurePermission())) return false;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Hatırlatıcılar', importance: AndroidImportance.DEFAULT,
  });
  await cancelReminder(id);
  const min = parseHM(time);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: Math.floor(min / 60), minute: min % 60, channelId: CHANNEL,
    },
  });
  return true;
}

export async function cancelReminder(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/** `seconds` saniye sonra bir kez bildirim (ör. dinlenme bitti). Uygulama arka planda olsa da gelir. */
export async function scheduleIn(id: string, seconds: number, title: string, body: string) {
  if (!(await ensurePermission())) return false;
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Hatırlatıcılar', importance: AndroidImportance.DEFAULT });
  await cancelReminder(id);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)), channelId: CHANNEL },
  });
  return true;
}
