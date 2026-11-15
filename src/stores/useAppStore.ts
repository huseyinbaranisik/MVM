import { create } from 'zustand';

import { today, type DateStr } from '@/services/dates';

// Kalıcı veri Supabase'de; burada sadece oturum boyunca yaşayan UI durumu var.
interface AppState {
  selectedDate: DateStr;
  setSelectedDate: (d: DateStr) => void;
  stepSensor: 'unknown' | 'on' | 'off';
  setStepSensor: (s: AppState['stepSensor']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: today(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  stepSensor: 'unknown',
  setStepSensor: (stepSensor) => set({ stepSensor }),
}));
