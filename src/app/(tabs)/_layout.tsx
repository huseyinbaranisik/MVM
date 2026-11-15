import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      // animation: 'fade' kaldırıldı: eklendiği sürümde Program sekmesine geçişte boş ekran görüldü (Android)
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="program" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="stats" />
    </Tabs>
  );
}
