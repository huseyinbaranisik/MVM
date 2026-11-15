import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Skeleton';
import { colors, radius, spacing, type } from '@/theme';

// Yer tutucu: grafikler henüz yok.
export default function StatsScreen() {
  return (
    <Screen>
      <Text style={type.hero}>İstatistik</Text>
      <Appear style={styles.empty}>
        <View style={styles.icon}><Icon name="bar_chart" size={32} color={colors.accent} /></View>
        <Text style={[type.title, styles.center]}>Yakında</Text>
      </Appear>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  icon: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
