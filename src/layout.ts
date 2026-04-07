/**
 * Layout engine — pure JS, no DOM, no native modules.
 *
 * Takes a SkeletonDescriptor and a container width, then computes pixel-precise
 * skeleton positions using box-model arithmetic.
 *
 * Skeleton coordinate system:
 *   x, w  — percentages (0–100) of the ROOT container width (for responsive scaling)
 *   y, h  — absolute dp values from the root top (for precise alignment)
 *
 * Text height is approximate: fontSize * 0.52 per character. For exact skeletons,
 * measure text with onLayout and pass explicit width/height instead of `text`.
 */

import type { SkeletonSkeleton, SkeletonDescriptor, SkeletonResult } from './types';

interface Sides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function resolveSides(v: number | Partial<Sides> | undefined): Sides {
  if (v === undefined) return { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof v === 'number') return { top: v, right: v, bottom: v, left: v };
  return { top: v.top ?? 0, right: v.right ?? 0, bottom: v.bottom ?? 0, left: v.left ?? 0 };
}

/** Estimate average character width from a CSS-like font string. e.g. '700 18px Inter' → 9.36dp */
function estimateCharWidth(font: string | undefined): number {
  if (!font) return 7.3; // ~14px default
  const match = font.match(/(\d+(?:\.\d+)?)px/);
  const fontSize = match ? parseFloat(match[1]!) : 14;
  return fontSize * 0.52;
}

function measureTextHeight(text: string, font: string | undefined, lineHeight: number, contentWidth: number): number {
  if (contentWidth <= 0) return lineHeight;
  const totalWidth = text.length * estimateCharWidth(font);
  return Math.max(1, Math.ceil(totalWidth / contentWidth)) * lineHeight;
}

function measureIntrinsicWidth(text: string, font: string | undefined): number {
  return Math.ceil(text.length * estimateCharWidth(font)) + 1;
}

/**
 * Compute skeleton pieces from a descriptor at a given container width.
 * x and w in the output skeletons are percentages (0–100) of `width`.
 */
export function computeLayout(
  desc: SkeletonDescriptor,
  width: number,
  name: string = 'component'
): SkeletonResult {
  const skeletons: SkeletonSkeleton[] = [];
  // rootWidth is passed through every recursive call so percentages are always relative to it
  layoutNode(desc, 0, 0, width, width, skeletons);

  let maxBottom = 0;
  for (const b of skeletons) {
    const bottom = b.y + b.h;
    if (bottom > maxBottom) maxBottom = bottom;
  }

  return { name, viewportWidth: width, width, height: round(maxBottom), skeletons };
}

/**
 * Recursively lay out a node and its children, emitting skeleton pieces.
 *
 * @param offsetX      Absolute left position from the root container (dp)
 * @param offsetY      Absolute top position from the root container (dp)
 * @param availableWidth  Width available to this node for sizing (dp)
 * @param rootWidth    Width of the root container — used for ALL percentage calculations
 */
function layoutNode(
  desc: SkeletonDescriptor,
  offsetX: number,
  offsetY: number,
  availableWidth: number,
  rootWidth: number,
  skeletons: SkeletonSkeleton[]
): number {
  const pad = resolveSides(desc.padding);
  const mar = resolveSides(desc.margin);

  const nodeX = offsetX + mar.left;
  const nodeY = offsetY + mar.top;
  const nodeWidth = clampWidth(
    desc.width !== undefined ? Math.min(desc.width, availableWidth) : availableWidth,
    desc.maxWidth,
    availableWidth
  );

  const contentX = nodeX + pad.left;
  const contentY = nodeY + pad.top;
  const contentWidth = Math.max(0, nodeWidth - pad.left - pad.right);

  if (isLeaf(desc)) {
    const contentHeight = resolveLeafHeight(desc, contentWidth, pad);
    const totalHeight = contentHeight + pad.top + pad.bottom;

    // Shrink skeleton to intrinsic text width for single-line text
    let skeletonWidth = nodeWidth;
    if (desc.text && desc.font && desc.lineHeight && contentHeight < desc.lineHeight * 1.5) {
      const intrinsic = measureIntrinsicWidth(desc.text, desc.font);
      skeletonWidth = Math.min(intrinsic + pad.left + pad.right, nodeWidth);
    }

    // KEY: always divide by rootWidth so percentages are relative to the root container
    skeletons.push({
      x: round((nodeX / rootWidth) * 100),
      y: round(nodeY),
      w: round((skeletonWidth / rootWidth) * 100),
      h: round(totalHeight),
      r: desc.borderRadius ?? 8,
    });

    return totalHeight + mar.top + mar.bottom;
  }

  const children = desc.children ?? [];
  let innerHeight: number;
  const display = desc.display ?? 'block';
  const direction = desc.flexDirection ?? 'row';

  if (display === 'flex' && direction === 'row') {
    innerHeight = layoutFlexRow(desc, children, contentX, contentY, contentWidth, rootWidth, skeletons);
  } else if (display === 'flex' && direction === 'column') {
    innerHeight = layoutFlexColumn(desc, children, contentX, contentY, contentWidth, rootWidth, skeletons);
  } else {
    let y = 0;
    let prevMarBottom = 0;
    for (let i = 0; i < children.length; i++) {
      const childMar = resolveSides(children[i]!.margin);
      if (i > 0) y -= Math.min(prevMarBottom, childMar.top); // margin collapsing
      y += layoutNode(children[i]!, contentX, contentY + y, contentWidth, rootWidth, skeletons);
      prevMarBottom = childMar.bottom;
    }
    innerHeight = y;
  }

  return innerHeight + pad.top + pad.bottom + mar.top + mar.bottom;
}

function layoutFlexColumn(
  parent: SkeletonDescriptor,
  children: SkeletonDescriptor[],
  contentX: number,
  contentY: number,
  contentWidth: number,
  rootWidth: number,
  skeletons: SkeletonSkeleton[]
): number {
  const gap = parent.rowGap ?? parent.gap ?? 0;
  const align = parent.alignItems ?? 'stretch';
  let y = 0;

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;

    // Measure child's intrinsic width for cross-axis alignment
    let childX = contentX;
    let childAvailWidth = contentWidth;

    if (align === 'center' || align === 'flex-end' || align === 'flex-start') {
      // Measure the child's natural width by doing a dry run
      const childIntrinsicWidth = measureChildIntrinsicWidth(child, contentWidth, rootWidth);
      const clampedWidth = Math.min(childIntrinsicWidth, contentWidth);

      if (align === 'center') {
        childX = contentX + (contentWidth - clampedWidth) / 2;
      } else if (align === 'flex-end') {
        childX = contentX + (contentWidth - clampedWidth);
      }
      // flex-start: childX stays at contentX
      childAvailWidth = clampedWidth;
    }

    const h = layoutNode(child, childX, contentY + y, childAvailWidth, rootWidth, skeletons);
    y += h;
    if (i < children.length - 1 && h > 0) y += gap;
  }
  return y;
}

/**
 * Measure the intrinsic (content) width of a child node for cross-axis alignment in a column.
 * Returns the natural width the child would occupy — explicit width, text width, or full available.
 */
function measureChildIntrinsicWidth(
  child: SkeletonDescriptor,
  availableWidth: number,
  _rootWidth: number
): number {
  if (child.width !== undefined) {
    return Math.min(child.width, availableWidth);
  }
  if (child.text && child.font) {
    // Single-line text: intrinsic width
    return Math.min(measureIntrinsicWidth(child.text, child.font), availableWidth);
  }
  if (child.height !== undefined || child.aspectRatio !== undefined) {
    // Explicit leaf with no width — stretches to available
    return availableWidth;
  }
  // Container nodes (flex rows, etc.) — stretch to fill
  return availableWidth;
}

function layoutFlexRow(
  parent: SkeletonDescriptor,
  children: SkeletonDescriptor[],
  contentX: number,
  contentY: number,
  contentWidth: number,
  rootWidth: number,
  skeletons: SkeletonSkeleton[]
): number {
  if (children.length === 0) return 0;

  const gap = parent.columnGap ?? parent.gap ?? 0;
  const justify = parent.justifyContent ?? 'flex-start';
  const align = parent.alignItems ?? 'stretch';

  // Phase 1 — compute each child's width
  const childWidths: number[] = [];
  let totalFixed = 0;
  let flexCount = 0;

  for (const child of children) {
    if (child.width !== undefined) {
      const w = clampWidth(child.width, child.maxWidth, contentWidth);
      childWidths.push(w);
      totalFixed += w;
    } else if (isContentSized(child)) {
      const intrinsic = child.text ? measureIntrinsicWidth(child.text, child.font) : contentWidth;
      const w = clampWidth(intrinsic, child.maxWidth, contentWidth);
      childWidths.push(w);
      totalFixed += w;
    } else {
      childWidths.push(-1); // flex child
      flexCount++;
    }
  }

  const totalGaps = Math.max(0, children.length - 1) * gap;
  const remaining = Math.max(0, contentWidth - totalFixed - totalGaps);
  const flexWidth = flexCount > 0 ? remaining / flexCount : 0;

  for (let i = 0; i < childWidths.length; i++) {
    if ((childWidths[i] ?? 0) < 0) {
      childWidths[i] = clampWidth(flexWidth, children[i]!.maxWidth, contentWidth);
    }
  }

  // Phase 2 — measure child heights
  const childHeights: number[] = [];
  for (let i = 0; i < children.length; i++) {
    const temp: SkeletonSkeleton[] = [];
    childHeights.push(layoutNode(children[i]!, 0, 0, childWidths[i] ?? 0, rootWidth, temp));
  }
  const maxHeight = Math.max(...childHeights, 0);

  // Phase 3 — justify-content offset
  const totalUsed = childWidths.reduce((s, w) => s + w, 0) + totalGaps;
  let xStart = 0;
  let extraGap = 0;

  if (justify === 'flex-end') {
    xStart = Math.max(0, contentWidth - totalUsed);
  } else if (justify === 'center') {
    xStart = Math.max(0, (contentWidth - totalUsed) / 2);
  } else if (justify === 'space-between' && children.length > 1) {
    const totalChildWidth = childWidths.reduce((s, w) => s + w, 0);
    extraGap = Math.max(0, (contentWidth - totalChildWidth) / (children.length - 1)) - gap;
  }

  // Phase 4 — lay out children with cross-axis alignment
  let x = xStart;
  for (let i = 0; i < children.length; i++) {
    let yOff = 0;
    if (align === 'center') yOff = Math.max(0, (maxHeight - (childHeights[i] ?? 0)) / 2);
    else if (align === 'flex-end') yOff = Math.max(0, maxHeight - (childHeights[i] ?? 0));

    // NOTE: pass rootWidth (not childWidths[i]) so nested skeletons stay in root-relative percentages
    layoutNode(children[i]!, contentX + x, contentY + yOff, childWidths[i] ?? 0, rootWidth, skeletons);
    x += childWidths[i] ?? 0;
    if (i < children.length - 1) x += gap + extraGap;
  }

  return maxHeight;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isLeaf(desc: SkeletonDescriptor): boolean {
  if (desc.leaf === true) return true;
  if (desc.text !== undefined) return true;
  if (desc.height !== undefined && (!desc.children || desc.children.length === 0)) return true;
  if (desc.aspectRatio !== undefined && (!desc.children || desc.children.length === 0)) return true;
  return false;
}

function isContentSized(child: SkeletonDescriptor): boolean {
  if (child.width !== undefined) return false;
  return child.text !== undefined || child.leaf === true;
}

function resolveLeafHeight(desc: SkeletonDescriptor, contentWidth: number, pad: Sides): number {
  if (desc.text && desc.lineHeight) {
    return measureTextHeight(desc.text, desc.font, desc.lineHeight, contentWidth);
  }
  if (desc.height !== undefined) {
    return Math.max(0, desc.height - pad.top - pad.bottom);
  }
  if (desc.aspectRatio && desc.aspectRatio > 0 && isFinite(desc.aspectRatio)) {
    return contentWidth / desc.aspectRatio;
  }
  return 20;
}

function clampWidth(width: number, maxWidth: number | undefined, _parent: number): number {
  return maxWidth !== undefined ? Math.min(width, maxWidth) : width;
}

function round(n: number): number {
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
