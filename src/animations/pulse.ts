import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an Animated.Value that oscillates between 1.0 and 0.45 on a 1.8s loop.
 * Apply it as `opacity` on Animated.View skeleton wrappers.
 * Uses the native driver — runs at 60fps with zero JS thread involvement.
 */
export function usePulseAnimation(active: boolean): Animated.Value {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      anim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.45, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, anim]);

  return anim;
}
