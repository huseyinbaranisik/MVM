import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DraggableList } from '@/components/DraggableList';
import { BackHeader } from '@/components/exercise';
import { Icon } from '@/components/Icon';
import { confirm } from '@/components/ui/overlays';
import { PillButton, SegmentedControl } from '@/components/ui/PillButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { getSetting, setSetting } from '@/db/repos/settings';
import { useDb } from '@/db/useDb';
import { ALL_CARDS, DEFAULT_LAYOUT, defaultSize, HOME_CARD_NAMES, RESIZABLE, type HomeCardSize, type HomeItem } from '@/services/homeLayout';
import { colors, radius, spacing, type } from '@/theme';

const ROW = 64;

export default function HomeLayoutScreen() {
  const layout = useDb(() => getSetting('homeLayout'), [], ['settings']);
  const items = layout ?? [];
  const hidden = ALL_CARDS.filter((id) => !items.some((x) => x.id === id));
  const save = (next: HomeItem[]) => setSetting('homeLayout', next);

  const reset = async () => {
    if (await confirm({ title: 'Varsayılana dönülsün mü?', confirmLabel: 'Sıfırla' })) save(DEFAULT_LAYOUT);
  };

  return (
    <View style={styles.safe}>
      <BackHeader title="Ana ekran düzeni" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <DraggableList
            items={items}
            keyOf={(x) => x.id}
            rowHeight={ROW}
            onReorder={(keys) => save(keys.map((k) => items.find((x) => x.id === k)!))}
            renderRow={(x) => (
              <View style={styles.row}>
                <Text style={[type.body, styles.flex]} numberOfLines={1}>{HOME_CARD_NAMES[x.id]}</Text>
                {RESIZABLE.includes(x.id) ? (
                  <View style={styles.segment}>
                    <SegmentedControl<HomeCardSize>
                      options={[{ value: 'small', label: 'Küçük' }, { value: 'large', label: 'Büyük' }]}
                      value={x.size}
                      onChange={(size) => save(items.map((y) => (y.id === x.id ? { ...y, size } : y)))}
                    />
                  </View>
                ) : null}
                <PressableScale onPress={() => save(items.filter((y) => y.id !== x.id))} disabled={items.length <= 1}
                  style={styles.remove} accessibilityRole="button" accessibilityLabel={`${HOME_CARD_NAMES[x.id]} kaldır`}>
                  <Icon name="close" size={20} color={colors.textSecondary} />
                </PressableScale>
              </View>
            )}
          />
        </View>

        {hidden.length ? (
          <View style={styles.card}>
            {hidden.map((id) => (
              <View key={id} style={styles.row}>
                <Text style={[type.body, styles.flex, styles.muted]}>{HOME_CARD_NAMES[id]}</Text>
                <PillButton label="Ekle" onPress={() => save([...items, { id, size: defaultSize(id) }])} />
              </View>
            ))}
          </View>
        ) : null}

        <PillButton label="Varsayılana dön" onPress={reset} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, paddingTop: 0, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: ROW },
  flex: { flex: 1 },
  muted: { color: colors.textSecondary },
  segment: { width: 170, flexDirection: 'row' },
  remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
