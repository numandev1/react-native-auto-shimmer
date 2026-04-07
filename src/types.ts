/**
 * A single skeleton piece — a rounded rect placeholder.
 *
 * x and w are percentages (0–100) of the parent container width.
 * y and h are absolute pixel values.
 * r is border radius in dp, or '50%' for circles.
 * c marks a container skeleton (rendered lighter so child skeletons stand out).
 */
export interface SkeletonSkeleton {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number | string;
  /** True if this skeleton piece is a background container — rendered lighter so child skeletons stand out */
  c?: boolean;
}

/** Compact skeleton format for JSON: [x, y, w, h, r, c?] — c is omitted when false */
export type CompactSkeletonSkeleton =
  | [number, number, number, number, number | string]
  | [number, number, number, number, number | string, boolean];

/** Either format — runtime detects and normalises */
export type AnySkeletonSkeleton = SkeletonSkeleton | CompactSkeletonSkeleton;

/** Normalize a skeleton piece from either format to the object format */
export function normalizeSkeleton(b: AnySkeletonSkeleton): SkeletonSkeleton {
  if (Array.isArray(b)) {
    return { x: b[0], y: b[1], w: b[2], h: b[3], r: b[4], c: b[5] || undefined };
  }
  return b;
}

/** Skeleton layout result for a component at a specific container width */
export interface SkeletonResult {
  name: string;
  viewportWidth: number;
  width: number;
  height: number;
  skeletons: AnySkeletonSkeleton[];
}

/**
 * Describes a component's visual structure for skeleton generation.
 * Hand-author this to describe your component, then call `computeLayout(descriptor, width)`
 * to get skeleton positions at any container width — no capture step needed.
 *
 * @example
 * const card: SkeletonDescriptor = {
 *   display: 'flex', flexDirection: 'column', padding: 16, gap: 12,
 *   children: [
 *     { aspectRatio: 16/9 },
 *     { text: 'Title text here', font: '700 18px Inter', lineHeight: 24 },
 *     { text: 'Body text content', font: '14px Inter', lineHeight: 20 },
 *     { height: 44, borderRadius: 8 },
 *   ]
 * }
 */
export interface SkeletonDescriptor {
  /** Display mode (default: 'block') */
  display?: 'block' | 'flex';
  /** Flex direction (default: 'row') */
  flexDirection?: 'row' | 'column';
  /** Align items — cross-axis alignment */
  alignItems?: string;
  /** Justify content — main-axis alignment */
  justifyContent?: string;
  /** Explicit width in dp */
  width?: number;
  /** Explicit height in dp */
  height?: number;
  /** Aspect ratio (e.g. 16/9) — height = width / aspectRatio */
  aspectRatio?: number;
  /** Max width constraint in dp */
  maxWidth?: number;
  /** Padding — uniform or per-side */
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  /** Margin — uniform or per-side */
  margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
  /** Gap between flex children */
  gap?: number;
  /** Row gap (overrides gap for vertical axis in column flex) */
  rowGap?: number;
  /** Column gap (overrides gap for horizontal axis in row flex) */
  columnGap?: number;
  /** Border radius in dp. Use '50%' for circles/ovals */
  borderRadius?: number | string;
  /**
   * Sample text for height estimation.
   * Pair with `font` and `lineHeight` for best results.
   */
  text?: string;
  /**
   * Font string used for character-width estimation.
   * Format: '[weight] [size]px [family]' — e.g. '700 18px Inter'
   */
  font?: string;
  /** Line height in dp (required when `text` is set) */
  lineHeight?: number;
  /** Force this node to emit a single skeleton piece even if it has children */
  leaf?: boolean;
  /** Child descriptors */
  children?: SkeletonDescriptor[];
}

/**
 * A responsive descriptor — maps min-width breakpoints to structural variants.
 *
 * @example
 * const card: ResponsiveDescriptor = {
 *   0: { display: 'flex', flexDirection: 'column', ... },
 *   768: { display: 'flex', flexDirection: 'row', ... },
 * }
 */
export type ResponsiveDescriptor = Record<number, SkeletonDescriptor>;

/**
 * Responsive skeletons — a set of SkeletonResults captured at different container widths.
 * `<Skeleton>` picks the nearest matching breakpoint for the current container width.
 */
export interface ResponsiveSkeletons {
  breakpoints: Record<number, SkeletonResult>;
}
