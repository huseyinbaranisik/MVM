'use no memo'; // widget kütüphanesi React Compiler dönüşümünü desteklemiyor

import { useEffect } from 'react';

import { subscribe } from '@/db/bus';

const TABLES = new Set(['daily_trackers', 'tracker_settings', 'streak_state', 'day_schedule_items', 'workout_templates', 'session_sets', 'workout_sessions', 'habit_logs']);

/** Görünmez: uygulamadaki ilgili değişikliklerde ana ekran widget'ını yeniler (Expo Go'da widget modülü yok, sessizce atlar). */
export function WidgetSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const update = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- yerel modül Expo Go'da yok
        const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
        const [{ getWidgetData }, { TodayWidget }, { WIDGET_NAME }] = await Promise.all([
          import('@/widget/data'), import('@/widget/TodayWidget'), import('@/widget/handler'),
        ]);
        const data = await getWidgetData();
        await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => <TodayWidget data={data} /> });
      } catch {
        // widget modülü yok ya da widget eklenmemiş
      }
    };
    update();
    const unsub = subscribe((t) => {
      if (!t.has('*') && ![...t].some((x) => TABLES.has(x))) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(update, 1500);
    });
    return () => { unsub(); if (timer) clearTimeout(timer); };
  }, []);
  return null;
}
