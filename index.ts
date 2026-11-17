import 'expo-router/entry';

// Ana ekran widget'ı: olay işleyici uygulama kapalıyken de çalışır. Expo Go'da yerel modül yok, atlanır.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- yerel modül Expo Go'da yok
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetTaskHandler } = require('./src/widget/handler') as typeof import('./src/widget/handler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch {
  // widget desteği yok
}
