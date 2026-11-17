import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { LevelBar } from '@/components/LevelCard';
import { MiniCalendar } from '@/components/MiniCalendar';
import { Screen } from '@/components/Screen';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { confirm, toast } from '@/components/ui/overlays';
import { SegmentedControl } from '@/components/ui/PillButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { LoadingScreen } from '@/components/ui/Skeleton';
import { pickAndUploadAvatar, removeAvatar } from '@/db/repos/avatar';
import { deleteMeasurement, getMeasurements, saveMeasurement } from '@/db/repos/measurements';
import { getSetting, setSetting, type Settings } from '@/db/repos/settings';
import { getStreakState } from '@/db/repos/streak';
import { useDb } from '@/db/useDb';
import { today } from '@/services/dates';
import { MAX_FREEZES } from '@/services/streakService';
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
  }), [], ['settings', 'body_measurements', 'streak_state']);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [info, setInfo] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [name, setName] = useState<string | null>(null); // null = düzenlenmiyor, kayıtlı adı göster

  if (!data) return <LoadingScreen blocks={[160, 90, 320, 120]} />;
  const p = data.profile;
  const weight = data.weights.at(-1)?.value ?? null;
  const height = data.heights.at(-1)?.value ?? null;
  const firstWeight = data.weights[0]?.value ?? null;
  const index = weight && height ? bmi(weight, height) : null;
  const recent = data.weights.slice(-30);
  // grafik alt sınırı: son kayıtlar ve hedefin biraz altı, böylece çizgi ekrana yayılır
  const offset = recent.length ? Math.floor(Math.min(...recent.map((w) => w.value), p.targetWeightKg ?? Infinity) - 2) : 0;
  const summary = [p.age ? `${p.age} yaş` : null, p.sex === 'male' ? 'Erkek' : p.sex === 'female' ? 'Kadın' : null,
    height ? `${Math.round(height)} cm` : null].filter(Boolean).join(' · ');
  const close = () => setPrompt(null);
  const ask = (k: Prompt) => { setInfo(false); setPrompt(k); };
  const saveProfile = (patch: Partial<Settings['profile']>) => setSetting('profile', { ...p, ...patch });
  const saveName = () => {
    if (name != null && name.trim()) saveProfile({ name: name.trim() });
    setName(null);
  };
  const removeWeight = async (id: number, label: string) => {
    if (await confirm({ title: 'Kayıt silinsin mi?', message: label, confirmLabel: 'Sil', destructive: true })) await deleteMeasurement(id);
  };
  const choosePhoto = async () => {
    setPhoto(false);
    try { await pickAndUploadAvatar(); } catch { toast('Fotoğraf yüklenemedi'); }
  };
  const dropPhoto = async () => {
    setPhoto(false);
    if (await confirm({ title: 'Fotoğraf kaldırılsın mı?', confirmLabel: 'Kaldır', destructive: true })) {
      try { await removeAvatar(); } catch { toast('Fotoğraf kaldırılamadı'); }
    }
  };

  return (
    <Screen>
      <Text style={type.hero}>Profil</Text>

      <View style={styles.card}>
        <View style={styles.nameRow}>
          <PressableScale onPress={() => setPhoto(true)} accessibilityRole="button" accessibilityLabel="Profil fotoğrafı">
            <Avatar size={72} />
          </PressableScale>
          <View style={styles.flex}>
            <TextInput value={name ?? p.name} onChangeText={setName} onEndEditing={saveName} onSubmitEditing={saveName}
              placeholder="Adın" placeholderTextColor={colors.textSecondary} style={styles.nameInput} maxLength={24} accessibilityLabel="Adın" />
            {summary ? <Text style={type.caption} numberOfLines={1}>{summary}</Text> : null}
          </View>
          <Pressable onPress={() => setInfo(true)} hitSlop={12} style={styles.edit} accessibilityRole="button" accessibilityLabel="Bilgileri düzenle">
            <Icon name="edit" color={colors.textSecondary} size={22} />
          </Pressable>
        </View>
        <LevelBar />
      </View>

      <PressableScale style={[styles.card, styles.streakRow]} onPress={() => router.push('/streak')} accessibilityRole="button" accessibilityLabel="Seri ayrıntıları">
        <StreakStat icon="local_fire_department" color={colors.primaryLight} value={data.streak?.current ?? 0} label="Seri" />
        <StreakStat icon="emoji_events" color={colors.warning} value={data.streak?.longest ?? 0} label="En uzun" />
        <StreakStat icon="ac_unit" color={colors.ice} value={`${data.streak?.freezes_available ?? 0}/${MAX_FREEZES}`} label="Dondurma" />
        <Icon name="chevron_right" color={colors.textSecondary} />
      </PressableScale>

      <MiniCalendar />

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

      <View style={styles.card}>
        <LinkRow icon="dashboard_customize" label="Ana ekran düzeni" onPress={() => router.push('/home-layout')} />
        <LinkRow icon="settings" label="Ayarlar" onPress={() => router.push('/settings')} />
      </View>

      <Sheet visible={info} onClose={() => setInfo(false)} title="Bilgiler">
        <SheetRow label="Yaş" value={p.age ? String(p.age) : 'Ekle'} onPress={() => ask('age')} />
        <SegmentedControl<'male' | 'female' | 'none'>
          options={[{ value: 'male', label: 'Erkek' }, { value: 'female', label: 'Kadın' }, { value: 'none', label: 'Belirtme' }]}
          value={p.sex ?? 'none'}
          onChange={(v) => saveProfile({ sex: v === 'none' ? null : v })}
        />
        <SheetRow label="Boy" value={height ? `${Math.round(height)} cm` : 'Ekle'} onPress={() => ask('height')} />
        <SheetRow label="Hedef kilo" value={p.targetWeightKg ? `${fmtDec(p.targetWeightKg)} kg` : 'Belirle'} onPress={() => ask('target')} />
      </Sheet>

      <Sheet visible={photo} onClose={() => setPhoto(false)} title="Profil fotoğrafı">
        <SheetRow label="Fotoğraf seç" onPress={choosePhoto} />
        {p.avatarPath ? <SheetRow label="Fotoğrafı kaldır" onPress={dropPhoto} /> : null}
      </Sheet>

      <NumberPrompt visible={prompt === 'weight'} onClose={close} title="Bugünkü kilo" suffix="kg" initial={weight ?? undefined} min={20}
        onSubmit={(v) => saveMeasurement('weight', Math.round(v * 10) / 10, today())} />
      <NumberPrompt visible={prompt === 'height'} onClose={close} title="Boy" suffix="cm" initial={height ?? undefined} min={80}
        onSubmit={(v) => saveMeasurement('height', Math.round(v), today())} />
      <NumberPrompt visible={prompt === 'age'} onClose={close} title="Yaş" initial={p.age ?? undefined} min={5}
        onSubmit={(v) => saveProfile({ age: Math.round(v) })} />
      <NumberPrompt visible={prompt === 'target'} onClose={close} title="Hedef kilo" suffix="kg" initial={p.targetWeightKg ?? undefined} min={20}
        onSubmit={(v) => saveProfile({ targetWeightKg: Math.round(v * 10) / 10 })} />
    </Screen>
  );
}

function StreakStat({ icon, color, value, label }: { icon: 'local_fire_department' | 'emoji_events' | 'ac_unit'; color: string; value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statTop}>
        <Icon name={icon} color={color} size={20} />
        <Text style={type.title}>{value}</Text>
      </View>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: 'dashboard_customize' | 'settings'; label: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.link} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} color={colors.accent} size={22} />
      <Text style={[type.body, styles.flex]}>{label}</Text>
      <Icon name="chevron_right" color={colors.textSecondary} />
    </PressableScale>
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
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  nameInput: { minHeight: 40, color: colors.textPrimary, fontSize: 22, fontWeight: '700', padding: 0 },
  edit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, gap: 2 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  axis: { color: colors.textSecondary, fontSize: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
});
