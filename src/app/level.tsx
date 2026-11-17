import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { BackHeader } from '@/components/exercise';
import { Icon } from '@/components/Icon';
import { LoadingScreen } from '@/components/ui/Skeleton';
import { getLevel, XP_TABLES } from '@/db/repos/xp';
import { useDb } from '@/db/useDb';
import { fmtInt } from '@/services/units';
import { levelReward, RANKS, rankInfo, XP_RULES } from '@/services/xp';
import { colors, radius, spacing, type } from '@/theme';

const NODE = 64;
const CURRENT = 84;
const STEP = 104; // duraklar arası dikey mesafe
const MAX_PATH_LEVEL = 100;
const BANNER = 64; // rank bandının kapladığı yükseklik

const XP_SOURCES: [string, number][] = [
  ['Antrenman', XP_RULES.workout], ['Set', XP_RULES.set], ['Su hedefi', XP_RULES.waterDay],
  ['Adım hedefi', XP_RULES.stepDay], ['Görev', XP_RULES.habit], ['Seri günü', XP_RULES.streakDay],
];

/** Seviye yolu: aşağıdan yukarı dik uzanan yol; her seviye bir durak, rank başlarında bant, ödüller durakta. */
export default function LevelPath() {
  const lv = useDb(getLevel, [], XP_TABLES);
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);
  const scrolled = useRef(false);
  if (!lv) return <LoadingScreen blocks={[140, 400]} />;

  const rank = rankInfo(lv.level);
  // yol 100. seviyeye kadar; 100'ü geçenlerde 10 seviye ilerisine kadar uzar
  const last = Math.max(MAX_PATH_LEVEL, lv.level + 10);
  const cx = (width - spacing.lg * 2) / 2; // yol dikey: tüm duraklar ortada
  const ratio = lv.needed ? lv.intoLevel / lv.needed : 0;

  // Yol aşağıdan yukarı: önce alttan ölçülür (yb), sonra üstten koordinata çevrilir. Her rank başlangıcının altında bir bant.
  let yb = 24;
  const nodes: { l: number; x: number; yb: number }[] = [];
  const banners: { r: (typeof RANKS)[number]; to: number; yb: number }[] = [];
  for (let l = 1; l <= last; l++) {
    const r = RANKS.find((x) => x.from === l);
    if (r) {
      const next = RANKS.find((x) => x.from > l)?.from;
      banners.push({ r, to: Math.min(last, (next ?? Infinity) - 1), yb });
      yb += BANNER;
    }
    nodes.push({ l, x: cx, yb: yb + CURRENT / 2 });
    yb += STEP;
  }
  const H = yb - STEP + CURRENT + 24;
  const pos = nodes.map((n) => ({ ...n, y: H - n.yb }));

  return (
    <View style={styles.safe}>
      <BackHeader title="Seviye yolu" />
      <View style={[styles.hero, { borderColor: rank.color }]}>
        <View style={[styles.badge, { backgroundColor: rank.color }]}>
          <Icon name="military_tech" size={34} color="#1A1A1A" />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.rankName, { color: rank.color }]}>{rank.name}</Text>
          <Text style={type.title}>Seviye {lv.level}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(2, ratio * 100)}%`, backgroundColor: rank.color }]} /></View>
          <Text style={type.caption}>{fmtInt(lv.intoLevel)} / {fmtInt(lv.needed)} XP · toplam {fmtInt(lv.total)}</Text>
        </View>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.body} onContentSizeChange={() => {
        // açılışta mevcut seviyeyi ekranın ortasına getir
        if (scrolled.current) return;
        scrolled.current = true;
        const cur = pos.find((p) => p.l === lv.level);
        if (cur) scroll.current?.scrollTo({ y: Math.max(0, cur.y - height * 0.3), animated: false });
      }}>
        <View style={{ height: H }}>
          <Svg style={StyleSheet.absoluteFill}>
            {pos.slice(1).map((p, i) => {
              const a = pos[i];
              const done = p.l <= lv.level;
              return (
                <Line key={p.l} x1={a.x} y1={a.y} x2={p.x} y2={p.y} stroke={done ? rankInfo(p.l).color : colors.divider}
                  strokeWidth={10} strokeLinecap="round" strokeDasharray={done ? undefined : '2 16'} />
              );
            })}
          </Svg>
          {banners.map(({ r, to, yb: b }) => {
            const reached = lv.level >= r.from;
            return (
              <View key={r.name} style={[styles.banner, { top: H - b - BANNER + 8, borderColor: reached ? r.color : colors.divider }]}>
                <View style={[styles.dot, { backgroundColor: reached ? r.color : colors.divider }]} />
                <Text style={[type.subtitle, !reached && styles.muted]}>{r.name}</Text>
                <Text style={[type.caption, styles.end]}>Sv {r.from}{to > r.from ? `–${to}` : ''}</Text>
              </View>
            );
          })}
          {pos.map((p) => <Stop key={p.l} level={p.l} x={p.x} y={p.y} current={lv.level} ratio={ratio} color={rankInfo(p.l).color} />)}
        </View>

        <View style={styles.sources}>
          {XP_SOURCES.map(([label, xp]) => (
            <View key={label} style={styles.source}>
              <Text style={styles.sourceXp}>+{xp}</Text>
              <Text style={type.caption} numberOfLines={1}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Stop({ level, x, y, current, ratio, color }: { level: number; x: number; y: number; current: number; ratio: number; color: string }) {
  const done = level < current;
  const isCurrent = level === current;
  const size = isCurrent ? CURRENT : NODE;
  const reward = levelReward(level);
  const icon = reward?.kind === 'rank' ? 'military_tech' : reward?.kind === 'freeze' ? 'ac_unit' : 'flag';
  const ring = CURRENT / 2 - 4;
  const circ = 2 * Math.PI * ring;
  return (
    <View style={[styles.stop, { left: x - size / 2, top: y - size / 2, width: size, height: size }]}
      accessibilityLabel={`Seviye ${level}${reward?.kind === 'rank' ? `, ${reward.name} rank` : reward?.kind === 'freeze' ? ', seri dondurma' : ''}${done ? ', geçildi' : isCurrent ? ', şu an' : ''}`}>
      {isCurrent ? (
        <Svg width={CURRENT} height={CURRENT} style={StyleSheet.absoluteFill}>
          <Circle cx={CURRENT / 2} cy={CURRENT / 2} r={ring} stroke={colors.divider} strokeWidth={6} fill="none" />
          <Circle cx={CURRENT / 2} cy={CURRENT / 2} r={ring} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round"
            strokeDasharray={`${circ * Math.max(0.02, ratio)} ${circ}`} transform={`rotate(-90 ${CURRENT / 2} ${CURRENT / 2})`} />
        </Svg>
      ) : null}
      <View style={[styles.node, { backgroundColor: done || isCurrent ? color : colors.surfaceElevated },
        isCurrent && styles.nodeCurrent, reward?.kind === 'rank' && styles.nodeRank]}>
        {done ? <Icon name="check" size={28} color="#1A1A1A" />
          : <Icon name={icon} size={isCurrent ? 30 : 24} color={isCurrent ? '#1A1A1A' : colors.textSecondary} />}
      </View>
      <Text style={[styles.levelNum, isCurrent && styles.levelNumOn]}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, paddingTop: 0, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  banner: {
    position: 'absolute', left: 0, right: 0, height: BANNER - 16, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 2, backgroundColor: colors.surface,
  },
  flex: { flex: 1, gap: 4 },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.lg, borderWidth: 2, marginHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  rankName: { fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceElevated, overflow: 'hidden', marginTop: 4 },
  fill: { height: 10, borderRadius: 5 },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  source: { flexBasis: '30%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  sourceXp: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  dot: { width: 12, height: 12, borderRadius: 6 },
  muted: { color: colors.textSecondary },
  end: { marginLeft: 'auto' },
  stop: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  node: {
    width: NODE - 8, height: NODE - 8, borderRadius: (NODE - 8) / 2, alignItems: 'center', justifyContent: 'center',
  },
  nodeCurrent: { width: CURRENT - 22, height: CURRENT - 22, borderRadius: (CURRENT - 22) / 2 },
  nodeRank: { borderRadius: radius.md },
  levelNum: {
    position: 'absolute', left: '100%', marginLeft: 12, fontSize: 15, fontWeight: '800', color: colors.textSecondary,
  },
  levelNumOn: { color: colors.textPrimary },
});
