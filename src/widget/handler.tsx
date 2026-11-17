import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { addTrackerValue } from '@/db/repos/trackers';
import { today } from '@/services/dates';
import { getWidgetData } from '@/widget/data';
import { TodayWidget } from '@/widget/TodayWidget';

export const WIDGET_NAME = 'Today';

/** Widget olayları (uygulama kapalıyken de arka planda çalışır). */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  try {
    if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'ADD_WATER') {
      const d = await getWidgetData();
      if (d.signedIn) await addTrackerValue('water', today(), d.glassMl);
    }
    props.renderWidget(<TodayWidget data={await getWidgetData()} />);
  } catch (e) {
    console.warn('Widget güncellenemedi', e);
  }
}
