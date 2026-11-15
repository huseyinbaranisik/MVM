import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Basınca hafifçe küçülüp solan Pressable (profesyonel uygulamalardaki basma hissi). */
export function PressableScale({ style, onPressIn, onPressOut, disabled, ...rest }: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
}) {
  const pressed = useSharedValue(0);
  const base = disabled ? 0.4 : 1; // animasyonlu opaklık statik stili ezdiği için devre dışı hali burada
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
    opacity: base * (1 - pressed.value * 0.15),
  }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, anim]}
      onPressIn={(e) => { pressed.value = withTiming(1, { duration: 90 }); onPressIn?.(e); }}
      onPressOut={(e) => { pressed.value = withSpring(0, { damping: 15, stiffness: 300 }); onPressOut?.(e); }}
    />
  );
}
