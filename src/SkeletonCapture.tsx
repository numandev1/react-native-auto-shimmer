/**
 * SkeletonCapture — dev-only runtime skeleton capture component.
 *
 * Registers itself with the Skeleton Inspector DevTools panel (Rozenite).
 * When you click Capture in the panel, it measures the real native layout,
 * walks the fiber tree, and returns an array of SkeletonSkeleton objects.
 *
 * Usage:
 *   1. Wrap any component: <SkeletonCapture name="card"><MyCard /></SkeletonCapture>
 *      Place it INSIDE <Skeleton> so it measures visible content, not opacity-0 children.
 *   2. Open "Skeleton Inspector" in React Native DevTools → select → Capture → Save
 *
 * In production: this component is a transparent no-op View.
 */

import React from 'react';
import {
  StyleSheet,
  UIManager,
  View,
  findNodeHandle,
  type ViewStyle,
  type StyleProp,
  type MeasureOnSuccessCallback,
} from 'react-native';

const HOST_COMPONENT_TAG = 5;
const HOST_TEXT_TAG = 6;

// ── SkeletonSkeleton type (shared between capture and registry) ───────────────────

interface SkeletonSkeleton {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number | string;
  c?: boolean;
}

// ── Rozenite plugin registry bridge ──────────────────────────────────────────
// Stored on globalThis so it is shared across all module instances.
// The plugin's react-native.ts calls entry.capture() directly — no fiber
// walking needed on the plugin side, avoiding Fabric/Bridgeless fiber access issues.

export interface CaptureResult {
  name: string;
  viewportWidth: number;
  height: number;
  skeletons: SkeletonSkeleton[];
}

type RegistryEntry = { capture: () => Promise<CaptureResult> };
const REGISTRY_KEY = '__rnAutoShimmerCaptureRegistry__';

function getRegistry(): Map<string, RegistryEntry> {
  const g = globalThis as any;
  if (!g[REGISTRY_KEY]) {
    g[REGISTRY_KEY] = new Map<string, RegistryEntry>();
  }
  return g[REGISTRY_KEY];
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface SkeletonCaptureProps {
  /** Name shown in the Skeleton Inspector panel and used for the generated .skeletons.json file */
  name: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ── No-op in production ───────────────────────────────────────────────────────

function SkeletonCaptureNoop({ children, style }: SkeletonCaptureProps) {
  return <View style={style}>{children}</View>;
}

// ── Dev-mode capture ──────────────────────────────────────────────────────────

class SkeletonCaptureImpl extends React.PureComponent<SkeletonCaptureProps> {
  private containerRef = React.createRef<View>();

  componentDidMount() {
    this.registerWithPlugin();
  }

  componentWillUnmount() {
    getRegistry().delete(this.props.name);
  }

  private async doCapture(): Promise<CaptureResult> {
    const container = this.containerRef.current;
    if (!container) throw new Error('Container ref not attached yet');

    const rootRect = await measureAny(container);
    if (!rootRect || rootRect.w < 1 || rootRect.h < 1) {
      throw new Error('Container has zero size — is it rendered on screen?');
    }

    const fiber = getFiber(container);
    if (!fiber) throw new Error('React fiber not accessible on this node');

    // In Fabric, _internalFiberInstanceHandleDEV is the fiber for the host View itself.
    // We walk its children. If the fiber IS a host node (tag=5), start from fiber.child;
    // if it wrapped differently, start from fiber itself.
    const skeletons: SkeletonSkeleton[] = [];
    const startFiber = fiber.tag === HOST_COMPONENT_TAG ? fiber.child : fiber;
    await walkFiber(startFiber, rootRect, skeletons);

    return {
      name: this.props.name,
      viewportWidth: Math.round(rootRect.w),
      height: Math.round(rootRect.h),
      skeletons,
    };
  }

  private registerWithPlugin() {
    getRegistry().set(this.props.name, {
      capture: () => this.doCapture(),
    });
  }

  render() {
    return (
      <View ref={this.containerRef} style={this.props.style} collapsable={false}>
        {this.props.children}
      </View>
    );
  }
}

// ── Public export — no-op in production ──────────────────────────────────────

export const SkeletonCapture: React.ComponentType<SkeletonCaptureProps> =
  __DEV__ ? SkeletonCaptureImpl : SkeletonCaptureNoop;

// ── Shared measurement helpers ────────────────────────────────────────────────

function getFiber(instance: any): any {
  if (!instance) return null;

  // Fabric RN 0.76+ — ReactFabricHostComponent / ReactFabricPublicInstance.
  if (instance._internalInstanceHandle != null) {
    return instance._internalInstanceHandle;
  }
  if (instance.__internalInstanceHandle != null) {
    return instance.__internalInstanceHandle;
  }
  if (instance._internalFiberInstanceHandleDEV != null) {
    return instance._internalFiberInstanceHandleDEV;
  }
  if (instance.canonical?.internalInstanceHandle != null) {
    return instance.canonical.internalInstanceHandle;
  }
  // Legacy renderer
  if (instance._reactInternals != null) {
    return instance._reactInternals;
  }
  if (instance.__reactFiber != null) {
    return instance.__reactFiber;
  }
  if (instance._reactFiber != null) {
    return instance._reactFiber;
  }
  return null;
}

type Rect = { px: number; py: number; w: number; h: number };

/**
 * Measure a node using whatever API is available:
 * - Fabric (RN 0.76+): public instances have a .measure() method — use it directly.
 * - Legacy renderer: fall back to UIManager.measure(nativeTag).
 */
function measureAny(target: any): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!target) { resolve(null); return; }
    try {
      const cb: MeasureOnSuccessCallback = (_x, _y, w, h, px, py) => resolve({ px, py, w, h });

      if (typeof target.measure === 'function') {
        target.measure(cb);
        return;
      }
      const pub = target.canonical?.publicInstance;
      if (pub && typeof pub.measure === 'function') {
        pub.measure(cb);
        return;
      }
      const nh = typeof target === 'number' ? target : findNodeHandle(target as any);
      if (nh) {
        UIManager.measure(nh, cb);
        return;
      }
      resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function walkFiber(
  fiber: any,
  root: { px: number; py: number; w: number; h: number },
  skeletons: SkeletonSkeleton[]
): Promise<void> {
  if (!fiber) return;

  if (fiber.tag === HOST_COMPONENT_TAG) {
    const style = flattenStyle(fiber.memoizedProps?.style);

    // Skip hidden subtrees and the absoluteFill skeleton overlay
    if (style.opacity === 0 || style.display === 'none') {
      await walkFiber(fiber.sibling, root, skeletons);
      return;
    }
    if (fiber.memoizedProps?.pointerEvents === 'none' && style.position === 'absolute') {
      await walkFiber(fiber.sibling, root, skeletons);
      return;
    }

    const rect = await measureAny(fiber.stateNode);
    if (rect && rect.w >= 1 && rect.h >= 1) {
      const relX = rect.px - root.px;
      const relY = rect.py - root.py;

      if (relX < root.w && relY < root.h && relX > -rect.w && relY > -root.h) {
        const hasHostChildren = fiberHasHostChildren(fiber.child);
        const hasBg = hasBackground(style);
        const imgLike = isImageFiber(fiber);
        const r = resolveBorderRadius(style, rect.w, rect.h, imgLike);

        const skeleton: SkeletonSkeleton = {
          x: +(((relX / root.w) * 100).toFixed(3)),
          y: Math.round(relY),
          w: +(((rect.w / root.w) * 100).toFixed(3)),
          h: Math.round(rect.h),
          r,
        };

        if (!hasHostChildren) {
          skeletons.push(skeleton);
        } else if (hasBg) {
          skeletons.push({ ...skeleton, c: true });
        }
      }
    }
    await walkFiber(fiber.child, root, skeletons);
  } else if (fiber.tag !== HOST_TEXT_TAG) {
    await walkFiber(fiber.child, root, skeletons);
  }

  await walkFiber(fiber.sibling, root, skeletons);
}

function fiberHasHostChildren(fiber: any): boolean {
  if (!fiber) return false;
  if (fiber.tag === HOST_COMPONENT_TAG) return true;
  return fiberHasHostChildren(fiber.child) || fiberHasHostChildren(fiber.sibling);
}

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  try { return StyleSheet.flatten(style) ?? {}; } catch { return {}; }
}

function hasBackground(s: Record<string, any>): boolean {
  const bg = s.backgroundColor;
  if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false;
  return true;
}

function isImageFiber(fiber: any): boolean {
  const t = fiber.elementType ?? fiber.type;
  if (typeof t === 'string') return t.toLowerCase().includes('image');
  if (typeof t === 'function') return (t.displayName ?? t.name ?? '').toLowerCase().includes('image');
  return false;
}

function resolveBorderRadius(
  s: Record<string, any>,
  w: number,
  h: number,
  img: boolean
): number | string {
  const r = s.borderRadius ?? s.borderTopLeftRadius ?? 0;
  if (r >= 9999) return Math.abs(w - h) < 6 ? '50%' : 9999;
  const minSide = Math.min(w, h);
  if (r >= minSide * 0.45) return '50%';
  if (img && Math.abs(w - h) < 6 && r === 0) return '50%';
  return r === 0 ? 8 : r;
}
