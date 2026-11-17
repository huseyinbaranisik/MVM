import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetData } from '@/widget/data';
import { colors } from '@/theme';

type Hex = `#${string}`;
const c = (v: string) => v as Hex;
const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });

/** Ana ekran widget'ı: seri, seviye, günün planı, su (+ bardak) ve adım. Boşluğa dokununca uygulama açılır. */
export function TodayWidget({ data }: { data: WidgetData }) {
  if (!data.signedIn) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ ...box, justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget text="MVM" style={{ fontSize: 20, fontWeight: '800', color: c(colors.textPrimary) }} />
        <TextWidget text="Giriş yap" style={{ fontSize: 13, color: c(colors.textSecondary) }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget clickAction="OPEN_APP" style={box}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', alignItems: 'center' }}>
        <TextWidget text={`Seri ${data.streak} gün`} style={{ fontSize: 15, fontWeight: '800', color: c(colors.textPrimary) }} />
        <FlexWidget style={{ flex: 1 }} />
        <FlexWidget style={{ backgroundColor: c(colors.primary), borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
          <TextWidget text={`Sv ${data.level}`} style={{ fontSize: 12, fontWeight: '800', color: c(colors.onPrimary) }} />
        </FlexWidget>
      </FlexWidget>
      <TextWidget text={data.plan} maxLines={1} truncate="END"
        style={{ fontSize: 13, color: c(colors.textSecondary), marginTop: 4 }} />
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: 8, flexGap: 8 }}>
        <FlexWidget style={{ ...tile, flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget text="Su" style={label} />
            <TextWidget text={`${fmt(data.water)} / ${fmt(data.waterGoal)}`} style={value} />
          </FlexWidget>
          <FlexWidget clickAction="ADD_WATER"
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c(colors.primary), justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget text="+" style={{ fontSize: 20, fontWeight: '800', color: c(colors.onPrimary) }} />
          </FlexWidget>
        </FlexWidget>
        <FlexWidget style={tile}>
          <TextWidget text="Adım" style={label} />
          <TextWidget text={`${data.steps.toLocaleString('tr-TR')} / ${data.stepGoal.toLocaleString('tr-TR')}`} style={value} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

const box = {
  width: 'match_parent' as const, height: 'match_parent' as const, padding: 12, borderRadius: 20,
  backgroundColor: c(colors.background), borderWidth: 1, borderColor: c(colors.divider),
};
const tile = { flex: 1, backgroundColor: c(colors.surface), borderRadius: 14, padding: 8 };
const label = { fontSize: 11, color: c(colors.textSecondary) };
const value = { fontSize: 15, fontWeight: '800' as const, color: c(colors.textPrimary) };
