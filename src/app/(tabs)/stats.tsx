import { Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { type } from '@/theme';

// Aşama 1 yer tutucu. Grafikler Aşama 6'da.
export default function StatsScreen() {
  return (
    <Screen>
      <Text style={type.hero}>İstatistik</Text>
      <Text style={type.caption}>Yakında</Text>
    </Screen>
  );
}
