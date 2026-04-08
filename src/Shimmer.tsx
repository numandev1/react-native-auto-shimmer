import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  memo,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
  type ReactElement,
  type ForwardedRef,
} from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Easing,
  AccessibilityInfo,
  AppState,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
  type AppStateStatus,
} from 'react-native';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Controls how the shimmer band scales vertically during the sweep.
 *
 * - `normal`  — band keeps a fixed height throughout the sweep
 * - `expand`  — band grows from a sliver to full height as it crosses
 * - `shrink`  — band starts full height and collapses to a sliver as it crosses
 */
export type ShimmerOverlayMode = 'normal' | 'expand' | 'shrink';

/**
 * When `mode` is `'expand'` or `'shrink'`, this pin determines where the
 * band anchors while scaling.
 */
export type ShimmerOverlayPosition = 'top' | 'center' | 'bottom';

/** Which way the band travels across the content. */
export type ShimmerOverlayDirection = 'left-to-right' | 'right-to-left';

/**
 * All configuration props accepted by `<ShimmerOverlay>`.
 *
 * @example
 * ```tsx
 * <ShimmerOverlay
 *   color="rgba(255, 215, 0, 0.6)"
 *   mode="expand"
 *   duration={1800}
 * >
 *   <PremiumCard />
 * </ShimmerOverlay>
 * ```
 */
export interface ShimmerOverlayProps {
  /** React content the shimmer effect will sweep over. */
  children: ReactNode;

  /**
   * Duration of one full sweep in milliseconds.
   * @default 1500
   */
  duration?: number;

  /**
   * Pause between sweeps in milliseconds.
   * @default 400
   */
  delay?: number;

  /**
   * How long to wait before the very first sweep begins.
   * Use this to stagger multiple `<ShimmerOverlay>` instances.
   * @default 0
   */
  initialDelay?: number;

  /**
   * Color of the sweep band — any React Native color string.
   * @default 'rgba(255, 255, 255, 0.8)'
   */
  color?: string;

  /**
   * Tilt of the band in degrees. `0` = perfectly vertical band.
   * @default 20
   */
  angle?: number;

  /**
   * Pixel width of the sweep band.
   * @default 60
   */
  bandWidth?: number;

  /**
   * Master opacity multiplier for the whole effect (0–1).
   * @default 1
   */
  opacity?: number;

  /**
   * Set to `false` to freeze the animation without unmounting.
   * @default true
   */
  active?: boolean;

  /** Extra styles forwarded to the wrapping container. */
  style?: StyleProp<ViewStyle>;

  /**
   * Custom easing for the sweep. Receives and returns a value in `[0, 1]`.
   * Falls back to a smooth material-style curve when omitted.
   */
  easing?: (t: number) => number;

  /**
   * Vertical scaling behaviour of the band.
   * @default 'normal'
   */
  mode?: ShimmerOverlayMode;

  /**
   * Anchor point used when `mode` is `'expand'` or `'shrink'`.
   * @default 'center'
   */
  position?: ShimmerOverlayPosition;

  /**
   * Travel direction of the sweep band.
   * @default 'left-to-right'
   */
  direction?: ShimmerOverlayDirection;

  /**
   * How many sweeps to run. Pass `-1` for an infinite loop.
   * @default -1
   */
  iterations?: number;

  /**
   * Fired once at the very start of the first sweep.
   * Not called again on subsequent iterations.
   */
  onAnimationStart?: () => void;

  /**
   * Fired after the final iteration completes.
   * Never fires when `iterations` is `-1`.
   */
  onAnimationComplete?: () => void;

  /**
   * Fired after each individual sweep completes.
   * The argument is the 1-based iteration index.
   */
  onIterationComplete?: (count: number) => void;

  /** `testID` forwarded to the outer container for Detox / RNTL. */
  testID?: string;

  /** VoiceOver / TalkBack label for the container. */
  accessibilityLabel?: string;

  /** @default true */
  accessible?: boolean;

  /**
   * Automatically disable the animation when the OS "Reduce Motion"
   * accessibility setting is turned on.
   * @default true
   */
  respectReduceMotion?: boolean;

  /**
   * Suspend the animation while the app is backgrounded to save battery.
   * @default true
   */
  pauseOnBackground?: boolean;
}

/**
 * Imperative handle returned when you attach a `ref` to `<ShimmerOverlay>`.
 *
 * @example
 * ```tsx
 * const ref = useRef<ShimmerOverlayRef>(null);
 *
 * ref.current?.start();
 * ref.current?.stop();
 * ref.current?.restart();
 * if (ref.current?.isAnimating()) { ... }
 * ```
 */
export interface ShimmerOverlayRef {
  /** Begin the sweep animation. No-op if it is already running. */
  start: () => void;
  /** Halt the animation immediately. */
  stop: () => void;
  /** Stop, reset to the beginning, and restart. */
  restart: () => void;
  /** `true` while a sweep is in progress. */
  isAnimating: () => boolean;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

interface BandSlice {
  /** Fraction of the total band height this slice occupies. */
  fraction: number;
  /** Opacity of this slice (0–1). */
  alpha: number;
}

/**
 * Builds a stack of thin horizontal slices that together form the sweep band.
 * The top and bottom edges fade in/out; the middle stays fully opaque.
 *
 * `edgeFade` controls what fraction of the total height is consumed by the
 * fade region at each end (so `2 * edgeFade` total).
 */
function buildBandSlices(edgeFade: number): BandSlice[] {
  const FADE_STEPS = 5;
  const coreFraction = 1 - edgeFade * 2;
  const slices: BandSlice[] = [];

  // Leading fade-in edge
  for (let i = 0; i < FADE_STEPS; i++) {
    const progress = (i + 1) / FADE_STEPS;
    slices.push({ fraction: edgeFade / FADE_STEPS, alpha: progress * progress });
  }

  // Solid core
  slices.push({ fraction: coreFraction, alpha: 1 });

  // Trailing fade-out edge
  for (let i = FADE_STEPS - 1; i >= 0; i--) {
    const progress = (i + 1) / FADE_STEPS;
    slices.push({ fraction: edgeFade / FADE_STEPS, alpha: progress * progress });
  }

  return slices;
}

/**
 * Returns per-column opacity values for `colCount` vertical strips that make
 * up the band. The profile is brightest in the centre and rolls off toward
 * the edges with a multi-zone curve.
 */
function buildColumnProfile(colCount: number): number[] {
  const profile: number[] = [];
  const mid = (colCount - 1) / 2;

  for (let i = 0; i < colCount; i++) {
    const d = Math.abs(i - mid) / mid; // 0 at centre, 1 at edge
    let a: number;
    if (d < 0.15) {
      a = 1;
    } else if (d < 0.3) {
      a = 1 - ((d - 0.15) / 0.15) * 0.6;
    } else {
      const t = (d - 0.3) / 0.7;
      a = 0.4 * (1 - t) * (1 - t);
    }
    profile.push(Math.max(0, a));
  }

  return profile;
}

// The band is rendered taller than the container so the skew doesn't expose
// the background at the top / bottom corners.
const BAND_OVERFLOW = 1.5; // ratio: bandHeight = containerHeight * BAND_OVERFLOW
const STATIC_EDGE_FADE = (BAND_OVERFLOW - 1) / BAND_OVERFLOW / 2;

const STATIC_SLICES = buildBandSlices(STATIC_EDGE_FADE); // for 'normal' mode
const DYNAMIC_SLICES = buildBandSlices(0.25);            // for 'expand'/'shrink'

// ── Component ─────────────────────────────────────────────────────────────────

function ShimmerOverlayComponent(
  {
    children,
    duration = 1500,
    delay = 400,
    color = 'rgba(255, 255, 255, 0.8)',
    angle = 20,
    bandWidth = 60,
    opacity: masterOpacity = 1,
    active = true,
    style,
    easing,
    mode = 'normal',
    position = 'center',
    direction = 'left-to-right',
    iterations = -1,
    initialDelay = 0,
    onAnimationStart,
    onAnimationComplete,
    onIterationComplete,
    testID,
    accessibilityLabel,
    accessible = true,
    respectReduceMotion = true,
    pauseOnBackground = true,
  }: ShimmerOverlayProps,
  ref: ForwardedRef<ShimmerOverlayRef>
): ReactElement {
  // ── State & refs ────────────────────────────────────────────────────────────
  const progress = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appForegrounded, setAppForegrounded] = useState(true);

  const sweepRef = useRef<ReturnType<typeof Animated.sequence> | null>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sweepCount = useRef(0);
  const running = useRef(false);

  const fallbackEasing = useMemo(() => Easing.bezier(0.4, 0, 0.2, 1), []);

  // ── System listeners ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!pauseOnBackground) return;
    const onStateChange = (s: AppStateStatus) => setAppForegrounded(s === 'active');
    const sub = AppState.addEventListener('change', onStateChange);
    return () => sub.remove();
  }, [pauseOnBackground]);

  useEffect(() => {
    if (!respectReduceMotion) { setReduceMotion(false); return; }
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduceMotion(v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (alive) setReduceMotion(v);
    });
    return () => { alive = false; sub.remove(); };
  }, [respectReduceMotion]);

  // ── Animation control ───────────────────────────────────────────────────────

  const cancel = useCallback(() => {
    running.current = false;
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    sweepRef.current?.stop();
    sweepRef.current = null;
  }, []);

  const reset = useCallback(() => {
    cancel();
    progress.setValue(0);
    // nudge state to re-trigger the start effect
    setSize((s) => ({ ...s }));
  }, [cancel, progress]);

  useImperativeHandle(ref, () => ({
    start: () => { if (!running.current && size.w > 0) setSize((s) => ({ ...s })); },
    stop: cancel,
    restart: reset,
    isAnimating: () => running.current,
  }), [cancel, reset, size.w]);

  const launchSweeps = useCallback(() => {
    if (!active || size.w === 0 || reduceMotion || !appForegrounded) return;

    cancel();
    progress.setValue(0);
    sweepCount.current = 0;
    running.current = true;

    const oneSweep = () =>
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration,
          useNativeDriver: true,
          easing: easing ?? fallbackEasing,
        }),
        Animated.delay(delay),
      ]);

    const tick = () => {
      if (!running.current) return;
      progress.setValue(0);
      sweepRef.current = oneSweep();
      sweepRef.current.start(({ finished }) => {
        if (!finished || !running.current) return;
        sweepCount.current += 1;
        onIterationComplete?.(sweepCount.current);
        if (iterations === -1 || sweepCount.current < iterations) {
          tick();
        } else {
          running.current = false;
          onAnimationComplete?.();
        }
      });
    };

    const go = () => {
      if (!running.current) return;
      onAnimationStart?.();
      tick();
    };

    if (initialDelay > 0) {
      startTimerRef.current = setTimeout(go, initialDelay);
    } else {
      go();
    }
  }, [
    active, size.w, reduceMotion, appForegrounded,
    duration, delay, initialDelay, easing, fallbackEasing,
    iterations, onAnimationStart, onAnimationComplete, onIterationComplete,
    cancel, progress,
  ]);

  useEffect(() => {
    launchSweeps();
    return cancel;
  }, [launchSweeps, cancel]);

  // ── Layout ──────────────────────────────────────────────────────────────────

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  // ── Derived geometry ────────────────────────────────────────────────────────

  // Extra horizontal travel needed so the skewed band fully clears the edges
  const angleOvershoot = useMemo(
    () => Math.tan((angle * Math.PI) / 180) * 200,
    [angle]
  );

  const sweepsRight = direction === 'left-to-right';

  const bandTranslateX = useMemo(
    () => progress.interpolate({
      inputRange: [0, 1],
      outputRange: sweepsRight
        ? [-bandWidth - angleOvershoot, size.w + bandWidth]
        : [size.w + bandWidth, -bandWidth - angleOvershoot],
    }),
    [progress, sweepsRight, bandWidth, angleOvershoot, size.w]
  );

  // The band is taller than the container to hide skew artefacts at corners
  const bandHeight = size.h * BAND_OVERFLOW;

  const bandScaleY = useMemo((): Animated.AnimatedInterpolation<number> | number => {
    if (mode === 'normal') return 1;
    const range = mode === 'expand' ? [0.01, 1] : [1, 0.01];
    return progress.interpolate({ inputRange: [0, 1], outputRange: range });
  }, [mode, progress]);

  // Translate the scale pivot away from the default (centre) to honour `position`
  const scalePivotShift = useMemo((): number => {
    if (mode === 'normal' || position === 'center') return 0;
    const half = bandHeight / 2;
    return position === 'top' ? -half : half;
  }, [mode, position, bandHeight]);

  // How many vertical columns make up the band cross-section
  const colCount = useMemo(() => Math.max(7, Math.round(bandWidth / 5)), [bandWidth]);
  const colWidth = useMemo(() => bandWidth / colCount, [bandWidth, colCount]);
  const colProfile = useMemo(() => buildColumnProfile(colCount), [colCount]);

  const columns = useMemo(
    () => colProfile.map((alpha, i) => ({
      alpha,
      offset: i * colWidth - bandWidth / 2 + colWidth / 2,
    })),
    [colProfile, colWidth, bandWidth]
  );

  const isScaled = mode !== 'normal';
  const slices = isScaled ? DYNAMIC_SLICES : STATIC_SLICES;

  const sliceData = useMemo(
    () => slices.map((s) => ({
      h: bandHeight * s.fraction,
      bg: color,
      baseAlpha: s.alpha,
    })),
    [slices, bandHeight, color]
  );

  // Memoised composite styles
  const overlayStyle = useMemo(
    () => [ss.overlay, { transform: [{ translateX: bandTranslateX }], opacity: masterOpacity }],
    [bandTranslateX, masterOpacity]
  );

  const tiltWrapStyle = useMemo(
    () => [ss.tiltWrap, {
      width: bandWidth,
      height: bandHeight,
      transform: [{ skewX: `${-angle}deg` }],
    }],
    [bandWidth, bandHeight, angle]
  );

  const getColStyle = useCallback(
    (offset: number) => [
      ss.column,
      {
        width: colWidth + 0.5,
        height: bandHeight,
        left: offset,
        transform: isScaled
          ? [
              { translateY: scalePivotShift },
              { scaleY: bandScaleY as Animated.AnimatedInterpolation<number> },
              { translateY: -scalePivotShift },
            ]
          : [],
      },
    ],
    [colWidth, bandHeight, isScaled, scalePivotShift, bandScaleY]
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const showBand =
    active && !reduceMotion && appForegrounded && size.w > 0 && size.h > 0;

  return (
    <View
      style={[ss.root, style]}
      onLayout={onLayout}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessible={accessible}
    >
      {children}
      {showBand && (
        <Animated.View style={overlayStyle} pointerEvents="none">
          <View style={tiltWrapStyle}>
            {columns.map((col, ci) => (
              <Animated.View key={ci} style={getColStyle(col.offset)}>
                {sliceData.map((slice, si) => (
                  <View
                    key={si}
                    style={[
                      ss.slice,
                      {
                        height: slice.h,
                        backgroundColor: slice.bg,
                        opacity: col.alpha * slice.baseAlpha,
                      },
                    ]}
                  />
                ))}
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root: { position: 'relative', overflow: 'hidden' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tiltWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: { position: 'absolute', flexDirection: 'column' },
  slice: { width: '100%' },
});

// ── Export ────────────────────────────────────────────────────────────────────

const _ShimmerOverlay = forwardRef(ShimmerOverlayComponent);

/**
 * A sweep-highlight effect that works on any React Native content.
 *
 * Wrap any element — a card, image, button, or entire screen section —
 * to add a configurable diagonal shine that sweeps across it.
 *
 * **Differs from `<Skeleton>`:** `ShimmerOverlay` does not manage loading
 * state or placeholder layout. It is purely a visual layer you can apply
 * to real, already-rendered content.
 *
 * @example
 * ```tsx
 * // Shine over a card
 * <ShimmerOverlay>
 *   <ArticleCard />
 * </ShimmerOverlay>
 *
 * // Gold highlight on a premium button
 * <ShimmerOverlay color="rgba(255, 200, 0, 0.65)" mode="expand" duration={2000}>
 *   <PremiumButton />
 * </ShimmerOverlay>
 *
 * // Stagger a list — each row starts 150 ms after the previous
 * {rows.map((row, i) => (
 *   <ShimmerOverlay key={row.id} initialDelay={i * 150}>
 *     <ListRow data={row} />
 *   </ShimmerOverlay>
 * ))}
 *
 * // Programmatic control
 * const ref = useRef<ShimmerOverlayRef>(null);
 * <ShimmerOverlay ref={ref} active={false}>
 *   <Banner />
 * </ShimmerOverlay>
 * // ref.current?.start();
 * ```
 */
export const ShimmerOverlay = memo(_ShimmerOverlay);
ShimmerOverlay.displayName = 'ShimmerOverlay';

export default ShimmerOverlay;
