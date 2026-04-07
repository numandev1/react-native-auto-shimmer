import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an Animated.Value that goes 0 → 1 on a 1.5s loop.
 *
 * Usage — translate a shimmer band inside each skeleton piece:
 * ```ts
 * const skeletonWidthPx = (skeleton.w / 100) * containerWidth
 * const translateX = shimmerProgress.interpolate({
 *   inputRange: [0, 1],
 *   outputRange: [-bandWidth, skeletonWidthPx + bandWidth],
 * })
 * ```
 *
 * All skeletons share this single Animated.Value so the shimmer band moves
 * in sync across the entire skeleton — creating the illusion of a single
 * strip of light sweeping left-to-right.
 *
 * Uses the native driver for 60fps performance.
 */
export function useShimmerAnimation(active: boolean): Animated.Value {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [active, anim]);

  return anim;
}
