import { create } from 'zustand';

import { today, type DateStr } from '@/services/dates';

// Kalıcı veri Supabase'de; burada sadece oturum boyunca yaşayan UI durumu var.
interface AppState {
  selectedDate: DateStr;
  setSelectedDate: (d: DateStr) => void;
  stepSensor: 'unknown' | 'on' | 'off' | 'health';
  /** Health Connect bağlantısı değişince adım takibini yeniden kurmak için */
  healthTick: number;
  bumpHealth: () => void;
  setStepSensor: (s: AppState['stepSensor']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: today(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  stepSensor: 'unknown',
  healthTick: 0,
  bumpHealth: () => set((s) => ({ healthTick: s.healthTick + 1 })),
  setStepSensor: (stepSensor) => set({ stepSensor }),
}));
