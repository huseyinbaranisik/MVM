import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackHeader, EQUIPMENT_TR } from '@/components/exercise';
import { Icon } from '@/components/Icon';
import { PillButton, SegmentedControl } from '@/components/ui/PillButton';
import { muscles, regions } from '@/data/muscleMap';
import { createUserExercise } from '@/db/repos/exercises';
import { colors, radius, spacing, type } from '@/theme';

type Role = 'primary' | 'secondary';

export default function NewExercise() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('dumbbell');
  const [mode, setMode] = useState<'reps' | 'time'>('reps');
  const [photo, setPhoto] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [error, setError] = useState('');

  // dokundukça: seçili değil → birincil → ikincil → seçili değil
  const cycle = (id: string) => setRoles((r) => {
    const next = { ...r };
    if (!r[id]) next[id] = 'primary';
    else if (r[id] === 'primary') next[id] = 'secondary';
    else delete next[id];
    return next;
  });

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (res.canceled) return;
    // seçici geçici bir kopya verir; kalıcı olması için uygulama klasörüne kopyala
    const dest = new File(Paths.document, `exercise_${Date.now()}.jpg`);
    new File(res.assets[0].uri).copy(dest);
    setPhoto(dest.uri);
  };

  const save = async () => {
    const primary = Object.keys(roles).filter((k) => roles[k] === 'primary');
    if (!name.trim()) return setError('Hareket adı gerekli.');
    if (!primary.length) return setError('En az bir birincil kas seç.');
    const id = await createUserExercise({
      name: name.trim(), description: description.trim(), equipment, mode, photoUri: photo,
      primary, secondary: Object.keys(roles).filter((k) => roles[k] === 'secondary'),
    });
    router.replace(`/exercise/${encodeURIComponent(id)}`);
  };

  return (
    <View style={styles.flex}>
      <BackHeader title="Kendi hareketin" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput value={name} onChangeText={setName} placeholder="Hareket adı" placeholderTextColor={colors.textSecondary}
          style={styles.input} maxLength={60} accessibilityLabel="Hareket adı" />
        <TextInput value={description} onChangeText={setDescription} placeholder="Açıklama"
          placeholderTextColor={colors.textSecondary} style={[styles.input, styles.multiline]} multiline accessibilityLabel="Açıklama" />

        <Pressable onPress={pickPhoto} style={styles.photo} accessibilityRole="button" accessibilityLabel="Fotoğraf seç">
          {photo ? <Image source={{ uri: photo }} style={styles.photoImg} contentFit="cover" />
            : <><Icon name="add_a_photo" color={colors.accentMuted} /><Text style={type.caption}>Fotoğraf ekle</Text></>}
        </Pressable>

        <Text style={type.subtitle}>Ekipman</Text>
        <View style={styles.wrap}>
          {['dumbbell', 'machine', 'bodyweight', 'barbell', 'cable', 'other'].map((eq) => (
            <PillButton key={eq} label={EQUIPMENT_TR[eq]} active={equipment === eq} onPress={() => setEquipment(eq)} />
          ))}
        </View>
        <Text style={type.subtitle}>Tür</Text>
        <View style={styles.row}>
          <SegmentedControl options={[{ value: 'reps', label: 'Tekrarlı' }, { value: 'time', label: 'Süreli' }]} value={mode} onChange={setMode} />
        </View>

        <Text style={type.subtitle}>Kaslar</Text>
        <Text style={type.caption}>Bir kez dokun: birincil · iki kez: ikincil · üç kez: kaldır</Text>
        {regions.map((r) => (
          <View key={r.id} style={styles.region}>
            <Text style={type.caption}>{r.nameTr}</Text>
            <View style={styles.wrap}>
              {muscles.filter((m) => m.regionId === r.id).map((m) => (
                <PillButton key={m.id} label={`${m.nameTr}${roles[m.id] === 'secondary' ? ' · ikincil' : ''}`}
                  active={roles[m.id] === 'primary'} onPress={() => cycle(m.id)}
                  style={roles[m.id] === 'secondary' ? styles.secondary : undefined} />
              ))}
            </View>
          </View>
        ))}

        {error ? <Text style={[type.body, { color: colors.warning }]}>{error}</Text> : null}
        <PillButton label="Kaydet" variant="primary" onPress={save} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  input: {
    minHeight: 52, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: spacing.lg, color: colors.textPrimary, fontSize: 16,
  },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  photo: {
    height: 160, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  region: { gap: spacing.xs },
  secondary: { borderColor: colors.primaryLight },
});
