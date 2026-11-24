import { requireOptionalNativeModule } from 'expo';

type Reading = { steps: number; bootTime: number } | null;

/**
 * Yerel modül Expo Go'da ve Android dışında yok, ya da telefonda adım sayacı yok: o zaman null.
 * Sayaç var ama birkaç saniye içinde değer göndermediyse (telefon hareketsiz) steps = -1.
 */
const native = requireOptionalNativeModule<{ readStepCounter(): Promise<Reading> }>('MvmSteps');

export function readStepCounter(): Promise<Reading> {
  return native ? native.readStepCounter() : Promise.resolve(null);
}
