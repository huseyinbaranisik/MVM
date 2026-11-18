import { requireOptionalNativeModule } from 'expo';

type Reading = { steps: number; bootTime: number } | null;

/** Yerel modül Expo Go'da ve Android dışında yok: o zaman null. */
const native = requireOptionalNativeModule<{ readStepCounter(): Promise<Reading> }>('MvmSteps');

export function readStepCounter(): Promise<Reading> {
  return native ? native.readStepCounter() : Promise.resolve(null);
}
