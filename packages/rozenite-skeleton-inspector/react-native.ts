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
 */

import type { DevToolsPluginClient } from '@rozenite/plugin-bridge';
import { NativeModules } from 'react-native';

// Read the capture registry from globalThis — same key used by SkeletonCapture.tsx.
// Each entry now exposes a capture() function that returns CaptureResult directly,
// so this module never needs to touch React fibers.
const REGISTRY_KEY = '__rnAutoShimmerCaptureRegistry__';

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

export const PLUGIN_ID = 'react-native-auto-shimmer';

// ── Event map ────────────────────────────────────────────────────────────────

export interface SkeletonPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number | string;
  c?: boolean;
}


export interface PluginEvents {
  'capture-request': { name: string };
  'capture-result': {
    name: string;
    viewportWidth: number;
    height: number;
    skeletons: SkeletonPiece[];
    error?: string;
  };
  'registered-components': { names: string[] };
  'save-request': {
    name: string;
    outDir: string;
    viewportWidth: number;
    height: number;
    skeletons: SkeletonPiece[];
  };
  'save-result': {
    ok: boolean;
    file?: string;
    skeletons?: number;
    error?: string;
  };
  'save-descriptor-request': {
    name: string;
    outDir: string;
    viewportWidth: number;
    height: number;
    skeletons: SkeletonPiece[];
  };
  'save-descriptor-result': {
    ok: boolean;
    file?: string;
    error?: string;
  };
}

// ── Plugin setup ──────────────────────────────────────────────────────────────

export default function setupPlugin(client: DevToolsPluginClient<PluginEvents>) {
  const metroUrl = getMetroUrl();

  function broadcastRegistry() {
    const registry = getRegistry();
    client.send('registered-components', { names: [...registry.keys()] });
  }

  broadcastRegistry();
  const interval = setInterval(broadcastRegistry, 2000);

  // ── Capture ─────────────────────────────────────────────────────────────
  // Delegate entirely to SkeletonCapture's own capture() — no fiber walk here.
  client.onMessage('capture-request', async ({ name }) => {
    const registry = getRegistry();
    const entry = registry.get(name);
    if (!entry) {
      client.send('capture-result', {
        name,
        viewportWidth: 0,
        height: 0,
        skeletons: [],
        error: `No mounted <SkeletonCapture name="${name}"> found.\nNavigate to the screen that wraps this component.`,
      });
      return;
    }

    try {
      const result = await entry.capture();
      client.send('capture-result', result);
    } catch (e: any) {
      client.send('capture-result', {
        name,
        viewportWidth: 0,
        height: 0,
        skeletons: [],
        error: String(e?.message ?? e),
      });
    }
  });

  // ── Save ─────────────────────────────────────────────────────────────────
  client.onMessage('save-request', async ({ name, outDir, viewportWidth, height, skeletons }) => {
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
        body: JSON.stringify({ name, outDir, viewportWidth, height, skeletons }),
      });

      if (res.ok) {
        const json = await res.json();
        client.send('save-result', { ok: true, file: json.file, skeletons: json.skeletons });
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

  // ── Save Descriptor ───────────────────────────────────────────────────────
  client.onMessage('save-descriptor-request', async ({ name, outDir, viewportWidth, height, skeletons }) => {
    if (!metroUrl) {
      client.send('save-descriptor-result', {
        ok: false,
        error: 'Could not resolve Metro server URL. Make sure Metro is running.',
      });
      return;
    }

    const tsSource = buildDescriptorSource(name, viewportWidth, height, skeletons);
    const saveUrl = `${metroUrl}/skeleton-save`;
    try {
      const res = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          outDir,
          viewportWidth,
          height,
          skeletons,
          asDescriptor: true,
          descriptorSource: tsSource,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        client.send('save-descriptor-result', { ok: true, file: json.file });
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
// Generates a ResponsiveSkeletons TypeScript file from captured SkeletonPiece[].
//
// Why ResponsiveSkeletons (not SkeletonDescriptor)?
//   - x/w are stored as percentages → they scale to any container width automatically
//   - y/h are exact dp from the live measure → pixel-perfect vertical layout
//   - ResponsiveSkeletons is already the recommended format for cross-platform use
//   - The file is plain TypeScript so users can add more breakpoints or tweak values
//
// Each skeleton piece gets an inline comment with its index and role hint
// (circle → avatar/icon, tall → image/banner, short → text line, etc.)
// so the generated file is self-documenting and easy to refine.

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

function buildDescriptorSource(
  name: string,
  viewportWidth: number,
  totalHeight: number,
  skeletons: SkeletonPiece[]
): string {
  const varName = name.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()) + 'Skeletons';
  const date = new Date().toISOString().slice(0, 10);

  // Sort by y (top-to-bottom) for readable output
  const sorted = [...skeletons]
    .map((s, origIdx) => ({ ...s, origIdx }))
    .sort((a, b) => a.y - b.y);

  const skeletonLines: string[] = [];

  for (const s of sorted) {
    const r = s.r === '50%' ? `'50%'` : String(s.r);
    const comment = classifyPiece(s, viewportWidth, s.origIdx);

    // Build the object — only include c if it's a container
    const fields: string[] = [
      `x: ${s.x}`,
      `y: ${s.y}`,
      `w: ${s.w}`,
      `h: ${s.h}`,
      `r: ${r}`,
    ];
    if (s.c) fields.push(`c: true`);

    skeletonLines.push(`        // ${comment}`);
    skeletonLines.push(`        { ${fields.join(', ')} },`);
  }

  return [
    `import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';`,
    ``,
    `/**`,
    ` * Auto-generated by Skeleton Inspector — ${date}`,
    ` * Component : ${name}`,
    ` * Captured  : ${viewportWidth}dp wide · ${totalHeight}dp tall · ${skeletons.length} pieces`,
    ` *`,
    ` * ✅ Pixel-perfect: x/w are percentages so widths scale on any screen.`,
    ` *    y/h are exact dp values measured from the live layout.`,
    ` *`,
    ` * 💡 To improve cross-platform responsiveness:`,
    ` *    - Add more breakpoints captured on other device sizes`,
    ` *    - Or switch to a SkeletonDescriptor (descriptor prop) for fully`,
    ` *      runtime-computed layout that adapts to any container width`,
    ` *`,
    ` * Usage:`,
    ` *   import ${varName} from './${name}.skeletons';`,
    ` *   <Skeleton initialSkeletons={${varName}} loading={loading}>`,
    ` *     <YourComponent />`,
    ` *   </Skeleton>`,
    ` */`,
    `const ${varName}: ResponsiveSkeletons = {`,
    `  breakpoints: {`,
    `    ${viewportWidth}: {`,
    `      name: '${name}',`,
    `      viewportWidth: ${viewportWidth},`,
    `      width: ${viewportWidth},`,
    `      height: ${totalHeight},`,
    `      skeletons: [`,
    ...skeletonLines,
    `      ],`,
    `    },`,
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
