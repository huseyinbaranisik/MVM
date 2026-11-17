'use no memo'; // widget kütüphanesi React Compiler dönüşümünü desteklemiyor

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetData } from '@/widget/data';
import { colors } from '@/theme';

type Hex = `#${string}`;
const c = (v: string) => v as Hex;
const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
const steps = (n: number) => n.toLocaleString('tr-TR');

/** Widget boyutu (dp): 3x1 tek satır, 3x2 kompakt, 4x2 tam. */
export type WidgetSize = { width: number; height: number };
const layoutOf = (s?: WidgetSize) => (!s ? 'medium' : s.height < 100 ? 'row' : s.width < 260 ? 'medium' : 'large');

/** Ana ekran widget'ı: seri, seviye, (genişse) günün planı, su (+ bardak) ve adım. Boşluğa dokununca uygulama açılır. */
export function TodayWidget({ data, size }: { data: WidgetData; size?: WidgetSize }) {
  const layout = layoutOf(size);
  if (!data.signedIn) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ ...box, justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget text="MVM" style={{ fontSize: layout === 'row' ? 16 : 20, fontWeight: '800', color: c(colors.textPrimary) }} />
        {layout !== 'row' ? <TextWidget text="Giriş yap" style={{ fontSize: 13, color: c(colors.textSecondary) }} /> : null}
      </FlexWidget>
    );
  }

  const plus = (d: number) => (
    <FlexWidget clickAction="ADD_WATER"
      style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c(colors.primary), justifyContent: 'center', alignItems: 'center' }}>
      <TextWidget text="+" style={{ fontSize: d * 0.55, fontWeight: '800', color: c(colors.onPrimary) }} />
    </FlexWidget>
  );

  if (layout === 'row') {
    // 3x1: tek satır — seri, su (+), adım
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ ...box, padding: 8, flexDirection: 'row', alignItems: 'center', flexGap: 10 }}>
        <TextWidget text={`Seri ${data.streak}`} style={{ fontSize: 15, fontWeight: '800', color: c(colors.textPrimary) }} />
        <FlexWidget style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
          <TextWidget text={`Su ${fmt(data.water)}/${fmt(data.waterGoal)}`} maxLines={1}
            style={{ fontSize: 13, fontWeight: '700', color: c(colors.textPrimary) }} />
          {plus(28)}
        </FlexWidget>
        <TextWidget text={`${steps(data.steps)} adım`} maxLines={1} style={{ fontSize: 13, fontWeight: '700', color: c(colors.textPrimary) }} />
      </FlexWidget>
    );
  }

  const large = layout === 'large';
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ ...box, padding: large ? 12 : 10 }}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', alignItems: 'center' }}>
        <TextWidget text={large ? `Seri ${data.streak} gün` : `Seri ${data.streak}`}
          style={{ fontSize: 15, fontWeight: '800', color: c(colors.textPrimary) }} />
        <FlexWidget style={{ flex: 1 }} />
        <FlexWidget style={{ backgroundColor: c(colors.primary), borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
          <TextWidget text={`Sv ${data.level}`} style={{ fontSize: 12, fontWeight: '800', color: c(colors.onPrimary) }} />
        </FlexWidget>
      </FlexWidget>
      {large ? (
        <TextWidget text={data.plan} maxLines={1} truncate="END" style={{ fontSize: 13, color: c(colors.textSecondary), marginTop: 4 }} />
      ) : null}
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: large ? 8 : 6, flexGap: 6, flex: 1 }}>
        <FlexWidget style={{ ...tile, flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget text="Su" style={label} />
            <TextWidget text={large ? `${fmt(data.water)} / ${fmt(data.waterGoal)}` : fmt(data.water)} style={value} />
          </FlexWidget>
          {plus(large ? 36 : 30)}
        </FlexWidget>
        <FlexWidget style={{ ...tile, justifyContent: 'center' }}>
          <TextWidget text="Adım" style={label} />
          <TextWidget text={large ? `${steps(data.steps)} / ${steps(data.stepGoal)}` : steps(data.steps)} style={value} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

const box = {
  width: 'match_parent' as const, height: 'match_parent' as const, padding: 12, borderRadius: 20,
  backgroundColor: c(colors.background), borderWidth: 1, borderColor: c(colors.divider),
};
const tile = { flex: 1, height: 'match_parent' as const, backgroundColor: c(colors.surface), borderRadius: 14, padding: 8 };
const label = { fontSize: 11, color: c(colors.textSecondary) };
const value = { fontSize: 15, fontWeight: '800' as const, color: c(colors.textPrimary) };
