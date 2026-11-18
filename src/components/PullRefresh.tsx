import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { notify } from '@/db/bus';
import { colors } from '@/theme';

/** Aşağı çekip yenileme: tüm ekranların verisini yeniden yükletir (veriler sunucudan tekrar okunur). */
export function usePullRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    notify('*');
    // shortcut: yeniden yüklemenin bitişi tek tek ekranlardan bildirilmiyor; göstergeyi kısa bir süre sonra kapat
    setTimeout(() => setRefreshing(false), 800);
  };
  return (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent}
      colors={[colors.primaryLight]} progressBackgroundColor={colors.surface} />
  );
}
