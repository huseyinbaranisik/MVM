import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { PillButton } from '@/components/ui/PillButton';
import { Appear } from '@/components/ui/Skeleton';
import { colors, radius, spacing, type } from '@/theme';

// Aşama 1 yer tutucu. Grafikler Aşama 6'da; o zamana kadar yeni kullanıcıyı ne yapacağına yönlendir.
export default function StatsScreen() {
  return (
    <Screen>
      <Text style={type.hero}>İstatistik</Text>
      <Appear style={styles.empty}>
        <View style={styles.icon}><Icon name="bar_chart" size={32} color={colors.accent} /></View>
        <Text style={[type.title, styles.center]}>Grafiklerin burada olacak</Text>
        <Text style={[type.caption, styles.center]}>
          Antrenman yaptıkça ve su, adım, uyku kaydettikçe ilerlemen burada görünecek. Su, adım ve uyku geçmişine şimdiden Bugün ekranındaki kartların menüsünden bakabilirsin.
        </Text>
        <PillButton label="Bugün ekranına git" variant="primary" onPress={() => router.navigate('/')} />
      </Appear>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  icon: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
