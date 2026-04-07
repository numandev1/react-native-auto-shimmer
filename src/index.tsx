// Core layout engine — pure JS, no native modules needed
export { computeLayout } from './layout';

// Type system
export type {
  AnySkeletonSkeleton,
  SkeletonSkeleton,
  CompactSkeletonSkeleton,
  ResponsiveSkeletons,
  ResponsiveDescriptor,
  SkeletonDescriptor,
  SkeletonResult,
} from './types';
export { normalizeSkeleton } from './types';

// Registry — register and look up pre-computed skeletons
export {
  configureSkeleton,
  lookupSkeletons,
  registerSkeletons,
  resolveResponsive,
  type SkeletonConfig,
} from './registry';

// Main React Native component
export { Skeleton, type AnimationStyle, type SkeletonProps } from './Skeleton';

// Dev-only runtime capture component — registers with the Skeleton Inspector DevTools panel.
// No-op in production builds.
export { SkeletonCapture, type SkeletonCaptureProps } from './SkeletonCapture';
