'use no memo'; // widget kütüphanesi React Compiler dönüşümünü desteklemiyor

import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetData, WidgetPlan } from '@/widget/data';
import { barSvg, ICONS, iconSvg, mannequinSvg, ringSvg } from '@/widget/svg';
import { colors, mix } from '@/theme/colors';
import { isEn, locale, t } from '@/i18n';

type Hex = `#${string}`;
const c = (v: string) => v as Hex;
const n1 = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });
const int = (n: number) => Math.round(n).toLocaleString(locale);
const short = (n: number) => (n >= 1000 ? `${n1(n / 1000)}${isEn ? 'k' : 'b'}` : String(Math.round(n)));
const HR = isEn ? 'h' : 's';
const TRACK = mix(colors.background, colors.textPrimary, 0.14);

/** Widget boyutu (dp): 3x1 tek satır, 3x2 orta, 4x2 geniş. */
export type WidgetSize = { width: number; height: number };
type Layout = 'row' | 'mid' | 'large';
const layoutOf = (s?: WidgetSize): Layout => (!s ? 'mid' : s.height < 100 ? 'row' : s.width < 320 ? 'mid' : 'large');

/** Solda günün programları, sağda gösterge halkaları, sağ üstte seri, altta XP. Su halkası bardak ekler. */
export function TodayWidget({ data, size }: { data: WidgetData; size?: WidgetSize }) {
  const L = layoutOf(size);
  if (!data.signedIn) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ ...box, justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget text="MVM" style={{ fontSize: L === 'row' ? 16 : 20, fontWeight: '800', color: c(colors.textPrimary) }} />
        {L !== 'row' ? <TextWidget text={t('Giriş yap')} style={{ fontSize: 13, color: c(colors.textSecondary) }} /> : null}
      </FlexWidget>
    );
  }

  const W = size?.width ?? 300;
  const H = size?.height ?? 180;
  const pad = 10;
  const xpH = L === 'row' ? 12 : 16;
  const bodyH = H - pad * 2 - xpH - 6; // programlar + halkalar alanı
  const leftW = Math.round((W - pad * 2) * (L === 'large' ? 0.46 : 0.45));
  const rings = [
    { key: 'Su', name: t('Su'), ratio: data.waterGoal ? data.water / data.waterGoal : 0, color: colors.ice, value: n1(data.water), cap: `${t('Su')} ${n1(data.water)}/${n1(data.waterGoal)}`, water: true },
    { key: 'Adım', name: t('Adım'), ratio: data.stepGoal ? data.steps / data.stepGoal : 0, color: colors.success, value: short(data.steps), cap: `${int(data.steps)} ${t('adım')}` },
    { key: 'Kalori', name: t('Kalori'), ratio: data.kcalGoal ? data.kcal / data.kcalGoal : 0, color: colors.warning, value: short(data.kcal), cap: `${int(data.kcal)} kcal` },
    { key: 'Uyku', name: t('Uyku'), ratio: data.sleepMin != null && data.sleepGoal ? data.sleepMin / data.sleepGoal : 0, color: colors.primaryLight,
      value: data.sleepMin != null ? `${n1(data.sleepMin / 60)}${HR}` : '–', cap: data.sleepMin != null ? `${t('Uyku')} ${n1(data.sleepMin / 60)} ${t('sa')}` : t('Uyku') },
  ].slice(0, L === 'row' ? 2 : 4);

  // halka çapı: sağ alanın genişliğine ve yüksekliğine sığacak şekilde (2×2 ızgara; tek satırda 2 yan yana)
  const rightW = W - pad * 2 - leftW - 8 - (L === 'row' ? 34 : 0);
  const capH = L === 'row' ? 0 : 20; // alt yazı + boşluk
  const cell = L === 'row' ? Math.min(bodyH - 4, rightW / 2 - 6) : Math.min((bodyH - 18) / 2 - capH, rightW / 2 - 12);
  const ring = Math.max(26, Math.floor(cell));

  const streak = (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 2 }}>
      <SvgWidget svg={iconSvg(ICONS.fire, colors.warning)} style={{ width: 15, height: 15 }} />
      <TextWidget text={L === 'large' ? t('{n} gün', { n: data.streak }) : String(data.streak)}
        style={{ fontSize: L === 'row' ? 12 : 13, fontWeight: '800', color: c(colors.textPrimary) }} />
    </FlexWidget>
  );

  return (
    <FlexWidget clickAction="OPEN_APP" style={{ ...box, padding: pad }}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', height: bodyH, flexGap: 8 }}>
        <Plans plans={data.plans} width={leftW} height={bodyH} layout={L} />
        {/* widget kütüphanesi React Fragment desteklemiyor: tek satır düzeninin iki parçası ayrı koşullarla */}
        {L === 'row' ? (
          <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            {rings.map((r) => <Ring key={r.key} r={r} size={ring} layout={L} />)}
          </FlexWidget>
        ) : null}
        {L === 'row' ? <FlexWidget style={{ width: 30, height: 'match_parent', alignItems: 'flex-end' }}>{streak}</FlexWidget> : null}
        {L === 'row' ? null : (
          <FlexWidget style={{ flex: 1, height: 'match_parent' }}>
            <FlexWidget style={{ width: 'match_parent', height: 18, alignItems: 'flex-end' }}>{streak}</FlexWidget>
            {[0, 2].map((i) => (
              <FlexWidget key={i} style={{ flex: 1, width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
                {rings.slice(i, i + 2).map((r) => <Ring key={r.key} r={r} size={ring} layout={L} />)}
              </FlexWidget>
            ))}
          </FlexWidget>
        )}
      </FlexWidget>
      <Xp data={data} layout={L} height={xpH} width={W - pad * 2} />
    </FlexWidget>
  );
}

function Plans({ plans, width, height, layout }: { plans: WidgetPlan[]; width: number; height: number; layout: Layout }) {
  if (!plans.length) {
    return (
      <FlexWidget style={{ ...tile, width, height: 'match_parent', justifyContent: 'center' }}>
        <TextWidget text={t('Plan yok')} style={{ fontSize: 13, fontWeight: '700', color: c(colors.textSecondary) }} />
      </FlexWidget>
    );
  }
  const gap = 6;
  const h = Math.floor((height - gap * (plans.length - 1)) / plans.length);
  return (
    <FlexWidget style={{ width, height: 'match_parent', flexGap: gap }}>
      {plans.map((p, i) => <Plan key={i} plan={p} width={width} height={h} layout={layout} />)}
    </FlexWidget>
  );
}

function Plan({ plan, width, height, layout }: { plan: WidgetPlan; width: number; height: number; layout: Layout }) {
  const name = (size: number) => (
    <TextWidget text={plan.name} maxLines={1} truncate="END" style={{ fontSize: size, fontWeight: '800', color: c(colors.textPrimary) }} />
  );
  const sub = layout === 'large' && plan.sub
    ? <TextWidget text={plan.sub} maxLines={1} truncate="END" style={{ fontSize: 11, color: c(colors.textSecondary) }} /> : null;

  if (plan.kind !== 'workout') {
    return (
      <FlexWidget style={{ ...tile, width, height, flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
        {layout !== 'row' ? <SvgWidget svg={iconSvg(plan.kind === 'walk' ? ICONS.walk : ICONS.moon, colors.primaryLight)} style={{ width: 18, height: 18 }} /> : null}
        <FlexWidget style={{ flex: 1 }}>{name(layout === 'row' ? 12 : 13)}{sub}</FlexWidget>
      </FlexWidget>
    );
  }

  const mq = mannequinSvg(plan.regions, mix(colors.primaryLight, '#FFFFFF', 0.3), mix(colors.surface, colors.textPrimary, 0.18), mix(colors.surface, colors.textPrimary, 0.1));
  if (layout === 'mid') {
    // ad üstte, manken altta (yan yana sığmıyor)
    const mh = Math.max(16, height - 8 - 18 - 4);
    return (
      <FlexWidget style={{ ...tile, width, height, flexGap: 4 }}>
        {name(13)}
        <SvgWidget svg={mq.svg} style={{ height: mh, width: Math.min(Math.round(mh * mq.aspect), width - 16) }} />
      </FlexWidget>
    );
  }
  // tek satır ve geniş: yazı solda (kısalır), manken sağda sabit genişlikte
  // manken en fazla döşemenin üçte biri kadar yer kaplar: adın sığması öncelikli
  const mw = Math.round(Math.min((height - (layout === 'row' ? 6 : 12)) * mq.aspect, width * 0.32));
  const mh = Math.round(mw / mq.aspect);
  return (
    <FlexWidget style={{ ...tile, width, height, flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
      <FlexWidget style={{ flex: 1 }}>{name(layout === 'row' ? 12 : 14)}{sub}</FlexWidget>
      <SvgWidget svg={mq.svg} style={{ height: mh, width: mw }} />
    </FlexWidget>
  );
}

type RingItem = { key: string; name: string; ratio: number; color: string; value: string; cap: string; water?: boolean };
function Ring({ r, size, layout }: { r: RingItem; size: number; layout: Layout }) {
  const stroke = Math.max(3, Math.round(size * 0.12));
  const label = layout === 'large' ? (r.key === 'Su' ? r.value : `%${Math.round(Math.min(1, r.ratio) * 100)}`) : r.value;
  return (
    <FlexWidget clickAction={r.water ? 'ADD_WATER' : 'OPEN_APP'} style={{ alignItems: 'center' }}>
      <OverlapWidget style={{ width: size, height: size }}>
        <SvgWidget svg={ringSvg(r.ratio, r.color, TRACK, size, stroke)} style={{ width: size, height: size }} />
        <FlexWidget style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget text={label} maxLines={1}
            style={{ fontSize: Math.max(9, Math.min(13, Math.floor((size - stroke * 2) / Math.max(3, label.length) * 1.5))), fontWeight: '800', color: c(colors.textPrimary) }} />
        </FlexWidget>
      </OverlapWidget>
      {layout !== 'row' ? (
        <TextWidget text={layout === 'large' ? r.cap : r.name} maxLines={1} style={{ fontSize: 10, color: c(colors.textSecondary), marginTop: 2 }} />
      ) : null}
    </FlexWidget>
  );
}

function Xp({ data, layout, height, width }: { data: WidgetData; layout: Layout; height: number; width: number }) {
  const ratio = data.xpNeeded ? data.xpInto / data.xpNeeded : 0;
  const left = layout === 'row' ? `Sv ${data.level}` : `Sv ${data.level} · ${data.rank}`;
  const right = layout === 'row' ? '' : layout === 'large' ? `${data.xpInto} / ${data.xpNeeded} XP` : `${data.xpInto}/${data.xpNeeded}`;
  // shortcut: yazı genişliği karakter başına ~6.6 dp tahmini; çubuk taşarsa bu katsayıyı büyüt
  const barW = Math.max(30, Math.round(width - (left.length + right.length) * 6.6 - (right ? 16 : 8)));
  return (
    <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', height, alignItems: 'center', flexGap: 8, marginTop: 6 }}>
      <TextWidget text={left} style={{ fontSize: 11, fontWeight: '700', color: c(colors.textSecondary) }} />
      <SvgWidget svg={barSvg(ratio, mix(colors.primaryLight, '#FFFFFF', 0.15), TRACK, barW, 6)} style={{ width: barW, height: 6 }} />
      {right ? <TextWidget text={right} style={{ fontSize: 11, fontWeight: '700', color: c(colors.textSecondary) }} /> : null}
    </FlexWidget>
  );
}

const box = {
  width: 'match_parent' as const, height: 'match_parent' as const, borderRadius: 22,
  backgroundColor: c(colors.background), borderWidth: 1, borderColor: c(colors.divider),
};
const tile = { backgroundColor: c(colors.surface), borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, justifyContent: 'center' as const };
