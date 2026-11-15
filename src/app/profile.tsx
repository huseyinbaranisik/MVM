import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { confirm } from '@/components/ui/overlays';
import { SegmentedControl } from '@/components/ui/PillButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { SheetRow } from '@/components/ui/Sheet';
import { LoadingScreen } from '@/components/ui/Skeleton';
import { deleteMeasurement, getMeasurements, saveMeasurement } from '@/db/repos/measurements';
import { getSetting, setSetting, type Settings } from '@/db/repos/settings';
import { getBadges, getStreakState } from '@/db/repos/streak';
import { supabase } from '@/db/supabase';
import { useDb } from '@/db/useDb';
import { today } from '@/services/dates';
import { MILESTONES } from '@/services/streakService';
import { bmi, bmiLabel, fmtDec } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';

type Prompt = 'weight' | 'height' | 'age' | 'target' | null;

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const data = useDb(async () => ({
    profile: await getSetting('profile'),
    weights: await getMeasurements('weight'),
    heights: await getMeasurements('height'),
    streak: await getStreakState(),
    badges: await getBadges(),
    email: (await supabase.auth.getSession()).data.session?.user.email ?? '',
  }), [], ['settings', 'body_measurements', 'streak_state', 'badges']);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [name, setName] = useState<string | null>(null); // null = düzenlenmiyor, kayıtlı adı göster

  if (!data) return <LoadingScreen blocks={[80, 120, 220, 120]} />;
  const p = data.profile;
  const email = data.email;
  const weight = data.weights.at(-1)?.value ?? null;
  const height = data.heights.at(-1)?.value ?? null;
  const firstWeight = data.weights[0]?.value ?? null;
  const index = weight && height ? bmi(weight, height) : null;
  const recent = data.weights.slice(-30);
  // grafik alt sınırı: son kayıtlar ve hedefin biraz altı, böylece çizgi ekrana yayılır
  const offset = recent.length ? Math.floor(Math.min(...recent.map((w) => w.value), p.targetWeightKg ?? Infinity) - 2) : 0;
  const earned = new Set(data.badges.map((b) => b.milestone));
  const close = () => setPrompt(null);
  const signOut = async () => {
    if (await confirm({ title: 'Çıkış yapılsın mı?', message: 'Verilerin hesabında kalır; tekrar giriş yapınca geri gelir.', confirmLabel: 'Çıkış yap' })) {
      await supabase.auth.signOut();
    }
  };
  const saveProfile = (patch: Partial<Settings['profile']>) => setSetting('profile', { ...p, ...patch });
  const saveName = () => {
    if (name != null && name.trim()) saveProfile({ name: name.trim() });
    setName(null);
  };
  const removeWeight = async (id: number, label: string) => {
    if (await confirm({ title: 'Kayıt silinsin mi?', message: label, confirmLabel: 'Sil', destructive: true })) await deleteMeasurement(id);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Geri">
          <Icon name="arrow_back" color={colors.textPrimary} />
        </Pressable>
        <Text style={type.title}>Profil</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.nameRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{p.name.charAt(0).toLocaleUpperCase('tr-TR') || '?'}</Text></View>
            <TextInput value={name ?? p.name} onChangeText={setName} onEndEditing={saveName} onSubmitEditing={saveName}
              placeholder="Adın" placeholderTextColor={colors.textSecondary} style={styles.nameInput} maxLength={24} accessibilityLabel="Adın" />
          </View>
          <SheetRow label="Yaş" value={p.age ? String(p.age) : 'Ekle'} onPress={() => setPrompt('age')} />
          <View style={styles.segment}>
            <SegmentedControl<'male' | 'female' | 'none'>
              options={[{ value: 'male', label: 'Erkek' }, { value: 'female', label: 'Kadın' }, { value: 'none', label: 'Belirtme' }]}
              value={p.sex ?? 'none'}
              onChange={(v) => saveProfile({ sex: v === 'none' ? null : v })}
            />
          </View>
        </View>

        <View style={styles.tiles}>
          <Tile label="Kilo" value={weight ? `${fmtDec(weight)} kg` : 'Ekle'} onPress={() => setPrompt('weight')} />
          <Tile label="Boy" value={height ? `${Math.round(height)} cm` : 'Ekle'} onPress={() => setPrompt('height')} />
          <Tile label="BMI" value={index ? fmtDec(index) : '—'} hint={index ? bmiLabel(index) : undefined} />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={type.subtitle}>Kilo</Text>
            <Text style={type.caption}>
              {weight != null && firstWeight != null && data.weights.length > 1
                ? `Başlangıçtan ${weight - firstWeight > 0 ? '+' : ''}${fmtDec(weight - firstWeight)} kg` : ''}
            </Text>
          </View>
          {data.weights.length >= 2 ? (
            <LineChart
              data={recent.map((w) => ({ value: w.value, label: w.date.slice(5).replace('-', '.') }))}
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
              yAxisOffset={offset}
              showReferenceLine1={p.targetWeightKg != null}
              referenceLine1Position={(p.targetWeightKg ?? 0) - offset}
              referenceLine1Config={{ color: colors.accent, dashWidth: 6, dashGap: 4, thickness: 1 }}
              curved
            />
          ) : null}
          <SheetRow label="Hedef kilo" value={p.targetWeightKg ? `${fmtDec(p.targetWeightKg)} kg` : 'Belirle'} onPress={() => setPrompt('target')} />
          {data.weights.slice(-5).reverse().map((w) => {
            const label = `${w.date} · ${fmtDec(w.value)} kg`;
            return <SheetRow key={w.id} label={label} onPress={() => removeWeight(w.id, label)} />;
          })}
        </View>

        <PressableScale style={styles.card} onPress={() => router.push('/streak')} accessibilityRole="button">
          <View style={styles.rowBetween}>
            <Text style={type.subtitle}>🔥 Seri</Text>
            <Icon name="chevron_right" color={colors.textSecondary} />
          </View>
          <Text style={type.body}>Güncel {data.streak?.current ?? 0} gün · En uzun {data.streak?.longest ?? 0} gün</Text>
        </PressableScale>

        <View style={styles.card}>
          <Text style={type.subtitle}>Rozetler</Text>
          <View style={styles.badges}>
            {MILESTONES.map((m) => (
              <View key={m} style={[styles.badge, earned.has(m) && styles.badgeOn]} accessibilityLabel={`${m} gün rozeti ${earned.has(m) ? 'kazanıldı' : 'kilitli'}`}>
                <Text style={styles.badgeIcon}>{earned.has(m) ? '🔥' : '🔒'}</Text>
                <Text style={[type.caption, earned.has(m) && styles.badgeTextOn]}>{m} gün</Text>
              </View>
            ))}
          </View>
        </View>

        <SheetRow label="Çıkış yap" value={email} onPress={signOut} />
      </ScrollView>

      <NumberPrompt visible={prompt === 'weight'} onClose={close} title="Bugünkü kilo" suffix="kg" initial={weight ?? undefined} min={20}
        onSubmit={(v) => saveMeasurement('weight', Math.round(v * 10) / 10, today())} />
      <NumberPrompt visible={prompt === 'height'} onClose={close} title="Boy" suffix="cm" initial={height ?? undefined} min={80}
        onSubmit={(v) => saveMeasurement('height', Math.round(v), today())} />
      <NumberPrompt visible={prompt === 'age'} onClose={close} title="Yaş" initial={p.age ?? undefined} min={5}
        onSubmit={(v) => saveProfile({ age: Math.round(v) })} />
      <NumberPrompt visible={prompt === 'target'} onClose={close} title="Hedef kilo" suffix="kg" initial={p.targetWeightKg ?? undefined} min={20}
        onSubmit={(v) => saveProfile({ targetWeightKg: Math.round(v * 10) / 10 })} />
    </SafeAreaView>
  );
}

function Tile({ label, value, hint, onPress }: { label: string; value: string; hint?: string; onPress?: () => void }) {
  return (
    <PressableScale style={styles.tile} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.title} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text style={type.caption} numberOfLines={1}>{hint}</Text> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.accent },
  nameInput: { flex: 1, minHeight: 48, color: colors.textPrimary, fontSize: 22, fontWeight: '700', borderBottomWidth: 1, borderColor: colors.divider },
  segment: { flexDirection: 'row', gap: spacing.sm },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  axis: { color: colors.textSecondary, fontSize: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    width: 72, paddingVertical: spacing.sm, alignItems: 'center', gap: 2, borderRadius: radius.md,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.divider, opacity: 0.6,
  },
  badgeOn: { borderColor: colors.primaryLight, opacity: 1 },
  badgeIcon: { fontSize: 22 },
  badgeTextOn: { color: colors.textPrimary },
});
