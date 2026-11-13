import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

import { colors } from '@/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];
type AndroidName = Extract<SymbolName, { android?: unknown }>['android'];

/** Android'de Material Symbols (font uygulamaya gömülü, offline çalışır). */
export function Icon({ name, size = 24, color = colors.textPrimary }: { name: NonNullable<AndroidName>; size?: number; color?: string }) {
  return <SymbolView name={{ android: name, web: name }} size={size} tintColor={color} />;
}
