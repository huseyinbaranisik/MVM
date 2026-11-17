import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

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
const SWING = [0, 0.55, 0.85, 0.55, 0, -0.55, -0.85, -0.55]; // zikzak: genişliğin yarısına oranla yatay kayma

const XP_SOURCES: [string, number][] = [
  ['Antrenman', XP_RULES.workout], ['Set', XP_RULES.set], ['Su hedefi', XP_RULES.waterDay],
  ['Adım hedefi', XP_RULES.stepDay], ['Görev', XP_RULES.habit], ['Seri günü', XP_RULES.streakDay],
];

/** Seviye yolu: rank bölümleri, her seviye bir durak; geçilenler dolu, mevcut olan ilerleme halkalı, ödüller durakta. */
export default function LevelPath() {
  const lv = useDb(getLevel, [], XP_TABLES);
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);
  const scrolled = useRef(false);
  if (!lv) return <LoadingScreen blocks={[140, 400]} />;

  const rank = rankInfo(lv.level);
  // mevcut rank'tan sonraki rank'ın sonuna kadar göster (en az 10 seviye ilerisi)
  const lastShown = Math.max(lv.level + 10, (RANKS.find((r) => r.from > lv.level + 5)?.from ?? lv.level + 15) - 1);
  const sections = RANKS.map((r, i) => ({ ...r, to: Math.min((RANKS[i + 1]?.from ?? Infinity) - 1, lastShown) }))
    .filter((r) => r.from <= lastShown);
  const half = (width - spacing.lg * 2) / 2 - NODE / 2 - 8;
  const ratio = lv.needed ? lv.intoLevel / lv.needed : 0;

  return (
    <View style={styles.safe}>
      <BackHeader title="Seviye yolu" />
      <ScrollView ref={scroll} contentContainerStyle={styles.body}>
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

        <View style={styles.sources}>
          {XP_SOURCES.map(([label, xp]) => (
            <View key={label} style={styles.source}>
              <Text style={styles.sourceXp}>+{xp}</Text>
              <Text style={type.caption} numberOfLines={1}>{label}</Text>
            </View>
          ))}
        </View>

        {sections.map((s) => {
          const levels = Array.from({ length: s.to - s.from + 1 }, (_, i) => s.from + i);
          const pos = levels.map((l, i) => ({ l, x: half + SWING[(l - 1) % SWING.length] * half + NODE / 2 + 8, y: i * STEP + CURRENT / 2 }));
          const h = (levels.length - 1) * STEP + CURRENT;
          const reached = lv.level >= s.from;
          return (
            <View key={s.name} onLayout={(e) => {
              if (!scrolled.current && lv.level >= s.from && lv.level <= s.to) {
                scrolled.current = true;
                const idx = lv.level - s.from;
                scroll.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y + idx * STEP - 160), animated: true });
              }
            }}>
              <View style={styles.sectionHead}>
                <View style={[styles.dot, { backgroundColor: reached ? s.color : colors.divider }]} />
                <Text style={[type.subtitle, !reached && styles.muted]}>{s.name}</Text>
                <Text style={[type.caption, styles.end]}>Sv {s.from}{s.to > s.from ? `–${s.to}` : ''}</Text>
              </View>
              <View style={{ height: h }}>
                <Svg style={StyleSheet.absoluteFill}>
                  {pos.slice(1).map((p, i) => {
                    const a = pos[i];
                    const my = (a.y + p.y) / 2;
                    return (
                      <Path key={p.l} d={`M${a.x} ${a.y} C${a.x} ${my} ${p.x} ${my} ${p.x} ${p.y}`}
                        stroke={p.l <= lv.level ? s.color : colors.divider} strokeWidth={8} strokeLinecap="round" fill="none"
                        strokeDasharray={p.l <= lv.level ? undefined : '2 14'} />
                    );
                  })}
                </Svg>
                {pos.map((p) => <Stop key={p.l} level={p.l} x={p.x} y={p.y} current={lv.level} ratio={ratio} color={s.color} />)}
              </View>
            </View>
          );
        })}
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
  flex: { flex: 1, gap: 4 },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.lg, borderWidth: 2,
  },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  rankName: { fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceElevated, overflow: 'hidden', marginTop: 4 },
  fill: { height: 10, borderRadius: 5 },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  source: { flexBasis: '30%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  sourceXp: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  dot: { width: 12, height: 12, borderRadius: 6 },
  muted: { color: colors.textSecondary },
  end: { marginLeft: 'auto' },
  stop: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  node: {
    width: NODE - 8, height: NODE - 8, borderRadius: (NODE - 8) / 2, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  nodeCurrent: { width: CURRENT - 22, height: CURRENT - 22, borderRadius: (CURRENT - 22) / 2 },
  nodeRank: { borderRadius: radius.md },
  levelNum: {
    position: 'absolute', bottom: -18, fontSize: 12, fontWeight: '800', color: colors.textSecondary,
  },
  levelNumOn: { color: colors.textPrimary },
});
