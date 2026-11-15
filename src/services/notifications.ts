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

/**
 * Bildirim kanalını hazırlar. Expo Go (SDK 58, Android) kanal oluştururken native NullPointerException veriyor;
 * o durumda kanalsız (sistemin varsayılan kanalı) devam edilir ki hatırlatıcı yine kurulsun.
 */
async function channelId(): Promise<string | undefined> {
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Hatırlatıcılar', importance: AndroidImportance.DEFAULT });
    return CHANNEL;
  } catch {
    return undefined;
  }
}

export async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Her gün 'HH:MM'de tekrarlayan bildirim. Aynı id ile tekrar çağrılırsa eskisinin yerine geçer. İzin yoksa false. */
export async function scheduleDaily(id: string, time: string, title: string, body: string) {
  if (!(await ensurePermission())) return false;
  const channel = await channelId();
  await cancelReminder(id);
  const min = parseHM(time);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: Math.floor(min / 60), minute: min % 60, channelId: channel,
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
  const channel = await channelId();
  await cancelReminder(id);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)), channelId: channel },
  });
  return true;
}

export async function hasPermission() {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Belirli bir anda bir kez bildirim. Aynı id ile tekrar çağrılırsa eskisinin yerine geçer. İzin istemez; izin yoksa false. */
export async function scheduleAt(id: string, at: Date, title: string, body: string) {
  if (!(await hasPermission())) return false;
  const channel = await channelId();
  await cancelReminder(id);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: at, channelId: channel },
  });
  return true;
}
