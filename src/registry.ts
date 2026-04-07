import type { ResponsiveSkeletons, SkeletonResult } from './types';

export interface SkeletonConfig {
  /** Skeleton color for light mode. Default: 'rgba(0,0,0,0.08)' */
  color?: string;
  /** Skeleton color for dark mode. Default: 'rgba(255,255,255,0.06)' */
  darkColor?: string;
  /** Animation style. Default: 'pulse' */
  animate?: 'pulse' | 'shimmer' | 'solid' | boolean;
}

let _globalConfig: SkeletonConfig = {};

/** Set global defaults for all <Skeleton> components. Individual props override these. */
export function configureSkeleton(config: SkeletonConfig): void {
  _globalConfig = { ..._globalConfig, ...config };
}

export function getGlobalConfig(): SkeletonConfig {
  return _globalConfig;
}

const _registry = new Map<string, SkeletonResult | ResponsiveSkeletons>();

/**
 * Register pre-computed skeletons so `<Skeleton name="...">` can look them up automatically.
 *
 * Import your JSON files and register them once in your app entry:
 *
 * ```ts
 * import cardSkeleton from './skeletons/card.skeletons.json'
 * import postSkeleton from './skeletons/post.skeletons.json'
 *
 * registerSkeletons({ card: cardSkeleton, post: postSkeleton })
 * ```
 *
 * Then use by name:
 * ```tsx
 * <Skeleton name="card" loading={isLoading}>
 *   <Card />
 * </Skeleton>
 * ```
 */
export function registerSkeletons(map: Record<string, SkeletonResult | ResponsiveSkeletons>): void {
  for (const [name, skeletons] of Object.entries(map)) {
    _registry.set(name, skeletons);
  }
}

export function lookupSkeletons(name: string): SkeletonResult | ResponsiveSkeletons | undefined {
  return _registry.get(name);
}

/** Pick the best-matching SkeletonResult for the current container width */
export function resolveResponsive(
  skeletons: SkeletonResult | ResponsiveSkeletons,
  width: number
): SkeletonResult | null {
  if (!('breakpoints' in skeletons)) return skeletons;
  const bps = Object.keys(skeletons.breakpoints)
    .map(Number)
    .sort((a, b) => a - b);
  if (bps.length === 0) return null;
  const match = [...bps].reverse().find((bp) => width >= bp) ?? bps[0];
  return (match !== undefined ? skeletons.breakpoints[match] : null) ?? null;
}
