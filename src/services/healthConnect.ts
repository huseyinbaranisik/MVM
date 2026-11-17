// Health Connect: telefonun (ya da Google Fit / Samsung Health'in) arka planda saydığı adımları okur.
// Expo Go'da yerel modül yok: modül çağrı anında yüklenir, yoksa "kullanılamaz" sayılır.
import { addDays, type DateStr } from '@/services/dates';

const KEY = 'mvm.healthConnect';
type HC = typeof import('react-native-health-connect');

function hc(): HC | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- yerel modül Expo Go'da yok
    return require('react-native-health-connect') as HC;
  } catch {
    return null;
  }
}

/** Bu cihazda Health Connect kurulu ve kullanılabilir mi. */
export async function healthConnectAvailable() {
  const m = hc();
  if (!m) return false;
  try {
    return (await m.getSdkStatus()) === m.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

/** Kullanıcı bağlantıyı açtı ve adım okuma izni hâlâ verili mi. */
export async function healthConnectConnected() {
  if (globalThis.localStorage?.getItem(KEY) !== '1') return false;
  const m = hc();
  if (!m || !(await healthConnectAvailable())) return false;
  try {
    await m.initialize();
    return (await m.getGrantedPermissions()).some((p) => p.recordType === 'Steps' && p.accessType === 'read');
  } catch {
    return false;
  }
}

/** İzin ister; verilirse bağlantıyı kaydeder. */
export async function connectHealthConnect() {
  const m = hc();
  if (!m || !(await healthConnectAvailable())) return false;
  await m.initialize();
  const granted = await m.requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
  const ok = granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
  if (ok) globalThis.localStorage?.setItem(KEY, '1');
  return ok;
}

const ASKED = 'mvm.healthConnectAsked';

/** Otomatik bağlantı: Health Connect varsa izni ilk açılışta bir kez kendiliğinden ister; reddedilir ya da kesilirse tekrar sormaz. */
export async function autoConnectHealthConnect() {
  const ls = globalThis.localStorage;
  if (ls?.getItem(ASKED) === '1' || ls?.getItem(KEY) === '1') return;
  if (!(await healthConnectAvailable())) return;
  ls?.setItem(ASKED, '1');
  try {
    await connectHealthConnect();
  } catch (e) {
    console.warn('Health Connect izni istenemedi', e);
  }
}

export function disconnectHealthConnect() {
  globalThis.localStorage?.removeItem(KEY);
}

/** Yerel günün başı ve sonu (ISO). */
function dayRange(date: DateStr) {
  const [y, mo, d] = date.split('-').map(Number);
  return { startTime: new Date(y, mo - 1, d).toISOString(), endTime: new Date(y, mo - 1, d + 1).toISOString() };
}

/** Son `days` günün günlük adım toplamları (bugün dahil). */
export async function readDailySteps(today: DateStr, days = 7): Promise<{ date: DateStr; steps: number }[]> {
  const m = hc();
  if (!m) return [];
  await m.initialize();
  const out: { date: DateStr; steps: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const r = await m.aggregateRecord({ recordType: 'Steps', timeRangeFilter: { operator: 'between', ...dayRange(date) } });
    out.push({ date, steps: r.COUNT_TOTAL ?? 0 });
  }
  return out;
}
