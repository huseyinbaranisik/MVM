import { create } from 'zustand';

import { cancelReminder, scheduleIn } from '@/services/notifications';
import { adjustRestState } from '@/services/workout';
import { t } from '@/i18n';

const REST_NOTIFICATION = 'rest-timer';

// Dinlenme zamanlayıcısı ekran değişse de sürsün diye global; bitiş anı mutlak zaman olarak tutulur.
interface WorkoutState {
  restEndsAt: number | null;
  restTotal: number;
  startRest: (seconds: number) => void;
  adjustRest: (deltaSec: number) => void;
  stopRest: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  restEndsAt: null,
  restTotal: 0,
  startRest: (seconds) => {
    set({ restEndsAt: Date.now() + seconds * 1000, restTotal: seconds });
    scheduleIn(REST_NOTIFICATION, seconds, t('Dinlenme bitti 💪'), t('Sıradaki sete geç.')).catch(() => {});
  },
  adjustRest: (delta) => {
    const { restEndsAt, restTotal } = get();
    if (!restEndsAt) return;
    const { endsAt, total } = adjustRestState({ endsAt: restEndsAt, total: restTotal }, delta, Date.now());
    set({ restEndsAt: endsAt, restTotal: total });
    scheduleIn(REST_NOTIFICATION, (endsAt - Date.now()) / 1000, t('Dinlenme bitti 💪'), t('Sıradaki sete geç.')).catch(() => {});
  },
  stopRest: () => {
    set({ restEndsAt: null });
    cancelReminder(REST_NOTIFICATION);
  },
}));
