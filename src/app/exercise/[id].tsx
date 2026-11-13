import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { BodyMapPair } from '@/components/BodyMap';
import { AddToProgramSheet, BackHeader, EQUIPMENT_TR, exerciseImageSource, FavoriteButton } from '@/components/exercise';
import { PillButton } from '@/components/ui/PillButton';
import { getExercise, getExerciseHistory } from '@/db/repos/exercises';
import { useDb } from '@/db/useDb';
import { fmtDec } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';

export default function ExerciseDetailScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(raw);
  const { width } = useWindowDimensions();
  const data = useDb(async (db) => ({ e: await getExercise(db, id), history: await getExerciseHistory(db, id) }), [id]);
  const [frame, setFrame] = useState(0);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');

  // başlangıç ↔ bitiş pozisyonu otomatik geçiş
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => 1 - f), 1400);
    return () => clearInterval(t);
  }, []);

  if (!data) return <BackHeader title="" />;
  const e = data.e;
  if (!e) return <BackHeader title="Hareket bulunamadı" />;
  const src = exerciseImageSource(e.image_key, e.photo_uri, frame);
  const history = data.history.filter((h) => h.maxKg != null);
  const youtube = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${e.name_en ?? e.name_tr} egzersiz nasıl yapılır`)}`;

  return (
    <View style={styles.flex}>
      <BackHeader title={e.name_tr} right={<FavoriteButton id={e.id} name={e.name_tr} favorite={e.is_favorite} />} />
      <ScrollView contentContainerStyle={styles.content}>
        {src ? (
          <View>
            <Image source={src} style={styles.image} contentFit="cover" transition={300} accessibilityLabel={`${e.name_tr} ${frame ? 'bitiş' : 'başlangıç'} pozisyonu`} />
            <Text style={styles.frameLabel}>{frame ? 'Bitiş' : 'Başlangıç'}</Text>
          </View>
        ) : null}
        <View>
          <Text style={type.hero}>{e.name_tr}</Text>
          <Text style={type.caption}>{[e.name_en !== e.name_tr ? e.name_en : null, EQUIPMENT_TR[e.equipment]].filter(Boolean).join(' · ')}</Text>
        </View>

        <View style={styles.card}>
          <BodyMapPair width={Math.min((width - spacing.lg * 4) / 2, 150)} primary={e.primary} secondary={e.secondary} />
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: colors.primaryLight }]} /><Text style={type.caption}>Birincil</Text>
            <View style={[styles.dot, { backgroundColor: colors.primaryLight, opacity: 0.45 }]} /><Text style={type.caption}>İkincil</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PillButton label="▶ Videoda izle" onPress={() => Linking.openURL(youtube)} style={styles.flex1} />
          <PillButton label="Programıma ekle" variant="primary" onPress={() => setAdding(true)} style={styles.flex1} />
        </View>
        {toast ? <Text style={[type.caption, { color: colors.success }]}>{toast}</Text> : null}

        {e.description ? <Text style={type.body}>{e.description}</Text> : null}
        <Section title={e.instructionsAreEnglish ? 'Uygulama (İngilizce)' : 'Uygulama'} items={e.instructions} numbered />
        <Section title="Sık yapılan hatalar" items={e.mistakes} />
        <Section title="İpuçları" items={e.tips} />

        <Text style={type.title}>Geçmiş</Text>
        <View style={styles.card}>
          {history.length >= 2 ? (
            <LineChart
              data={history.map((h) => ({ value: h.maxKg, label: h.date.slice(5).replace('-', '.') }))}
              width={width - spacing.lg * 4 - 40}
              height={160}
              color={colors.primaryLight}
              dataPointsColor={colors.accent}
              thickness={2}
              yAxisThickness={0}
              xAxisColor={colors.divider}
              rulesColor={colors.divider}
              yAxisTextStyle={styles.axis}
              xAxisLabelTextStyle={styles.axis}
              noOfSections={4}
              curved
            />
          ) : null}
          {history.length ? history.slice(-5).reverse().map((h) => (
            <Text key={h.date} style={type.body}>{h.date} · en ağır {fmtDec(h.maxKg)} kg · {h.sets} set</Text>
          )) : <Text style={type.caption}>Henüz kayıt yok. Antrenmanda bu hareketi yaptığında burada görünecek.</Text>}
        </View>
      </ScrollView>
      <AddToProgramSheet exerciseId={adding ? e.id : null} onClose={(msg) => { setAdding(false); if (msg) setToast(msg); }} />
    </View>
  );
}

function Section({ title, items, numbered }: { title: string; items: string[]; numbered?: boolean }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <Text style={type.title}>{title}</Text>
      {items.map((t, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.bullet}>{numbered ? `${i + 1}.` : '•'}</Text>
          <Text style={[type.body, styles.flex1]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  image: { width: '100%', aspectRatio: 1.4, borderRadius: radius.lg, backgroundColor: colors.surface },
  frameLabel: {
    position: 'absolute', left: spacing.md, bottom: spacing.md, color: colors.accent, fontWeight: '700', fontSize: 12,
    backgroundColor: colors.overlay, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden',
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  item: { flexDirection: 'row', gap: spacing.sm },
  bullet: { ...type.body, color: colors.accentMuted, width: 20 },
  axis: { color: colors.textSecondary, fontSize: 10 },
});
