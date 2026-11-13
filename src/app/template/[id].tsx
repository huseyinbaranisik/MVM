import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DraggableList } from '@/components/DraggableList';
import { BackHeader, ExerciseRow, ExerciseThumb } from '@/components/exercise';
import { Icon } from '@/components/Icon';
import { PillButton } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { getExerciseList } from '@/db/repos/exercises';
import {
  addTemplateExercise, deleteTemplate, getTemplateExercises, getTemplateName, removeTemplateExercise,
  renameTemplate, reorderTemplateExercises, summary, updateTemplateExercise, type TemplateExercise,
} from '@/db/repos/templates';
import { useDb } from '@/db/useDb';
import { parseNumber } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';

const ROW_H = 76;
const SUPERSET_LETTERS = 'ABCDEFGH';


export default function TemplateEditor() {
  const db = useSQLiteContext();
  const templateId = Number(useLocalSearchParams<{ id: string }>().id);
  const data = useDb(async (db) => ({
    name: (await getTemplateName(db, templateId))?.name ?? '',
    items: await getTemplateExercises(db, templateId),
  }), [templateId]);
  const [name, setName] = useState<string | null>(null);
  const [editing, setEditing] = useState<TemplateExercise | null>(null);
  const [picking, setPicking] = useState(false);

  if (!data) return <BackHeader title="" />;
  const groups = [...new Set(data.items.map((x) => x.superset_group).filter((g) => g != null))];

  const confirmDelete = () => Alert.alert('Şablon silinsin mi?', 'Atandığı günler dinlenme gününe döner.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => { await deleteTemplate(db, templateId); router.back(); } },
  ]);

  return (
    <View style={styles.flex}>
      <BackHeader title="Şablonu düzenle" right={
        <Pressable onPress={confirmDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Şablonu sil">
          <Icon name="delete" color={colors.textSecondary} />
        </Pressable>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={name ?? data.name}
          onChangeText={setName}
          onEndEditing={() => { if (name?.trim()) renameTemplate(db, templateId, name.trim()); }}
          style={styles.nameInput} accessibilityLabel="Şablon adı" maxLength={40} />
        <Text style={type.caption}>{data.items.length} hareket · sıralamak için sağdaki tutamaçtan sürükle</Text>

        <View style={styles.list}>
          <DraggableList
            items={data.items}
            keyOf={(x) => x.id}
            rowHeight={ROW_H}
            onReorder={(keys) => reorderTemplateExercises(db, keys as number[])}
            renderRow={(x) => (
              <Pressable onPress={() => setEditing(x)} style={styles.row} accessibilityRole="button" accessibilityLabel={`${x.name_tr} düzenle`}>
                <ExerciseThumb imageKey={x.image_key} photoUri={x.photo_uri} size={48} />
                <View style={styles.flex1}>
                  <Text style={type.subtitle} numberOfLines={1}>{x.name_tr}</Text>
                  <Text style={type.caption} numberOfLines={1}>{summary(x)}</Text>
                </View>
                {x.superset_group != null ? (
                  <Text style={styles.superset}>Süperset {SUPERSET_LETTERS[groups.indexOf(x.superset_group)] ?? ''}</Text>
                ) : null}
              </Pressable>
            )}
          />
        </View>
        <PillButton label="+ Hareket ekle" variant="primary" onPress={() => setPicking(true)} />
      </ScrollView>

      <EditSheet item={editing} items={data.items} onClose={() => setEditing(null)} />
      <PickerSheet visible={picking} onClose={() => setPicking(false)}
        onPick={async (exerciseId) => { await addTemplateExercise(db, templateId, exerciseId); setPicking(false); }} />
    </View>
  );
}

function EditSheet({ item, items, onClose }: { item: TemplateExercise | null; items: TemplateExercise[]; onClose: () => void }) {
  const db = useSQLiteContext();
  const [sets, setSets] = useState(3);
  const [timed, setTimed] = useState(false);
  const [repMin, setRepMin] = useState('');
  const [repMax, setRepMax] = useState('');
  const [duration, setDuration] = useState('');
  const [rest, setRest] = useState('');
  const [perSide, setPerSide] = useState(false);
  const [superset, setSuperset] = useState(false);
  const [prev, setPrev] = useState<TemplateExercise | null>(null);
  if (item !== prev) {
    setPrev(item);
    if (item) {
      setSets(item.sets);
      setTimed(item.duration_sec != null);
      setRepMin(item.rep_min?.toString() ?? '');
      setRepMax(item.rep_max?.toString() ?? '');
      setDuration(item.duration_sec?.toString() ?? '30');
      setRest(item.rest_sec?.toString() ?? '');
      setPerSide(!!item.per_side);
      const before = items[items.findIndex((x) => x.id === item.id) - 1];
      setSuperset(item.superset_group != null && before?.superset_group === item.superset_group);
    }
  }
  if (!item) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;
  const index = items.findIndex((x) => x.id === item.id);
  const before = items[index - 1];

  const save = async () => {
    const min = parseNumber(repMin);
    const max = parseNumber(repMax) ?? min;
    // süperset: önceki hareketin grubuna katıl (yoksa yeni grup aç)
    let group: number | null = null;
    if (superset && before) {
      group = before.superset_group ?? Math.max(0, ...items.map((x) => x.superset_group ?? 0)) + 1;
      if (before.superset_group == null) await updateTemplateExercise(db, before.id, { superset_group: group });
    }
    await updateTemplateExercise(db, item.id, {
      sets,
      rep_min: timed ? null : min != null ? Math.round(min) : null,
      rep_max: timed ? null : max != null ? Math.round(Math.max(max, min ?? 0)) : null,
      duration_sec: timed ? Math.round(parseNumber(duration) ?? 30) : null,
      rest_sec: parseNumber(rest) != null ? Math.round(parseNumber(rest)!) : null,
      per_side: perSide ? 1 : 0,
      superset_group: group,
    });
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={item.name_tr}>
      <View style={styles.setsRow}>
        <Text style={[type.subtitle, styles.flex1]}>Set</Text>
        <PillButton label="−" onPress={() => setSets(Math.max(1, sets - 1))} accessibilityLabel="Set azalt" />
        <Text style={styles.setsValue}>{sets}</Text>
        <PillButton label="+" onPress={() => setSets(Math.min(10, sets + 1))} accessibilityLabel="Set artır" />
      </View>
      <View style={styles.inline}>
        <PillButton label="Tekrar" active={!timed} onPress={() => setTimed(false)} style={styles.flex1} />
        <PillButton label="Süre (sn)" active={timed} onPress={() => setTimed(true)} style={styles.flex1} />
      </View>
      {timed ? (
        <Field label="Süre (sn)" value={duration} onChange={setDuration} />
      ) : (
        <View style={styles.inline}>
          <Field label="En az tekrar" value={repMin} onChange={setRepMin} />
          <Field label="En çok tekrar" value={repMax} onChange={setRepMax} />
        </View>
      )}
      <Field label="Dinlenme (sn) · boş = varsayılan" value={rest} onChange={setRest} />
      <View style={styles.inline}>
        <PillButton label="Her taraf / bacak" active={perSide} onPress={() => setPerSide(!perSide)} style={styles.flex1} />
        {before ? <PillButton label="Öncekiyle süperset" active={superset} onPress={() => setSuperset(!superset)} style={styles.flex1} /> : null}
      </View>
      <PillButton label="Kaydet" variant="primary" onPress={save} />
      <PillButton label="Şablondan çıkar" onPress={async () => { await removeTemplateExercise(db, item.id); onClose(); }} />
    </Sheet>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={type.caption}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" style={styles.input} accessibilityLabel={label} />
    </View>
  );
}

function PickerSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const list = useDb((db) => getExerciseList(db), []);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr-TR');
    const all = list ?? [];
    return (s ? all.filter((e) => e.name_tr.toLocaleLowerCase('tr-TR').includes(s) || (e.name_en ?? '').toLowerCase().includes(s)) : all).slice(0, 40);
  }, [list, q]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Hareket ekle">
      <TextInput value={q} onChangeText={setQ} placeholder="Ara" placeholderTextColor={colors.textSecondary} style={styles.input} accessibilityLabel="Hareket ara" />
      {filtered.map((e) => (
        <ExerciseRow key={e.id} id={e.id} name={e.name_tr} imageKey={e.image_key} photoUri={e.photo_uri} favorite={!!e.is_favorite}
          right={
            <Pressable onPress={() => onPick(e.id)} hitSlop={8} style={styles.addBtn} accessibilityRole="button" accessibilityLabel={`${e.name_tr} ekle`}>
              <Icon name="add" color={colors.accent} />
            </Pressable>
          } />
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  nameInput: {
    fontSize: 26, fontWeight: '800', color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingVertical: spacing.sm,
  },
  list: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, height: ROW_H },
  superset: {
    fontSize: 11, fontWeight: '700', color: colors.accent, backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden',
  },
  setsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  setsValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, minWidth: 28, textAlign: 'center' },
  inline: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1, gap: spacing.xs },
  input: {
    minHeight: 48, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: spacing.lg, color: colors.textPrimary, fontSize: 16,
  },
  addBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
