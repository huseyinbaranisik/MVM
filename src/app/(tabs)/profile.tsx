import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
import { getMeasurements, saveMeasurement } from '@/db/repos/measurements';
import { getSetting, setSetting, type Settings } from '@/db/repos/settings';
import { getStreakState } from '@/db/repos/streak';
import { useDb } from '@/db/useDb';
import { today } from '@/services/dates';
import { MAX_FREEZES } from '@/services/streakService';
import { bmi, bmiLabel, fmtDec } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

type Prompt = 'weight' | 'height' | 'age' | 'target' | null;

export default function ProfileScreen() {
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
  const index = weight && height ? bmi(weight, height) : null;
  const summary = [p.age ? t('{n} yaşında', { n: p.age }) : null, p.sex === 'male' ? t('Erkek') : p.sex === 'female' ? t('Kadın') : null,
    height ? `${Math.round(height)} cm` : null].filter(Boolean).join(' · ');
  const close = () => setPrompt(null);
  const ask = (k: Prompt) => { setInfo(false); setPrompt(k); };
  const saveProfile = (patch: Partial<Settings['profile']>) => setSetting('profile', { ...p, ...patch });
  const saveName = () => {
    if (name != null && name.trim()) saveProfile({ name: name.trim() });
    setName(null);
  };
  const choosePhoto = async () => {
    setPhoto(false);
    try { await pickAndUploadAvatar(); } catch { toast(t('Fotoğraf yüklenemedi')); }
  };
  const dropPhoto = async () => {
    setPhoto(false);
    if (await confirm({ title: t('Fotoğraf kaldırılsın mı?'), confirmLabel: t('Kaldır'), destructive: true })) {
      try { await removeAvatar(); } catch { toast(t('Fotoğraf kaldırılamadı')); }
    }
  };

  return (
    <Screen>
      <Text style={type.hero}>{t('Profil')}</Text>

      <View style={styles.card}>
        <View style={styles.nameRow}>
          <PressableScale onPress={() => setPhoto(true)} accessibilityRole="button" accessibilityLabel={t('Profil fotoğrafı')}>
            <Avatar size={72} />
          </PressableScale>
          <View style={styles.flex}>
            <TextInput value={name ?? p.name} onChangeText={setName} onEndEditing={saveName} onSubmitEditing={saveName}
              placeholder={t('Adın')} placeholderTextColor={colors.textSecondary} style={styles.nameInput} maxLength={24} accessibilityLabel={t('Adın')} />
            {summary ? <Text style={type.caption} numberOfLines={1}>{summary}</Text> : null}
          </View>
          <Pressable onPress={() => setInfo(true)} hitSlop={12} style={styles.edit} accessibilityRole="button" accessibilityLabel={t('Bilgileri düzenle')}>
            <Icon name="edit" color={colors.textSecondary} size={22} />
          </Pressable>
        </View>
        <PressableScale onPress={() => router.push('/level')} accessibilityRole="button" accessibilityLabel={t('Seviye yolu')}>
          <LevelBar />
        </PressableScale>
      </View>

      <PressableScale style={[styles.card, styles.streakRow]} onPress={() => router.push('/streak')} accessibilityRole="button" accessibilityLabel={t('Seri ayrıntıları')}>
        <StreakStat icon="local_fire_department" color={colors.primaryLight} value={data.streak?.current ?? 0} label={t('Seri')} />
        <StreakStat icon="emoji_events" color={colors.warning} value={data.streak?.longest ?? 0} label={t('En uzun')} />
        <StreakStat icon="ac_unit" color={colors.ice} value={`${data.streak?.freezes_available ?? 0}/${MAX_FREEZES}`} label={t('Dondurma')} />
        <Icon name="chevron_right" color={colors.textSecondary} />
      </PressableScale>

      <MiniCalendar />

      <View style={styles.tiles}>
        <Tile label={t('Kilo')} value={weight ? `${fmtDec(weight)}` : t('Ekle')} hint={weight ? 'kg' : undefined}
          onPress={() => (weight ? router.navigate('/stats') : setPrompt('weight'))} />
        <Tile label={t('Hedef')} value={p.targetWeightKg ? fmtDec(p.targetWeightKg) : t('Belirle')} hint={p.targetWeightKg ? 'kg' : undefined}
          onPress={() => setPrompt('target')} />
        <Tile label="BMI" value={index ? fmtDec(index) : '—'} hint={index ? bmiLabel(index) : undefined} />
      </View>

      <View style={styles.card}>
        <LinkRow icon="dashboard_customize" label={t('Ana ekran düzeni')} onPress={() => router.push('/home-layout')} />
        <LinkRow icon="settings" label={t('Ayarlar')} onPress={() => router.push('/settings')} />
      </View>

      <Sheet visible={info} onClose={() => setInfo(false)} title={t('Bilgiler')}>
        <SheetRow label={t('Yaş')} value={p.age ? String(p.age) : t('Ekle')} onPress={() => ask('age')} />
        <SegmentedControl<'male' | 'female' | 'none'>
          options={[{ value: 'male', label: t('Erkek') }, { value: 'female', label: t('Kadın') }, { value: 'none', label: t('Belirtme') }]}
          value={p.sex ?? 'none'}
          onChange={(v) => saveProfile({ sex: v === 'none' ? null : v })}
        />
        <SheetRow label={t('Boy')} value={height ? `${Math.round(height)} cm` : t('Ekle')} onPress={() => ask('height')} />
        <SheetRow label={t('Hedef kilo')} value={p.targetWeightKg ? `${fmtDec(p.targetWeightKg)} kg` : t('Belirle')} onPress={() => ask('target')} />
      </Sheet>

      <Sheet visible={photo} onClose={() => setPhoto(false)} title={t('Profil fotoğrafı')}>
        <SheetRow label={t('Fotoğraf seç')} onPress={choosePhoto} />
        {p.avatarPath ? <SheetRow label={t('Fotoğrafı kaldır')} onPress={dropPhoto} /> : null}
      </Sheet>

      <NumberPrompt visible={prompt === 'weight'} onClose={close} title={t('Bugünkü kilo')} suffix="kg" initial={weight ?? undefined} min={20}
        onSubmit={(v) => saveMeasurement('weight', Math.round(v * 10) / 10, today())} />
      <NumberPrompt visible={prompt === 'height'} onClose={close} title={t('Boy')} suffix="cm" initial={height ?? undefined} min={80}
        onSubmit={(v) => saveMeasurement('height', Math.round(v), today())} />
      <NumberPrompt visible={prompt === 'age'} onClose={close} title={t('Yaş')} initial={p.age ?? undefined} min={5}
        onSubmit={(v) => saveProfile({ age: Math.round(v) })} />
      <NumberPrompt visible={prompt === 'target'} onClose={close} title={t('Hedef kilo')} suffix="kg" initial={p.targetWeightKg ?? undefined} min={20}
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
  const body = (
    <>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.title} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text style={type.caption} numberOfLines={1}>{hint}</Text> : null}
    </>
  );
  return (
    <>
      {onPress ? (
        <PressableScale style={styles.tile} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>{body}</PressableScale>
      ) : <View style={styles.tile} accessibilityLabel={`${label}: ${value}`}>{body}</View>}
    </>
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
