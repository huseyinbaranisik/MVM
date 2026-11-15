import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { TrackerCard } from '@/components/TrackerCard';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { confirm } from '@/components/ui/overlays';
import { PillButton } from '@/components/ui/PillButton';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { addFood, deleteFoodLog, getFoodLogs, getFoods, logFood, type Food } from '@/db/repos/foods';
import { getTrackerSettings, updateTrackerSettings } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { filterFoods, sumMacros } from '@/services/nutrition';
import { fmtInt, parseNumber } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';

const MAX_RESULTS = 40;

export function CalorieCard({ date }: { date: string }) {
  const db = useSQLiteContext();
  const data = useDb(async (db) => ({
    date, logs: await getFoodLogs(db, date), foods: await getFoods(db), s: await getTrackerSettings(db, 'calories'),
  }), [date], ['food_logs', 'foods', 'tracker_settings']);
  const [open, setOpen] = useState<'menu' | 'goal' | 'search' | 'grams' | 'new' | 'logs' | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Pick<Food, 'id' | 'name'> | null>(null);

  if (!data?.s) return <Skeleton height={240} />;
  const pickedId = picked?.id;
  const total = sumMacros(data.logs);
  const goal = data.s.goal;
  const results = filterFoods(data.foods, query).slice(0, MAX_RESULTS);
  const close = () => setOpen(null);
  const choose = (f: Pick<Food, 'id' | 'name'>) => { setPicked(f); setOpen('grams'); };

  const remove = async (id: number, label: string) => {
    if (await confirm({ title: 'Kayıt silinsin mi?', message: label, confirmLabel: 'Sil', destructive: true })) {
      await deleteFoodLog(db, id);
    }
  };

  return (
    <>
      <TrackerCard
        layout="wide" resetKey={data.date}
        title="Kalori" icon="restaurant" color={colors.warning}
        progress={total.kcal / goal}
        value={fmtInt(total.kcal)}
        caption={`/ ${fmtInt(goal)} kcal`}
        onMenu={() => setOpen('menu')}
        onPress={() => { setQuery(''); setOpen('search'); }}
        side={
          <>
            <Info label="Protein" value={`${fmtInt(total.protein)} g`} />
            <Info label="Yağ" value={`${fmtInt(total.fat)} g`} />
            <Info label="Karbonhidrat" value={`${fmtInt(total.carbs)} g`} />
          </>
        }
        footer={
          <Text style={type.caption}>
            {data.logs.length ? `${data.logs.length} kayıt · kalan ${fmtInt(Math.max(0, goal - total.kcal))} kcal` : 'Yiyecek eklemek için karta dokun'}
          </Text>
        }
      />

      <Sheet visible={open === 'search'} onClose={close} title="Yiyecek ekle">
        <TextInput value={query} onChangeText={setQuery} placeholder="Ara: tavuk, pirinç, yoğurt…" placeholderTextColor={colors.textSecondary}
          style={styles.input} accessibilityLabel="Yiyecek ara" autoCorrect={false} />
        <SheetRow label="+ Kendi yiyeceğini ekle" onPress={() => setOpen('new')} />
        {results.map((f) => <SheetRow key={f.id} label={f.name} value={`${fmtInt(f.kcal)} kcal/100 g`} onPress={() => choose(f)} />)}
        {!results.length ? <Text style={type.caption}>Bulunamadı. Kendi yiyeceğini ekleyebilirsin.</Text> : null}
      </Sheet>

      <NumberPrompt
        visible={open === 'grams'} onClose={close} title={picked?.name ?? ''} suffix="g" initial={100}
        onSubmit={(v) => { if (pickedId != null) logFood(db, date, pickedId, v); }}
      />

      <NewFoodSheet visible={open === 'new'} onClose={close} initialName={query.trim()}
        onSaved={(f) => choose(f)} save={(f) => addFood(db, f)} />

      <Sheet visible={open === 'menu'} onClose={close} title="Kalori">
        <SheetRow label="Hedefi değiştir" value={`${fmtInt(goal)} kcal`} onPress={() => setOpen('goal')} />
        <SheetRow label="Bugünkü kayıtlar" value={String(data.logs.length)} onPress={() => setOpen('logs')} />
        <SheetRow label="Geçmişi gör" onPress={() => { close(); router.push('/tracker/calories'); }} />
      </Sheet>

      <Sheet visible={open === 'logs'} onClose={close} title="Kayıtlar">
        {data.logs.map((l) => {
          const label = `${l.name} · ${fmtInt(l.grams)} g`;
          return <SheetRow key={l.id} label={label} value={`${fmtInt(l.kcal)} kcal`} onPress={() => remove(l.id, label)} />;
        })}
        {!data.logs.length ? <Text style={type.caption}>Bu gün için kayıt yok.</Text> : null}
        {data.logs.length ? <Text style={type.caption}>Silmek için kayda dokun.</Text> : null}
      </Sheet>

      <NumberPrompt
        visible={open === 'goal'} onClose={close} title="Günlük kalori hedefi" suffix="kcal" initial={goal} min={499}
        onSubmit={(v) => updateTrackerSettings(db, 'calories', { goal: Math.round(v) })}
      />
    </>
  );
}

const FIELDS = [
  { key: 'kcal', label: 'Kalori (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'fat', label: 'Yağ (g)' },
  { key: 'carbs', label: 'Karbonhidrat (g)' },
] as const;
type Macro = (typeof FIELDS)[number]['key'];

/** 100 g başına değerlerle kullanıcı yiyeceği; kaydedince doğrudan gram sorusuna geçer. */
function NewFoodSheet({ visible, onClose, initialName, save, onSaved }: {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  save: (f: Omit<Food, 'id' | 'source'>) => Promise<number>;
  onSaved: (f: Pick<Food, 'id' | 'name'>) => void;
}) {
  const [name, setName] = useState('');
  const [vals, setVals] = useState<Record<Macro, string>>({ kcal: '', protein: '', fat: '', carbs: '' });
  const [prevVisible, setPrevVisible] = useState(false);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) { setName(initialName); setVals({ kcal: '', protein: '', fat: '', carbs: '' }); }
  }
  const nums = FIELDS.map((f) => parseNumber(vals[f.key] || '0'));
  const kcal = nums[0];
  // kcal zorunlu, makrolar boş bırakılırsa 0
  const valid = name.trim() !== '' && vals.kcal.trim() !== '' && kcal != null && kcal > 0 && nums.every((n) => n != null && n >= 0);

  const submit = async () => {
    if (!valid) return;
    const [k, protein, fat, carbs] = nums as number[];
    const n = name.trim();
    const id = await save({ name: n, kcal: k, protein, fat, carbs });
    onSaved({ id, name: n });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Yeni yiyecek (100 g başına)">
      <TextInput value={name} onChangeText={setName} placeholder="Yiyecek adı" placeholderTextColor={colors.textSecondary}
        style={styles.input} maxLength={48} accessibilityLabel="Yiyecek adı" />
      {FIELDS.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={[type.body, styles.flex]}>{f.label}</Text>
          <TextInput value={vals[f.key]} onChangeText={(t) => setVals({ ...vals, [f.key]: t })} keyboardType="decimal-pad"
            placeholder="0" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.num]} accessibilityLabel={f.label} />
        </View>
      ))}
      <PillButton label="Kaydet" variant="primary" disabled={!valid} onPress={submit} />
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.subtitle}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    minHeight: 52, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: spacing.lg, color: colors.textPrimary, fontSize: 16,
  },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  num: { width: 110, textAlign: 'right', fontWeight: '700' },
});
