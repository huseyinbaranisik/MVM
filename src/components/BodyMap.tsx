import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import type { Crop } from '@/data/bodyFocus';
import { body } from '@/data/bodyPaths';
import { muscles, regions, type Side } from '@/data/muscleMap';
import { colors } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const MIN_HIT = 44;
const STROKE_PX = 1.2; // parça modunda kaslar arası ayırıcı çizgi kalınlığı
const FUSE_PX = 4; // bölge modunda aynı bölgenin parçaları arasındaki boşluğu kapatan, aynı tonda kontur

const muscleRegion = new Map(muscles.map((m) => [m.id, m.regionId]));

// Varsayılan tonlar: parça modunda bölge içindeki komşu parçalar farklı ton, bölge modunda bölge tek ton
const partTone = new Map<string, string>();
const regionTone = new Map<string, string>();
regions.forEach((r, ri) => {
  const tones = colors.muscleTones;
  regionTone.set(r.id, tones[(ri * 3) % tones.length]);
  muscles.filter((m) => m.regionId === r.id).forEach((m, mi) => partTone.set(m.id, tones[(ri * 3 + mi * 2 + 1) % tones.length]));
});

export type MapMode = 'region' | 'part';

/**
 * İnteraktif vücut haritası (çizimler: MuscleMap, MIT). primary/secondary her zaman kas parçası id'leridir;
 * bölge modunda bir bölgenin herhangi bir parçası vurgulanırsa bütün bölge vurgulanır.
 * onPress: bölge modunda bölge id'si, parça modunda kas id'si ile çağrılır.
 */
export function BodyMap({ side, mode, width, primary = [], secondary = [], onPress, crop }: {
  /** verilirse sadece bu bölge çizilir (odaklı mini harita) */
  crop?: Crop | null;
  side: Side;
  mode: MapMode;
  width: number;
  primary?: string[];
  secondary?: string[];
  onPress?: (id: string) => void;
}) {
  const data = body[side];
  const vb = crop ?? data.viewBox;
  const scale = width / vb.w;

  const level = useMemo(() => {
    const p = new Set(primary);
    const s = new Set(secondary);
    const regionLevel = new Map<string, number>();
    if (mode === 'region') {
      for (const id of s) regionLevel.set(muscleRegion.get(id)!, 1);
      for (const id of p) regionLevel.set(muscleRegion.get(id)!, 2);
    }
    return (id: string) => (mode === 'region' ? regionLevel.get(muscleRegion.get(id)!) ?? 0 : p.has(id) ? 2 : s.has(id) ? 1 : 0);
  }, [primary, secondary, mode]);

  const unitOf = (id: string) => (mode === 'region' ? muscleRegion.get(id)! : id);
  // memo'lu path'lere sabit callback: ekranın her render'da yeni onPress vermesi path'leri yeniden çizdirmesin
  const pressRef = useRef(onPress);
  useEffect(() => { pressRef.current = onPress; });
  const handlePress = useCallback((unit: string) => pressRef.current?.(unit), []);

  // küçük parçalar için en az 44×44 pt görünmez dokunma alanı
  const hitBoxes = useMemo(() => onPress ? Object.entries(data.boxes).flatMap(([id, bs]) => bs
    .filter((b) => b.w * scale < MIN_HIT || b.h * scale < MIN_HIT)
    .map((b, i) => ({ key: `${id}-${i}`, id, ...b, size: MIN_HIT / scale }))) : [], [data, scale, onPress]);

  return (
    <View style={{ width, height: (width * vb.h) / vb.w }}>
      <Svg width="100%" height="100%" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
        <Defs>
          {data.muscles.map((m, i) => m.clip ? (
            <ClipPath key={i} id={`${side}-clip-${i}`}>
              <Rect x={m.clip.x} y={m.clip.y} width={m.clip.w} height={m.clip.h} />
            </ClipPath>
          ) : null)}
        </Defs>
        {data.silhouette.map((d, i) => <Path key={i} d={d} fill={colors.surfaceElevated} />)}
        {/* büyütülmüş dokunma alanları kasların ALTINDA: gerçek kas her zaman önce kazanır, alan sadece yakındaki boşluğu yakalar */}
        {hitBoxes.map((b) => (
          <Rect key={b.key} x={b.cx - Math.max(b.w, b.size) / 2} y={b.cy - Math.max(b.h, b.size) / 2}
            width={Math.max(b.w, b.size)} height={Math.max(b.h, b.size)}
            fill={colors.background} fillOpacity={0} onPress={() => onPress?.(unitOf(b.id))} />
        ))}
        {data.muscles.map((m, i) => {
          const tone = mode === 'region' ? regionTone.get(muscleRegion.get(m.id)!)! : partTone.get(m.id)!;
          return (
            <MusclePath key={i} id={m.id} d={m.d} clipId={m.clip ? `${side}-clip-${i}` : undefined} tone={tone}
              level={level(m.id)} seamless={mode === 'region'} strokeWidth={(mode === 'region' ? FUSE_PX : STROKE_PX) / scale}
              unit={unitOf(m.id)} onPress={onPress ? handlePress : undefined} />
          );
        })}
      </Svg>
    </View>
  );
}

type MuscleProps = {
  id: string; unit: string; d: string; clipId?: string; tone: string; level: number; seamless: boolean; strokeWidth: number;
  onPress?: (unit: string) => void;
};

/**
 * Tek kas path'i. Vurgusuz kaslar animasyonsuz düz Path olarak çizilir (onlarca kasın her birine animasyon
 * kancası açmak Kütüphane'nin ilk açılışını yavaşlatıyordu); sadece vurgulanan kas animasyonlu bileşene geçer.
 */
const MusclePath = memo(function MusclePath(props: MuscleProps) {
  if (props.level > 0) return <ActiveMuscle {...props} />;
  const { id, unit, d, clipId, tone, seamless, strokeWidth, onPress } = props;
  return (
    <Path d={d} clipPath={clipId ? `url(#${clipId})` : undefined} fill={tone}
      stroke={seamless ? tone : colors.background} strokeWidth={strokeWidth} strokeLinejoin="round"
      onPress={onPress ? () => onPress(unit) : undefined} accessibilityLabel={id} />
  );
});

function ActiveMuscle({ id, unit, d, clipId, tone, level, seamless, strokeWidth, onPress }: MuscleProps) {
  const flash = useSharedValue(1);
  useEffect(() => {
    if (level > 0) flash.value = withSequence(withTiming(0.35, { duration: 90 }), withTiming(1, { duration: 260 }));
  }, [level, flash]);
  const animatedProps = useAnimatedProps(() => ({ fillOpacity: (level === 1 ? 0.45 : 1) * flash.value }));
  const fill = level > 0 ? colors.primaryLight : tone;
  const clipPath = clipId ? `url(#${clipId})` : undefined;
  // soluk (ikincil) vurguda altta ton görünsün diye önce ton çizilir
  return (
    <>
      {level === 1 ? <Path d={d} fill={tone} clipPath={clipPath} /> : null}
      <AnimatedPath
        d={d}
        clipPath={clipPath}
        fill={fill}
        stroke={seamless ? (level > 0 ? colors.primaryLight : tone) : colors.background}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        animatedProps={animatedProps}
        onPress={onPress ? () => onPress(unit) : undefined}
        accessibilityLabel={id}
      />
    </>
  );
}

/** Ön ↔ arka çevirme (rotateY) animasyonlu sarmalayıcı. */
export function useFlip(initial: Side = 'front') {
  const [side, setSide] = useState<Side>(initial);
  const rot = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateY: `${rot.value}deg` }] }));
  const flip = () => {
    rot.value = withTiming(90, { duration: 160 });
    setTimeout(() => {
      setSide((s) => (s === 'front' ? 'back' : 'front'));
      rot.value = -90;
      rot.value = withTiming(0, { duration: 160 });
    }, 160);
  };
  return { side, flip, style };
}

export function FlipView({ style, children }: { style: ReturnType<typeof useAnimatedStyle>; children: React.ReactNode }) {
  return <Animated.View style={[styles.center, style]}>{children}</Animated.View>;
}

/** Haritayı dokunulabilir yapmadan göstermek için (ör. küçük önizleme) */
export function BodyMapPair({ width, primary, secondary, onPress }: {
  width: number; primary: string[]; secondary: string[]; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.pair}>
      <BodyMap side="front" mode="part" width={width} primary={primary} secondary={secondary} />
      <BodyMap side="back" mode="part" width={width} primary={primary} secondary={secondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  pair: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
