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

  return () => clearInterval(interval);
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
