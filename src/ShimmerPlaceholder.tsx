/**
 * ShimmerPlaceholder
 *
 * A zero-dependency loading placeholder with a gradient-style shimmer sweep.
 * Drop-in replacement for `react-native-shimmer-placeholder` — same API,
 * no LinearGradient, no 3rd-party installs.
 *
 * How it works:
 *   The shimmer "gradient" is simulated by rendering N thin vertical View
 *   slices whose opacity follows a bell-curve profile, then translating the
 *   whole group across the placeholder with Animated.timing.  The result is
 *   visually identical to a LinearGradient sweep but runs entirely in JS/RN
 *   with useNativeDriver: true.
 */

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShimmerPlaceholderProps {
  /**
   * Width of the placeholder box in pixels.
   * @default 200
   */
  width?: number;

  /**
   * Height of the placeholder box in pixels.
   * @default 15
   */
  height?: number;

  /**
   * Three colours that define the shimmer gradient: [edge, centre, edge].
   * Any React Native colour string is accepted.
   * @default ['#ebebeb', '#d0d0d0', '#ebebeb']
   */
  shimmerColors?: [string, string, string];

  /**
   * Reverse the sweep direction (right → left instead of left → right).
   * @default false
   */
  isReversed?: boolean;

  /**
   * Prevent the animation from starting automatically.
   * @default false
   */
  stopAutoRun?: boolean;

  /**
   * When `true` the real children are shown and the shimmer is hidden.
   * When `false` (default) the shimmer placeholder is shown.
   * @default false
   */
  visible?: boolean;

  /**
   * Duration of one full shimmer sweep in milliseconds.
   * @default 1000
   */
  duration?: number;

  /**
   * Delay before each sweep starts in milliseconds.
   * @default 0
   */
  delay?: number;

  /**
   * Border radius applied to the placeholder box.
   * @default 0
   */
  borderRadius?: number;

  /** Style applied to the outer container in all states. */
  style?: StyleProp<ViewStyle>;

  /** Style applied to the children wrapper when `visible` is `true`. */
  contentStyle?: StyleProp<ViewStyle>;

  /** Style applied to the shimmer box when `visible` is `false`. */
  shimmerStyle?: StyleProp<ViewStyle>;

  /** Content to render when `visible` is `true`. */
  children?: ReactNode;
}

export interface ShimmerPlaceholderRef {
  /** Manually start the shimmer animation. */
  start: () => void;
  /** Manually stop the shimmer animation. */
  stop: () => void;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Builds the per-column opacity profile for the simulated gradient band.
 * The profile mimics [edge, centre, edge] = [low, high, low] using a
 * smooth bell curve so no hard edges are visible.
 */
function buildGradientProfile(
  colCount: number,
  colors: [string, string, string]
): Array<{ color: string; alpha: number }> {
  // Approximate the gradient by blending between the three colour stops.
  // We map each column index to a position in [0, 1] and sample the gradient.
  const result: Array<{ color: string; alpha: number }> = [];
  const mid = (colCount - 1) / 2;

  for (let i = 0; i < colCount; i++) {
    const t = i / (colCount - 1); // 0 → 1 across the band

    // Sample which colour stop we're closest to (0=edge, 0.5=centre, 1=edge)
    // Use the centre colour's dominance as the opacity multiplier
    let dominance: number;
    if (t <= 0.5) {
      dominance = t * 2; // 0 → 1 from left edge to centre
    } else {
      dominance = (1 - t) * 2; // 1 → 0 from centre to right edge
    }

    // Smooth the curve so the edges are very soft
    const smoothed = dominance * dominance * (3 - 2 * dominance); // smoothstep

    // Pick base colour — use the centre colour for bright columns, edge for dark
    const color = smoothed > 0.5 ? colors[1]! : colors[0]!;
    const alpha = 0.15 + smoothed * 0.85; // min 15% so edge is never invisible

    result.push({ color, alpha });
  }

  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

const COL_COUNT = 20; // number of vertical slices — more = smoother gradient
const BAND_RATIO = 0.6; // band width as a fraction of the placeholder width

function ShimmerPlaceholderComponent(
  {
    width = 200,
    height = 15,
    shimmerColors = ['#ebebeb', '#d0d0d0', '#ebebeb'],
    isReversed = false,
    stopAutoRun = false,
    visible = false,
    duration = 1000,
    delay = 0,
    borderRadius = 0,
    style,
    contentStyle,
    shimmerStyle,
    children,
  }: ShimmerPlaceholderProps,
  ref: ForwardedRef<ShimmerPlaceholderRef>
): React.ReactElement {
  const sweep = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [running, setRunning] = useState(false);

  // ── Gradient profile (only recomputed when colours change) ─────────────────
  const gradientProfile = useMemo(
    () => buildGradientProfile(COL_COUNT, shimmerColors as [string, string, string]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shimmerColors[0], shimmerColors[1], shimmerColors[2]]
  );

  const bandWidth = width * BAND_RATIO;
  const colWidth = bandWidth / COL_COUNT;

  // ── Translation: band sweeps from off-left to off-right (or reversed) ──────
  const translateX = useMemo(
    () =>
      sweep.interpolate({
        inputRange: [0, 1],
        outputRange: isReversed
          ? [width + bandWidth / 2, -bandWidth / 2]
          : [-bandWidth / 2, width + bandWidth / 2],
      }),
    [sweep, width, bandWidth, isReversed]
  );

  // ── Animation control ───────────────────────────────────────────────────────
  const start = useCallback(() => {
    loopRef.current?.stop();
    sweep.setValue(0);
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loopRef.current.start();
    setRunning(true);
  }, [sweep, duration, delay]);

  const stop = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    setRunning(false);
  }, []);

  useImperativeHandle(ref, () => ({ start, stop }), [start, stop]);

  // ── Auto-start / stop based on props ───────────────────────────────────────
  useEffect(() => {
    if (!stopAutoRun && !visible) {
      start();
    } else {
      stop();
    }
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAutoRun]);

  useEffect(() => {
    if (visible) {
      stop();
    } else if (!stopAutoRun) {
      start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View
      style={[
        !visible && { width, height },
        ss.root,
        !visible && { borderRadius },
        !visible && shimmerStyle,
        style,
      ]}
    >
      {/* Children — invisible (zero size) when loading, shown when visible */}
      <View
        style={[
          !visible && ss.hiddenChildren,
          visible && contentStyle,
        ]}
      >
        {children}
      </View>

      {/* Shimmer band — only rendered while loading */}
      {!visible && (
        <View
          style={[
            ss.track,
            { backgroundColor: shimmerColors[0] },
          ]}
        >
          <Animated.View
            style={[ss.band, { transform: [{ translateX }] }]}
          >
            {gradientProfile.map((col, i) => (
              <View
                key={i}
                style={{
                  width: colWidth,
                  height: '100%',
                  backgroundColor: col.color,
                  opacity: col.alpha,
                }}
              />
            ))}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  root: { overflow: 'hidden' },
  hiddenChildren: { width: 0, height: 0, opacity: 0 },
  track: { ...StyleSheet.absoluteFillObject },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
});

const ForwardedShimmerPlaceholder = forwardRef(ShimmerPlaceholderComponent);

/**
 * A fixed-size shimmer loading placeholder — no LinearGradient, no 3rd-party libs.
 *
 * Shows a sweeping highlight while `visible` is `false`, then reveals
 * its children once `visible` becomes `true`.
 *
 * **Drop-in replacement for `react-native-shimmer-placeholder`:**
 * same props, same behaviour, zero extra dependencies.
 *
 * @example
 * ```tsx
 * import { ShimmerPlaceholder } from 'react-native-auto-shimmer';
 *
 * // Simple text line placeholder
 * <ShimmerPlaceholder width={220} height={14} borderRadius={6} visible={loaded}>
 *   <Text>{title}</Text>
 * </ShimmerPlaceholder>
 *
 * // Avatar circle placeholder
 * <ShimmerPlaceholder width={48} height={48} borderRadius={24} visible={loaded}>
 *   <Image source={{ uri: avatarUrl }} style={styles.avatar} />
 * </ShimmerPlaceholder>
 *
 * // Custom colours
 * <ShimmerPlaceholder
 *   width={300} height={20}
 *   shimmerColors={['#1e1e2e', '#313244', '#1e1e2e']}
 *   visible={loaded}
 * >
 *   <Text>{subtitle}</Text>
 * </ShimmerPlaceholder>
 *
 * // Programmatic control
 * const ref = useRef<ShimmerPlaceholderRef>(null);
 * <ShimmerPlaceholder ref={ref} width={180} height={14} stopAutoRun>
 *   <Text>{data}</Text>
 * </ShimmerPlaceholder>
 * // ref.current?.start();
 * ```
 */
export const ShimmerPlaceholder = memo(ForwardedShimmerPlaceholder);
ShimmerPlaceholder.displayName = 'ShimmerPlaceholder';

/**
 * Factory function that mirrors the `createShimmerPlaceholder` API from
 * `react-native-shimmer-placeholder`. The `LinearGradient` argument is
 * accepted for API compatibility but is not used — the gradient is
 * simulated internally.
 *
 * @example
 * ```tsx
 * // Before (required LinearGradient)
 * import LinearGradient from 'react-native-linear-gradient';
 * import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
 * const ShimmerPlaceHolder = createShimmerPlaceholder(LinearGradient);
 *
 * // After (no LinearGradient needed)
 * import { createShimmerPlaceholder } from 'react-native-auto-shimmer';
 * const ShimmerPlaceHolder = createShimmerPlaceholder();
 * ```
 */
export function createShimmerPlaceholder(_LinearGradient?: unknown) {
  return ShimmerPlaceholder;
}

export default ShimmerPlaceholder;
