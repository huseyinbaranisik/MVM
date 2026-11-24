import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { TrackerCard } from '@/components/TrackerCard';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { confirm } from '@/components/ui/overlays';
import { PillButton, SegmentedControl } from '@/components/ui/PillButton';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { FOOD_CATEGORIES, type FoodCategory, type FoodUnit } from '@/data/foods';
import { addFood, deleteFoodLog, getFoodLogs, getFoods, getRecentFoods, logFood, type Food } from '@/db/repos/foods';
import { getSetting } from '@/db/repos/settings';
import { getLatestMeasurement, getTrackerSettings, updateTrackerSettings } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { filterFoods, proteinTarget, suggestCalories, sumMacros } from '@/services/nutrition';
import { fmtInt, parseNumber } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

const MAX_RESULTS = 40;

export function CalorieCard({ date, size = 'large' }: { date: string; size?: 'small' | 'large' }) {
  const data = useDb(async () => {
    const [logs, foods, recent, s, profile, weight, height] = await Promise.all([
      getFoodLogs(date), getFoods(), getRecentFoods(), getTrackerSettings('calories'),
      getSetting('profile'), getLatestMeasurement('weight'), getLatestMeasurement('height'),
    ]);
    return { date, logs, foods, recent, s, weight, suggested: suggestCalories({ weightKg: weight, heightCm: height, age: profile.age, sex: profile.sex }) };
  }, [date], ['food_logs', 'user_foods', 'tracker_settings', 'settings', 'body_measurements']);
  const [open, setOpen] = useState<'menu' | 'goal' | 'search' | 'grams' | 'new' | 'logs' | null>(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<FoodCategory | null>(null);
  const [picked, setPicked] = useState<Food | null>(null);

  if (!data?.s) return <Skeleton height={240} />;
  const total = sumMacros(data.logs);
  const goal = data.s.goal;
  const searching = query.trim() !== '' || cat != null;
  // eski kayıtlarda birim yok: katalogda varsa onun birimi ve kategorisi
  const recent = data.recent.map((r) => data.foods.find((f) => f.name === r.name) ?? r);
  const recentNames = new Set(recent.map((f) => f.name));
  // arama boşken önce son yenenler, sonra kalan yiyecekler
  const results = searching ? filterFoods(data.foods, query, cat).slice(0, MAX_RESULTS)
    : data.foods.filter((f) => !recentNames.has(f.name)).slice(0, MAX_RESULTS);
  const protein = proteinTarget(data.weight);
  const suggested = data.suggested;
  const close = () => setOpen(null);
  const choose = (f: Food) => { setPicked(f); setOpen('grams'); };

  const remove = async (id: number, label: string) => {
    if (await confirm({ title: t('Kayıt silinsin mi?'), message: label, confirmLabel: t('Sil'), destructive: true })) {
      await deleteFoodLog(id);
    }
  };

  return (
    <>
      <TrackerCard
        layout={size === 'large' ? 'wide' : 'square'} resetKey={data.date}
        title={t('Kalori')} icon="restaurant" color={colors.warning}
        progress={total.kcal / goal}
        value={fmtInt(total.kcal)}
        caption={`/ ${fmtInt(goal)} kcal`}
        onMenu={() => setOpen('menu')}
        onPress={() => { setQuery(''); setCat(null); setOpen('search'); }}
        side={
          <>
            <MacroBar protein={total.protein} carbs={total.carbs} fat={total.fat} goal={goal} />
            <Info color={MACRO_COLORS.protein} label="Protein" value={protein ? `${fmtInt(total.protein)} / ${protein} g` : `${fmtInt(total.protein)} g`} />
            <Info color={MACRO_COLORS.fat} label={t('Yağ')} value={`${fmtInt(total.fat)} g`} />
            <Info color={MACRO_COLORS.carbs} label={t('Karbonhidrat')} value={`${fmtInt(total.carbs)} g`} />
          </>
        }
        footer={
          <Text style={type.caption} numberOfLines={1}>
            {size === 'small' ? t('Kalan {n} kcal', { n: fmtInt(Math.max(0, goal - total.kcal)) })
              : data.logs.length ? t('{c} kayıt · kalan {n} kcal', { c: data.logs.length, n: fmtInt(Math.max(0, goal - total.kcal)) }) : ''}
          </Text>
        }
      />

      <Sheet visible={open === 'search'} onClose={close} title={t('Yiyecek ekle')}>
        <TextInput value={query} onChangeText={setQuery} placeholder={t('Ara')} placeholderTextColor={colors.textSecondary}
          style={styles.input} accessibilityLabel={t('Yiyecek ara')} autoCorrect={false} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {FOOD_CATEGORIES.map((c) => <PillButton key={c} label={t(c)} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />)}
        </ScrollView>
        <SheetRow label={t('+ Kendi yiyeceğini ekle')} onPress={() => setOpen('new')} />
        {!searching && recent.length ? (
          <>
            <Text style={type.caption}>{t('Son yenenler')}</Text>
            {recent.map((f) => <SheetRow key={f.id} label={f.name} value={`${fmtInt(f.kcal)} kcal/100 ${f.unit}`} onPress={() => choose(f)} />)}
            <Text style={type.caption}>{t('Tüm yiyecekler')}</Text>
          </>
        ) : null}
        {results.map((f) => <SheetRow key={f.id} label={f.name} value={`${fmtInt(f.kcal)} kcal/100 ${f.unit}`} onPress={() => choose(f)} />)}
        {!results.length ? <Text style={type.caption}>{t('Bulunamadı.')}</Text> : null}
      </Sheet>

      <NumberPrompt
        visible={open === 'grams'} onClose={close} title={picked?.name ?? ''} suffix={picked?.unit ?? 'g'} initial={picked?.unit === 'ml' ? 200 : 100}
        onSubmit={(v) => { if (picked) logFood(date, picked, v); }}
      />

      <NewFoodSheet visible={open === 'new'} onClose={close} initialName={query.trim()}
        onSaved={(f) => choose(f)} save={(f) => addFood(f)} />

      <Sheet visible={open === 'menu'} onClose={close} title={t('Kalori')}>
        <SheetRow label={t('Hedefi değiştir')} value={`${fmtInt(goal)} kcal`} onPress={() => setOpen('goal')} />
        {suggested ? (
          <SheetRow label={t('Önerilen hedef')} value={`${fmtInt(suggested)} kcal`}
            onPress={() => { updateTrackerSettings('calories', { goal: suggested }); close(); }} />
        ) : (
          <SheetRow label={t('Önerilen hedef')} value={t('Profili doldur')} onPress={() => { close(); router.navigate('/profile'); }} />
        )}
        <SheetRow label={t('Bugünkü kayıtlar')} value={String(data.logs.length)} onPress={() => setOpen('logs')} />
        <SheetRow label={t('Geçmişi gör')} onPress={() => { close(); router.push('/tracker/calories'); }} />
      </Sheet>

      <Sheet visible={open === 'logs'} onClose={close} title={t('Kayıtlar')}>
        {data.logs.map((l) => {
          const label = `${l.name} · ${fmtInt(l.grams)} ${l.unit}`;
          return <SheetRow key={l.id} label={label} value={`${fmtInt(l.kcal)} kcal`} onPress={() => remove(l.id, label)} />;
        })}
        {!data.logs.length ? <Text style={type.caption}>{t('Kayıt yok.')}</Text> : null}
      </Sheet>

      <NumberPrompt
        visible={open === 'goal'} onClose={close} title={t('Günlük kalori hedefi')} suffix="kcal" initial={goal} min={499}
        onSubmit={(v) => updateTrackerSettings('calories', { goal: Math.round(v) })}
      />
    </>
  );
}

const FIELDS = [
  { key: 'kcal', label: t('Kalori (kcal)') },
  { key: 'protein', label: t('Protein (g)') },
  { key: 'fat', label: t('Yağ (g)') },
  { key: 'carbs', label: t('Karbonhidrat (g)') },
] as const;
type Macro = (typeof FIELDS)[number]['key'];

/** 100 g başına değerlerle kullanıcı yiyeceği; kaydedince doğrudan gram sorusuna geçer. */
function NewFoodSheet({ visible, onClose, initialName, save, onSaved }: {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  save: (f: Omit<Food, 'id' | 'source'>) => Promise<Food>;
  onSaved: (f: Food) => void;
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<FoodUnit>('g');
  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [vals, setVals] = useState<Record<Macro, string>>({ kcal: '', protein: '', fat: '', carbs: '' });
  const [prevVisible, setPrevVisible] = useState(false);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) { setName(initialName); setUnit('g'); setCategory(null); setVals({ kcal: '', protein: '', fat: '', carbs: '' }); }
  }
  const nums = FIELDS.map((f) => parseNumber(vals[f.key] || '0'));
  const kcal = nums[0];
  // kcal zorunlu, makrolar boş bırakılırsa 0
  const valid = name.trim() !== '' && vals.kcal.trim() !== '' && kcal != null && kcal > 0 && nums.every((n) => n != null && n >= 0);

  const submit = async () => {
    if (!valid) return;
    const [k, protein, fat, carbs] = nums as number[];
    const n = name.trim();
    onSaved(await save({ name: n, kcal: k, protein, fat, carbs, unit, category }));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('Yeni yiyecek (100 {unit} başına)', { unit })}>
      <TextInput value={name} onChangeText={setName} placeholder={t('Yiyecek adı')} placeholderTextColor={colors.textSecondary}
        style={styles.input} maxLength={48} accessibilityLabel={t('Yiyecek adı')} />
      <View style={styles.row}>
        <SegmentedControl<FoodUnit> options={[{ value: 'g', label: t('Katı (g)') }, { value: 'ml', label: t('Sıvı (ml)') }]} value={unit} onChange={setUnit} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {FOOD_CATEGORIES.map((c) => <PillButton key={c} label={t(c)} active={category === c} onPress={() => setCategory(category === c ? null : c)} />)}
      </ScrollView>
      {FIELDS.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={[type.body, styles.flex]}>{f.label}</Text>
          <TextInput value={vals[f.key]} onChangeText={(v) => setVals({ ...vals, [f.key]: v })} keyboardType="decimal-pad"
            placeholder="0" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.num]} accessibilityLabel={f.label} />
        </View>
      ))}
      <PillButton label={t('Kaydet')} variant="primary" disabled={!valid} onPress={submit} />
    </Sheet>
  );
}

const MACRO_COLORS = { protein: colors.success, carbs: colors.ice, fat: colors.warning };

/**
 * Hedef kaloriyi tek çubukta gösterir: protein (4 kcal/g), karbonhidrat (4 kcal/g) ve yağ (9 kcal/g)
 * kendi renginde, yan yana. Hedef aşılınca çubuk toplam kaloriye göre ölçeklenir.
 */
function MacroBar({ protein, carbs, fat, goal }: { protein: number; carbs: number; fat: number; goal: number }) {
  const parts = [
    { key: 'protein', kcal: protein * 4, color: MACRO_COLORS.protein },
    { key: 'carbs', kcal: carbs * 4, color: MACRO_COLORS.carbs },
    { key: 'fat', kcal: fat * 9, color: MACRO_COLORS.fat },
  ];
  const scale = Math.max(goal, parts.reduce((a, p) => a + p.kcal, 0), 1);
  return (
    <View style={styles.macroTrack}
      accessibilityLabel={t('Makrolar: protein {p} kcal, karbonhidrat {c} kcal, yağ {f} kcal', { p: fmtInt(parts[0].kcal), c: fmtInt(parts[1].kcal), f: fmtInt(parts[2].kcal) })}>
      {parts.map((p) => (p.kcal > 0 ? <View key={p.key} style={{ width: `${(p.kcal / scale) * 100}%`, backgroundColor: p.color }} /> : null))}
    </View>
  );
}

function Info({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.info}>
      <View style={styles.infoLabel}>
        {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
        <Text style={type.caption}>{label}</Text>
      </View>
      <Text style={type.subtitle}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  macroTrack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.surfaceElevated },
  input: {
    minHeight: 52, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: spacing.lg, color: colors.textPrimary, fontSize: 16,
  },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
  num: { width: 110, textAlign: 'right', fontWeight: '700' },
});
