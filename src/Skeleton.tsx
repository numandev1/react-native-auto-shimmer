import React, { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  useColorScheme,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { usePulseAnimation } from './animations/pulse';
import { useShimmerAnimation } from './animations/shimmer';
import { getGlobalConfig, lookupSkeletons, resolveResponsive } from './registry';
import { normalizeSkeleton, type AnySkeletonSkeleton, type SkeletonSkeleton, type ResponsiveSkeletons, type SkeletonResult } from './types';

export type AnimationStyle = 'pulse' | 'shimmer' | 'solid' | boolean;

export interface SkeletonProps {
  /** Show skeleton when true, real content when false */
  loading: boolean;
  /** Your component — rendered when not loading */
  children: ReactNode;
  /**
   * Registry name. Match the key you passed to `registerSkeletons({ [name]: skeletonData })`.
   * Auto-resolves skeletons so you don't need to pass `initialSkeletons` or `skeletons`.
   */
  name?: string;
  /**
   * Pre-computed skeletons (a single SkeletonResult or a ResponsiveSkeletons breakpoint map).
   * Takes priority over the `name` registry lookup.
   */
  initialSkeletons?: SkeletonResult | ResponsiveSkeletons;
  /**
   * A SkeletonResult produced by `computeLayout(descriptor, width)`.
   * Use this when you compute skeletons dynamically in your component.
   */
  skeletons?: SkeletonResult;
  /** Skeleton color for light mode. Default: 'rgba(0,0,0,0.08)' */
  color?: string;
  /** Skeleton color for dark mode. Default: 'rgba(255,255,255,0.06)' */
  darkColor?: string;
  /** Animation: 'pulse' (default), 'shimmer', 'solid', or boolean (true=pulse, false=solid) */
  animate?: AnimationStyle;
  /** Additional style for the wrapper View */
  style?: StyleProp<ViewStyle>;
  /**
   * Rendered when loading=true but no skeletons are available.
   * Use for a generic fallback (e.g. ActivityIndicator, simple placeholder rows).
   */
  fallback?: ReactNode;
}

// ── Colour helpers ────────────────────────────────────────────────────────────

/**
 * Make a skeleton colour slightly darker (for container skeletons that sit behind leaf skeletons).
 * - rgba: increase opacity so the translucent dark overlay becomes more visible
 * - hex:  lerp each channel toward a darker shade (multiply toward 0)
 */
function adjustColor(color: string, amount: number): string {
  // rgba(r,g,b,a) — increase alpha to make overlay more opaque/darker
  const rgbaMatch = color.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/
  );
  if (rgbaMatch) {
    const a = parseFloat(rgbaMatch[4] ?? '1');
    const newAlpha = Math.min(1, a + amount * 0.5);
    return `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},${newAlpha.toFixed(3)})`;
  }
  // hex #rrggbb — lerp each channel toward black
  if (color.startsWith('#') && color.length >= 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const darken = (v: number) => Math.round(v * (1 - amount * 0.3));
      return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
    }
  }
  return color;
}

// ── SkeletonPieceView ─────────────────────────────────────────────────────────

interface SkeletonPieceViewProps {
  piece: SkeletonSkeleton;
  color: string;
  isDark: boolean;
  animStyle: 'pulse' | 'shimmer' | 'solid';
  pulseOpacity: Animated.Value;
  shimmerProgress: Animated.Value;
  containerWidth: number;
}

const SkeletonPieceView = React.memo(function SkeletonPieceView({
  piece,
  color,
  isDark,
  animStyle,
  pulseOpacity,
  shimmerProgress,
  containerWidth,
}: SkeletonPieceViewProps) {
  // Container skeletons (c=true) are rendered slightly darker so they visually sit
  // behind leaf skeletons — adjustColor increases alpha for rgba, lerps toward darker for hex.
  const skeletonColor = piece.c ? adjustColor(color, isDark ? 0.03 : 0.45) : color;

  // Shimmer highlight — always a white overlay so it brightens the skeleton.
  const shimmerHighlight = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.65)';

  // RN supports percentage strings for left/width in absolute layouts
  const left = `${piece.x}%` as `${number}%`;
  const width = `${piece.w}%` as `${number}%`;
  const top = piece.y;
  const height = piece.h;

  // '50%' border-radius → half of height in dp (RN doesn't support % border-radius)
  const borderRadius = piece.r === '50%' ? height / 2 : (piece.r as number);

  if (animStyle === 'pulse') {
    return (
      <Animated.View
        style={[
          styles.skeletonPiece,
          { left, width, top, height, borderRadius, backgroundColor: skeletonColor, opacity: pulseOpacity },
        ]}
      />
    );
  }

  if (animStyle === 'shimmer') {
    // A white highlight band slides left→right inside each skeleton piece (overflow:'hidden' clips it).
    // All pieces share the same Animated.Value → the sweep is perfectly synchronised
    // across the entire skeleton, creating the illusion of one band of light.
    const skeletonWidthPx = (piece.w / 100) * containerWidth;
    const bandWidth = Math.max(40, skeletonWidthPx * 0.45);

    const translateX = shimmerProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [-bandWidth, skeletonWidthPx + bandWidth],
    });

    return (
      <View
        style={[
          styles.skeletonPiece,
          { left, width, top, height, borderRadius, backgroundColor: skeletonColor, overflow: 'hidden' },
        ]}
      >
        <Animated.View
          style={[
            styles.shimmerBand,
            { width: bandWidth, backgroundColor: shimmerHighlight, transform: [{ translateX }] },
          ]}
        />
      </View>
    );
  }

  // solid — no animation
  return (
    <View style={[styles.skeletonPiece, { left, width, top, height, borderRadius, backgroundColor: skeletonColor }]} />
  );
});

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({
  loading,
  children,
  name,
  initialSkeletons,
  skeletons: skeletonsProp,
  color,
  darkColor,
  animate,
  style,
  fallback,
}: SkeletonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [containerWidth, setContainerWidth] = useState(0);
  const prevChildRef = useRef<ReactNode>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(Math.round(e.nativeEvent.layout.width));
  }, []);

  // Resolve config (prop > global > default)
  const globalConfig = getGlobalConfig();
  const effectiveColor = color ?? globalConfig.color ?? 'rgba(0,0,0,0.08)';
  const effectiveDarkColor = darkColor ?? globalConfig.darkColor ?? 'rgba(255,255,255,0.06)';
  const resolvedColor = isDark ? effectiveDarkColor : effectiveColor;

  const rawAnimate = animate ?? globalConfig.animate ?? 'pulse';
  const animStyle: 'pulse' | 'shimmer' | 'solid' =
    rawAnimate === true ? 'pulse' : rawAnimate === false ? 'solid' : rawAnimate;

  // Animations — always created, active only when relevant
  const pulseOpacity = usePulseAnimation(loading && animStyle === 'pulse');
  const shimmerProgress = useShimmerAnimation(loading && animStyle === 'shimmer');

  // Skeleton resolution: direct prop > initialSkeletons > registry lookup
  const effectiveSkeletons: SkeletonResult | ResponsiveSkeletons | undefined =
    skeletonsProp ?? initialSkeletons ?? (name ? lookupSkeletons(name) : undefined);

  const activeSkeletons: SkeletonResult | null =
    effectiveSkeletons && containerWidth > 0
      ? resolveResponsive(effectiveSkeletons, containerWidth)
      : null;

  const showSkeleton = loading && activeSkeletons !== null;
  const showFallback = loading && activeSkeletons === null;

  // Keep last valid children so we never flash empty content when toggling
  if (!loading && children !== null && children !== undefined) {
    prevChildRef.current = children;
  }

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {/* Real content — hidden (opacity 0) while skeleton is active */}
      <View style={showSkeleton ? styles.hidden : styles.visible}>
        {showFallback ? fallback : (children ?? prevChildRef.current)}
      </View>

      {showSkeleton && containerWidth > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {(activeSkeletons!.skeletons as AnySkeletonSkeleton[]).map((raw, i) => (
            <SkeletonPieceView
              key={i}
              piece={normalizeSkeleton(raw)}
              color={resolvedColor}
              isDark={isDark}
              animStyle={animStyle}
              pulseOpacity={pulseOpacity}
              shimmerProgress={shimmerProgress}
              containerWidth={containerWidth}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
  skeletonPiece: { position: 'absolute' },
  shimmerBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    opacity: 0.7,
  },
});
