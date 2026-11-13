import { create } from 'zustand';

import { cancelReminder, scheduleIn } from '@/services/notifications';

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
    scheduleIn(REST_NOTIFICATION, seconds, 'Dinlenme bitti 💪', 'Sıradaki sete geç.').catch(() => {});
  },
  adjustRest: (delta) => {
    const { restEndsAt, restTotal } = get();
    if (!restEndsAt) return;
    const endsAt = Math.max(Date.now() + 1000, restEndsAt + delta * 1000);
    set({ restEndsAt: endsAt, restTotal: Math.max(1, restTotal + delta) });
    scheduleIn(REST_NOTIFICATION, (endsAt - Date.now()) / 1000, 'Dinlenme bitti 💪', 'Sıradaki sete geç.').catch(() => {});
  },
  stopRest: () => {
    set({ restEndsAt: null });
    cancelReminder(REST_NOTIFICATION);
  },
}));
