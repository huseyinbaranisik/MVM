import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { LinearTransition, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { BackHeader } from '@/components/exercise';
import { Icon } from '@/components/Icon';
import { confirm } from '@/components/ui/overlays';
import { PillButton } from '@/components/ui/PillButton';
import { getSetting, setSetting } from '@/db/repos/settings';
import { useDb } from '@/db/useDb';
import { ALL_CARDS, DEFAULT_LAYOUT, defaultSize, HOME_CARD_NAMES, RESIZABLE, toRows, type HomeCardId, type HomeItem } from '@/services/homeLayout';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

type IconName = Parameters<typeof Icon>[0]['name'];
const ICONS: Record<HomeCardId, IconName> = {
  workout: 'fitness_center', water: 'water_drop', steps: 'directions_walk', calories: 'local_fire_department', sleep: 'bedtime', checklist: 'checklist',
};
const GAP = 6;
const PAD = 10;
/** Önizlemedeki kart yükseklikleri: ana ekrandaki oranlara yakın. */
const heightOf = (it: HomeItem) => (it.id === 'workout' ? 74 : it.id === 'checklist' ? 96 : it.size === 'small' ? 72 : 56);

type Slot = { x: number; y: number; w: number; h: number };
/** Ana ekrandaki satır kuralıyla (art arda iki küçük kart yan yana) her kartın önizlemedeki yeri. */
function slots(items: HomeItem[], width: number) {
  const out = new Map<HomeCardId, Slot>();
  let y = 0;
  const half = (width - GAP) / 2;
  for (const row of toRows(items)) {
    const h = Math.max(...row.map(heightOf));
    row.forEach((it, i) => out.set(it.id, it.size === 'small' ? { x: i * (half + GAP), y, w: half, h } : { x: 0, y, w: width, h }));
    y += h + GAP;
  }
  return { map: out, height: Math.max(0, y - GAP) };
}

/** Ana ekran düzeni: telefon önizlemesinde kartları sürükleyip bırak; dokununca küçük/büyük, köşedeki çarpı kaldırır. */
export default function HomeLayoutScreen() {
  const saved = useDb(() => getSetting('homeLayout'), [], ['settings']);
  const { width } = useWindowDimensions();
  const [preview, setPreview] = useState<HomeItem[] | null>(null); // sürükleme sırasında canlı sıra
  const [drag, setDrag] = useState<{ id: HomeCardId; start: Slot } | null>(null);
  const items = preview ?? saved ?? [];
  const phoneW = Math.min(width - spacing.lg * 2, 340);
  const innerW = phoneW - PAD * 2 - 12;
  const { map, height } = slots(items, innerW);
  const hidden = ALL_CARDS.filter((id) => !items.some((x) => x.id === id));
  const save = (next: HomeItem[]) => setSetting('homeLayout', next);

  const reset = async () => {
    if (await confirm({ title: t('Varsayılana dönülsün mü?'), confirmLabel: t('Sıfırla') })) save(DEFAULT_LAYOUT);
  };

  return (
    <View style={styles.safe}>
      <BackHeader title={t('Ana ekran düzeni')} />
      <ScrollView contentContainerStyle={styles.body} scrollEnabled={!drag}>
        <View style={[styles.phone, { width: phoneW }]}>
          <View style={styles.notch} />
          <View style={styles.fakeHeader}>
            <View style={styles.fakeAvatar} />
            <View style={styles.flex}>
              <View style={[styles.fakeLine, { width: '40%' }]} />
              <View style={[styles.fakeLine, styles.fakeTitle]} />
            </View>
          </View>
          <View style={styles.fakeDays}>{Array.from({ length: 7 }, (_, i) => <View key={i} style={styles.fakeDay} />)}</View>
          <View style={{ height }}>
            {items.map((it) => {
              const s = map.get(it.id)!;
              return (
                <MiniCard key={it.id} item={it} slot={drag?.id === it.id ? drag.start : s} dragging={drag?.id === it.id}
                  canRemove={items.length > 1}
                  onRemove={() => save(items.filter((y) => y.id !== it.id))}
                  onToggle={() => RESIZABLE.includes(it.id) && save(items.map((y) => (y.id === it.id ? { ...y, size: y.size === 'small' ? 'large' : 'small' } : y)))}
                  onStart={() => { setDrag({ id: it.id, start: s }); setPreview(items); }}
                  onMove={(dx, dy) => {
                    // parmağın altındaki kartın merkezine en yakın yuvayı bul, kartı oraya taşı
                    const o = drag?.id === it.id ? drag.start : s;
                    const cx = o.x + o.w / 2 + dx;
                    const cy = o.y + o.h / 2 + dy;
                    const base = preview ?? items;
                    const others = base.filter((y) => y.id !== it.id);
                    let best = 0;
                    let bestD = Infinity;
                    for (let i = 0; i <= others.length; i++) {
                      const trial = [...others.slice(0, i), it, ...others.slice(i)];
                      const sl = slots(trial, innerW).map.get(it.id)!;
                      const d = (sl.x + sl.w / 2 - cx) ** 2 + (sl.y + sl.h / 2 - cy) ** 2;
                      if (d < bestD) { bestD = d; best = i; }
                    }
                    const next = [...others.slice(0, best), it, ...others.slice(best)];
                    if (next.some((y, i) => y.id !== base[i]?.id)) {
                      Haptics.selectionAsync().catch(() => {});
                      setPreview(next);
                    }
                  }}
                  onEnd={() => {
                    const next = preview;
                    setDrag(null);
                    if (next && next.some((y, i) => y.id !== saved?.[i]?.id)) save(next).finally(() => setPreview(null));
                    else setPreview(null);
                  }} />
              );
            })}
          </View>
        </View>

        {hidden.length ? (
          <View style={styles.tray}>
            {hidden.map((id) => (
              <Pressable key={id} onPress={() => save([...items, { id, size: defaultSize(id) }])} style={styles.chip}
                accessibilityRole="button" accessibilityLabel={t('{name} ekle', { name: HOME_CARD_NAMES[id] })}>
                <Icon name="add" size={18} color={colors.accent} />
                <Text style={type.body}>{HOME_CARD_NAMES[id]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <PillButton label={t('Varsayılana dön')} onPress={reset} />
      </ScrollView>
    </View>
  );
}

function MiniCard({ item, slot, dragging, canRemove, onRemove, onToggle, onStart, onMove, onEnd }: {
  item: HomeItem; slot: Slot; dragging: boolean; canRemove: boolean;
  onRemove: () => void; onToggle: () => void; onStart: () => void; onMove: (dx: number, dy: number) => void; onEnd: () => void;
}) {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  // PanResponder kapanışı ilk render'daki fonksiyonları tutar: güncel olanları ref'ten çağır
  const cb = useRef({ onToggle, onStart, onMove, onEnd });
  useEffect(() => { cb.current = { onToggle, onStart, onMove, onEnd }; });
  const moved = useSharedValue(false);
  // eslint-disable-next-line react-hooks/refs -- ref yalnızca dokunma olaylarında okunur, render'da değil
  const pan = useMemo(() => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { moved.set(false); dx.set(0); dy.set(0); },
      onPanResponderMove: (_, g) => {
        if (!moved.get() && Math.hypot(g.dx, g.dy) > 6) { moved.set(true); cb.current.onStart(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }
        if (!moved.get()) return;
        dx.set(g.dx);
        dy.set(g.dy);
        cb.current.onMove(g.dx, g.dy);
      },
      onPanResponderRelease: () => {
        dx.set(0); dy.set(0);
        if (moved.get()) cb.current.onEnd(); else cb.current.onToggle();
      },
      onPanResponderTerminate: () => { dx.set(0); dy.set(0); if (moved.get()) cb.current.onEnd(); },
  }), [dx, dy, moved]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: dx.get() }, { translateY: dy.get() }, { scale: dragging ? 1.04 : 1 }] }));
  const small = item.size === 'small';
  const resizable = RESIZABLE.includes(item.id);

  return (
    <Animated.View layout={dragging ? undefined : LinearTransition.duration(160)} {...pan.panHandlers}
      style={[styles.mini, { left: slot.x, top: slot.y, width: slot.w, height: slot.h }, dragging && styles.miniDrag, anim]}
      accessibilityRole="button"
      accessibilityLabel={`${HOME_CARD_NAMES[item.id]}${resizable ? `, ${small ? t('küçük') : t('büyük')}` : ''}`}>
      <View style={[styles.miniBody, small && styles.miniBodySmall]}>
        <Icon name={ICONS[item.id]} size={small ? 22 : 20} color={colors.accent} />
        <Text style={styles.miniName} numberOfLines={1}>{HOME_CARD_NAMES[item.id]}</Text>
      </View>
      {resizable ? (
        <View style={styles.sizeTag}><Icon name={small ? 'open_in_full' : 'close_fullscreen'} size={12} color={colors.textSecondary} /></View>
      ) : null}
      {canRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('{name} kaldır', { name: HOME_CARD_NAMES[item.id] })}>
          <Icon name="close" size={14} color={colors.textPrimary} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, paddingTop: 0, gap: spacing.lg, paddingBottom: spacing.xxl, alignItems: 'center' },
  flex: { flex: 1, gap: 4 },
  phone: {
    borderRadius: 34, borderWidth: 6, borderColor: colors.surfaceElevated, backgroundColor: colors.background,
    padding: PAD, paddingTop: 8, gap: 8,
  },
  notch: { alignSelf: 'center', width: 70, height: 16, borderRadius: 8, backgroundColor: colors.surfaceElevated, marginBottom: 4 },
  fakeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fakeAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface },
  fakeLine: { height: 6, borderRadius: 3, backgroundColor: colors.surface },
  fakeTitle: { width: '70%', height: 10 },
  fakeDays: { flexDirection: 'row', gap: 4 },
  fakeDay: { flex: 1, height: 22, borderRadius: 8, backgroundColor: colors.surface },
  mini: {
    position: 'absolute', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider,
    justifyContent: 'center', paddingHorizontal: spacing.md,
  },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, paddingHorizontal: spacing.md,
    borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
  },
  miniDrag: { zIndex: 10, elevation: 8, borderColor: colors.accent },
  miniBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  miniBodySmall: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  miniName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  sizeTag: { position: 'absolute', right: 8, bottom: 6 },
  remove: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.divider,
  },
});
