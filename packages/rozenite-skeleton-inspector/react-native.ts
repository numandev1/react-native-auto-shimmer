/**
 * Rozenite plugin — React Native side
 *
 * Flow:
 *   1. Panel connects → this module starts broadcasting mounted SkeletonCapture names every 2s
 *   2. Panel clicks "Capture" → sends capture-request
 *   3. This module calls entry.capture() on the SkeletonCapture instance
 *      (measurement + fiber walk runs inside SkeletonCapture, which has direct
 *       access to the component's ref and fiber — no cross-module fiber access needed)
 *   4. Sends capture-result back to the panel (visual overlay)
 *   5. Panel clicks "Save" → sends save-request
 *   6. This module POSTs to Metro's /skeleton-save endpoint
 *   7. Metro writes the .skeletons.json file to disk
 *
 * New features:
 *   - capture-result now includes per-piece `label` (from classifyPiece)
 *   - skeleton-drift: auto-diff on each capture against saved registry breakpoint
 *   - capture-all-request: bulk capture every registered component sequentially
 *   - agent tools: capture + save registered as Rozenite agent-callable tools
 */

import type { DevToolsPluginClient } from '@rozenite/plugin-bridge';
import { NativeModules } from 'react-native';

// Read the capture registry from globalThis — same key used by SkeletonCapture.tsx.
const REGISTRY_KEY = '__rnAutoShimmerCaptureRegistry__';
// Saved skeletons registry (from registerSkeletons calls in the app)
const SAVED_REGISTRY_KEY = '__rnAutoShimmerSavedRegistry__';

export interface SkeletonPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number | string;
  c?: boolean;
}

interface CaptureResult {
  name: string;
  viewportWidth: number;
  height: number;
  skeletons: SkeletonPiece[];
}

interface RegistryEntry {
  capture: () => Promise<CaptureResult>;
}

function getRegistry(): Map<string, RegistryEntry> {
  const g = globalThis as any;
  if (!g[REGISTRY_KEY]) g[REGISTRY_KEY] = new Map<string, RegistryEntry>();
  return g[REGISTRY_KEY];
}

// Attempt to read saved skeletons from the app's registry (registerSkeletons calls)
function getSavedSkeletons(name: string): any | null {
  try {
    const g = globalThis as any;
    const saved = g[SAVED_REGISTRY_KEY];
    if (saved && typeof saved.get === 'function') return saved.get(name) ?? null;
    // Also try the standard lookupSkeletons export path
    const pkg = g.__rnAutoShimmerLookup__;
    if (typeof pkg === 'function') return pkg(name) ?? null;
  } catch {}
  return null;
}

export const PLUGIN_ID = 'react-native-auto-shimmer';

// ── Event map ────────────────────────────────────────────────────────────────

export interface PluginEvents {
  // Capture
  'capture-request': { name: string };
  'capture-result': {
    name: string;
    viewportWidth: number;
    height: number;
    skeletons: SkeletonPiece[];
    labels: string[];       // NEW: per-piece label from classifyPiece
    error?: string;
  };
  'capture-all-request': Record<string, never>;  // NEW: bulk capture all
  'capture-all-result': {                         // NEW: bulk capture result
    results: Array<{
      name: string;
      ok: boolean;
      skeletonCount: number;
      error?: string;
    }>;
  };

  // Registry broadcast
  'registered-components': {
    names: string[];
    driftMap: Record<string, boolean>; // NEW: name → true if drift detected
  };

  // Drift notification
  'skeleton-drift': {                  // NEW
    name: string;
    viewportWidth: number;
    diffCount: number;
    threshold: number;
  };

  // Save JSON
  'save-request': {
    name: string;
    outDir: string;
    /** All captured breakpoints — keyed by viewport width in dp */
    allBreakpoints: Record<number, { viewportWidth: number; height: number; skeletons: SkeletonPiece[] }>;
  };
  'save-result': {
    ok: boolean;
    file?: string;
    skeletons?: number;
    breakpointCount?: number;
    error?: string;
  };

  // Save TypeScript descriptor
  'save-descriptor-request': {
    name: string;
    outDir: string;
    /** All captured breakpoints — keyed by viewport width in dp */
    allBreakpoints: Record<number, { viewportWidth: number; height: number; skeletons: SkeletonPiece[] }>;
  };
  'save-descriptor-result': {
    ok: boolean;
    file?: string;
    breakpointCount?: number;
    error?: string;
  };
}

// ── Piece classification (shared by capture-result and descriptor generator) ─

function classifyPiece(s: SkeletonPiece, _viewportWidth: number, idx: number): string {
  const wPct = s.w;
  const isCircle = s.r === '50%';
  const isFullWidth = wPct > 85;
  const isWide = wPct > 50;
  const isTall = s.h > 100;
  const isContainer = !!s.c;

  if (isContainer && isCircle) return `piece ${idx} — button container`;
  if (isContainer) return `piece ${idx} — container (background layer)`;
  if (isCircle && s.h >= 60) return `piece ${idx} — avatar circle`;
  if (isCircle && s.h >= 30) return `piece ${idx} — icon circle`;
  if (isCircle) return `piece ${idx} — small circle`;
  if (isTall && isFullWidth) return `piece ${idx} — hero image / banner`;
  if (isTall && isWide) return `piece ${idx} — image`;
  if (isFullWidth && s.h >= 36) return `piece ${idx} — block (button / card section)`;
  if (isFullWidth && s.h >= 20) return `piece ${idx} — text line (full width)`;
  if (isFullWidth) return `piece ${idx} — thin line`;
  if (isWide && s.h >= 36) return `piece ${idx} — block`;
  if (isWide && s.h <= 25) return `piece ${idx} — text line`;
  if (wPct < 20 && s.h <= 15) return `piece ${idx} — timestamp / label`;
  if (wPct < 20) return `piece ${idx} — small element`;
  if (s.h <= 20) return `piece ${idx} — text line`;
  return `piece ${idx}`;
}

// Short label for canvas badges (strip "piece N — " prefix)
function shortLabel(full: string): string {
  const m = full.match(/— (.+)$/);
  return m ? m[1]! : full;
}

// ── Drift detection ───────────────────────────────────────────────────────────

const DRIFT_THRESHOLD_DP = 8;

function detectDrift(
  live: SkeletonPiece[],
  saved: any,
  viewportWidth: number
): { hasDrift: boolean; diffCount: number } {
  if (!saved) return { hasDrift: false, diffCount: 0 };

  // Resolve responsive breakpoint
  let savedPieces: SkeletonPiece[] | null = null;
  if (saved.breakpoints) {
    const keys = Object.keys(saved.breakpoints).map(Number).sort((a, b) => a - b);
    let best = keys[0];
    for (const k of keys) {
      if (k <= viewportWidth) best = k;
    }
    savedPieces = best !== undefined ? saved.breakpoints[best]?.skeletons ?? null : null;
  } else if (Array.isArray(saved.skeletons)) {
    savedPieces = saved.skeletons;
  }

  if (!savedPieces) return { hasDrift: false, diffCount: 0 };
  if (savedPieces.length !== live.length) {
    return { hasDrift: true, diffCount: Math.abs(savedPieces.length - live.length) };
  }

  let diffs = 0;
  for (let i = 0; i < live.length; i++) {
    const l = live[i]!;
    const sv = savedPieces[i]!;
    if (
      Math.abs(l.y - sv.y) > DRIFT_THRESHOLD_DP ||
      Math.abs(l.h - sv.h) > DRIFT_THRESHOLD_DP ||
      Math.abs(l.x - sv.x) > 3 ||  // percent
      Math.abs(l.w - sv.w) > 3
    ) {
      diffs++;
    }
  }

  return { hasDrift: diffs > 0, diffCount: diffs };
}

// ── Plugin setup ──────────────────────────────────────────────────────────────

export default function setupPlugin(client: DevToolsPluginClient<PluginEvents>) {
  const metroUrl = getMetroUrl();

  // Track drift state across broadcast cycles
  const driftMap: Record<string, boolean> = {};

  function broadcastRegistry() {
    const registry = getRegistry();
    client.send('registered-components', {
      names: [...registry.keys()],
      driftMap: { ...driftMap },
    });
  }

  broadcastRegistry();
  const interval = setInterval(broadcastRegistry, 2000);

  // ── Capture ─────────────────────────────────────────────────────────────
  client.onMessage('capture-request', async ({ name }) => {
    const registry = getRegistry();
    const entry = registry.get(name);
    if (!entry) {
      client.send('capture-result', {
        name,
        viewportWidth: 0,
        height: 0,
        skeletons: [],
        labels: [],
        error: `No mounted <SkeletonCapture name="${name}"> found.\nNavigate to the screen that wraps this component.`,
      });
      return;
    }

    try {
      const result = await entry.capture();

      // Build per-piece labels
      const labels = result.skeletons.map((s, i) =>
        shortLabel(classifyPiece(s, result.viewportWidth, i))
      );

      // Drift detection
      const saved = getSavedSkeletons(name);
      const { hasDrift, diffCount } = detectDrift(result.skeletons, saved, result.viewportWidth);
      driftMap[name] = hasDrift;

      if (hasDrift) {
        client.send('skeleton-drift', {
          name,
          viewportWidth: result.viewportWidth,
          diffCount,
          threshold: DRIFT_THRESHOLD_DP,
        });
      }

      client.send('capture-result', { ...result, labels });
    } catch (e: any) {
      client.send('capture-result', {
        name,
        viewportWidth: 0,
        height: 0,
        skeletons: [],
        labels: [],
        error: String(e?.message ?? e),
      });
    }
  });

  // ── Capture All (bulk) ────────────────────────────────────────────────────
  client.onMessage('capture-all-request', async () => {
    const registry = getRegistry();
    const results: PluginEvents['capture-all-result']['results'] = [];

    for (const [name, entry] of registry.entries()) {
      try {
        const result = await entry.capture();
        const labels = result.skeletons.map((s, i) =>
          shortLabel(classifyPiece(s, result.viewportWidth, i))
        );
        const saved = getSavedSkeletons(name);
        const { hasDrift } = detectDrift(result.skeletons, saved, result.viewportWidth);
        driftMap[name] = hasDrift;

        // Broadcast each individual result so the panel can update progressively
        client.send('capture-result', { ...result, labels });
        results.push({ name, ok: true, skeletonCount: result.skeletons.length });
      } catch (e: any) {
        results.push({ name, ok: false, skeletonCount: 0, error: String(e?.message ?? e) });
      }
    }

    client.send('capture-all-result', { results });
  });

  // ── Save JSON ─────────────────────────────────────────────────────────────
  client.onMessage('save-request', async ({ name, outDir, allBreakpoints }) => {
    if (!metroUrl) {
      client.send('save-result', {
        ok: false,
        error: 'Could not resolve Metro server URL. Make sure Metro is running.',
      });
      return;
    }

    const saveUrl = `${metroUrl}/skeleton-save`;
    try {
      const res = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, outDir, allBreakpoints }),
      });

      if (res.ok) {
        const json = await res.json();
        driftMap[name] = false;
        client.send('save-result', { ok: true, file: json.file, skeletons: json.skeletons, breakpointCount: json.breakpointCount });
      } else {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        client.send('save-result', { ok: false, error: text });
      }
    } catch (e: any) {
      client.send('save-result', {
        ok: false,
        error: `Could not reach Metro at ${saveUrl}.\n${e?.message ?? String(e)}`,
      });
    }
  });

  // ── Save Descriptor (.ts) ─────────────────────────────────────────────────
  client.onMessage('save-descriptor-request', async ({ name, outDir, allBreakpoints }) => {
    if (!metroUrl) {
      client.send('save-descriptor-result', {
        ok: false,
        error: 'Could not resolve Metro server URL. Make sure Metro is running.',
      });
      return;
    }

    const tsSource = buildDescriptorSource(name, allBreakpoints);
    const saveUrl = `${metroUrl}/skeleton-save`;
    try {
      const res = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          outDir,
          allBreakpoints,
          asDescriptor: true,
          descriptorSource: tsSource,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        driftMap[name] = false;
        client.send('save-descriptor-result', { ok: true, file: json.file, breakpointCount: json.breakpointCount });
      } else {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        client.send('save-descriptor-result', { ok: false, error: text });
      }
    } catch (e: any) {
      client.send('save-descriptor-result', {
        ok: false,
        error: `Could not reach Metro at ${saveUrl}.\n${e?.message ?? String(e)}`,
      });
    }
  });

  return () => clearInterval(interval);
}

// ── Descriptor source generator ───────────────────────────────────────────────

function buildBreakpointBlock(
  name: string,
  viewportWidth: number,
  totalHeight: number,
  skeletons: SkeletonPiece[],
  indent: string
): string[] {
  const sorted = [...skeletons]
    .map((s, origIdx) => ({ ...s, origIdx }))
    .sort((a, b) => a.y - b.y);

  const lines: string[] = [];
  lines.push(`${indent}${viewportWidth}: {`);
  lines.push(`${indent}  name: '${name}',`);
  lines.push(`${indent}  viewportWidth: ${viewportWidth},`);
  lines.push(`${indent}  width: ${viewportWidth},`);
  lines.push(`${indent}  height: ${totalHeight},`);
  lines.push(`${indent}  skeletons: [`);
  for (const s of sorted) {
    const r = s.r === '50%' ? `'50%'` : String(s.r);
    const comment = classifyPiece(s, viewportWidth, s.origIdx);
    const fields: string[] = [`x: ${s.x}`, `y: ${s.y}`, `w: ${s.w}`, `h: ${s.h}`, `r: ${r}`];
    if (s.c) fields.push(`c: true`);
    lines.push(`${indent}    // ${comment}`);
    lines.push(`${indent}    { ${fields.join(', ')} },`);
  }
  lines.push(`${indent}  ],`);
  lines.push(`${indent}},`);
  return lines;
}

function buildDescriptorSource(
  name: string,
  allBreakpoints: Record<number, { viewportWidth: number; height: number; skeletons: SkeletonPiece[] }>
): string {
  const varName = name.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()) + 'Skeletons';
  const date = new Date().toISOString().slice(0, 10);

  const widths = Object.keys(allBreakpoints).map(Number).sort((a, b) => a - b);
  const totalPieces = allBreakpoints[widths[0]!]?.skeletons.length ?? 0;
  const bpSummary = widths.map((w) => `${w}dp`).join(', ');

  const breakpointLines: string[] = [];
  for (const w of widths) {
    const bp = allBreakpoints[w]!;
    breakpointLines.push(...buildBreakpointBlock(name, w, bp.height, bp.skeletons, '    '));
  }

  return [
    `import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';`,
    ``,
    `/**`,
    ` * Auto-generated by Skeleton Inspector — ${date}`,
    ` * Component  : ${name}`,
    ` * Breakpoints: ${bpSummary} (${widths.length} total)`,
    ` * Pieces     : ${totalPieces} per breakpoint`,
    ` *`,
    ` * ✅ x/w are percentages — widths scale automatically on any screen.`,
    ` *    y/h are dp values measured from the live layout per breakpoint.`,
    ` *`,
    ` * Usage:`,
    ` *   import ${varName} from './${name}.skeletons';`,
    ` *   <Skeleton initialSkeletons={${varName}} loading={loading}>`,
    ` *     <YourComponent />`,
    ` *   </Skeleton>`,
    ` */`,
    `const ${varName}: ResponsiveSkeletons = {`,
    `  breakpoints: {`,
    ...breakpointLines,
    `  },`,
    `};`,
    ``,
    `export default ${varName};`,
    ``,
  ].join('\n');
}

// ── Metro URL resolution ──────────────────────────────────────────────────────

function getMetroUrl(): string | null {
  try {
    const devSettings = NativeModules.DevSettings ?? NativeModules.RCTDevSettings;
    const host: string | undefined =
      devSettings?.scriptURL ??
      devSettings?.packagerHost;

    if (host) {
      try {
        const url = new URL(host);
        return `${url.protocol}//${url.host}`;
      } catch {
        return `http://${host.replace(/\/.*$/, '')}`;
      }
    }
    return 'http://localhost:8081';
  } catch {
    return 'http://localhost:8081';
  }
}

