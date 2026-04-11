/**
 * Skeleton Inspector — Rozenite DevTools panel
 *
 * Features:
 *  1. Piece classifier labels as badges on canvas rects
 *  2. Sync check / drift detection — red badge when live layout drifts from saved
 *  3. Multi-device breakpoint tab switcher in canvas (captures per viewport width)
 *  4. Dark-mode preview toggle in the canvas
 *  5. Live edit — drag to reposition rects, resize handles, + Add Rect button
 *  6. Search / filter component list + Capture All + Export All buttons
 *  7. Undo — Cmd/Ctrl+Z or ↩ button (up to 50 steps)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRozeniteDevToolsClient } from '@rozenite/plugin-bridge';
import type { PluginEvents, SkeletonPiece } from '../react-native';

const PLUGIN_ID = 'react-native-auto-shimmer';
const MAX_UNDO = 50;
const HANDLE_PX = 10;

type CaptureResult = PluginEvents['capture-result'];
type IndexedSkeleton = SkeletonPiece & { _origIdx: number; _label: string };
type BreakpointEntry = { result: CaptureResult; skeletons: IndexedSkeleton[] };
type BreakpointMap = Record<number, BreakpointEntry>;

function toVarName(name: string) {
  return name.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()) + 'Skeletons';
}

// ── Panel root ────────────────────────────────────────────────────────────────

export default function SkeletonInspectorPanel() {
  const client = useRozeniteDevToolsClient<PluginEvents>({ pluginId: PLUGIN_ID });

  const [names, setNames] = useState<string[]>([]);
  const [driftMap, setDriftMap] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [capturingAll, setCapturingAll] = useState(false);
  const [breakpoints, setBreakpoints] = useState<BreakpointMap>({});
  const [activeWidth, setActiveWidth] = useState<number | null>(null);
  const [outDir, setOutDir] = useState('src/skeletons');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [descState, setDescState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [descMsg, setDescMsg] = useState('');
  const [saveSnippet, setSaveSnippet] = useState<{
    varName: string; importPath: string; filePath: string; isDescriptor: boolean;
  } | null>(null);
  const [darkPreview, setDarkPreview] = useState(false);
  const [captureAllLog, setCaptureAllLog] = useState<PluginEvents['capture-all-result']['results'] | null>(null);

  // Undo
  const undoStack = useRef<Array<{ width: number; skeletons: IndexedSkeleton[] }>>([]);
  const [undoCount, setUndoCount] = useState(0);

  // Derived
  const activeEntry: BreakpointEntry | null = activeWidth !== null ? (breakpoints[activeWidth] ?? null) : null;
  const result: CaptureResult | null = activeEntry?.result ?? null;
  const skeletons: IndexedSkeleton[] = activeEntry?.skeletons ?? [];

  // ── Undo helpers ───────────────────────────────────────────────────────────

  const pushUndo = useCallback((width: number, sks: IndexedSkeleton[]) => {
    const snap = { width, skeletons: sks.map((s) => ({ ...s })) };
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), snap];
    setUndoCount(undoStack.current.length);
  }, []);

  const popUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current[undoStack.current.length - 1]!;
    undoStack.current = undoStack.current.slice(0, -1);
    setUndoCount(undoStack.current.length);
    setBreakpoints((bp) => {
      const entry = bp[prev.width];
      if (!entry) return bp;
      return { ...bp, [prev.width]: { ...entry, skeletons: prev.skeletons } };
    });
    setSaveState('idle'); setSaveMsg('');
    setDescState('idle'); setDescMsg('');
    setSaveSnippet(null);
  }, []);

  const clearUndo = useCallback(() => {
    undoStack.current = [];
    setUndoCount(0);
  }, []);

  // Stable ref so keyboard handler always calls the latest popUndo
  const popUndoRef = useRef(popUndo);
  useEffect(() => { popUndoRef.current = popUndo; }, [popUndo]);

  // Cmd/Ctrl+Z keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'z' || e.shiftKey) return;
      const tag = ((e.target as Element | null)?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      e.preventDefault();
      popUndoRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Message handlers ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!client) return;

    const u1 = client.onMessage('registered-components', ({ names: n, driftMap: dm }) => {
      setNames(n);
      setDriftMap(dm ?? {});
      if (selected && !n.includes(selected)) setSelected(null);
    });

    const u2 = client.onMessage('capture-result', (data) => {
      setCapturing(false);
      if (!data.error) {
        const indexed = data.skeletons.map((b: SkeletonPiece, i: number): IndexedSkeleton => ({
          ...b,
          _origIdx: i,
          _label: (data.labels ?? [])[i] ?? '',
        }));
        clearUndo();
        setBreakpoints((prev) => ({
          ...prev,
          [data.viewportWidth]: { result: data, skeletons: indexed },
        }));
        setActiveWidth(data.viewportWidth);
      } else {
        setBreakpoints((prev) => ({ ...prev, 0: { result: data, skeletons: [] } }));
        setActiveWidth(0);
      }
      setSaveState('idle'); setSaveMsg('');
      setDescState('idle'); setDescMsg('');
      setSaveSnippet(null);
    });

    const u3 = client.onMessage('save-result', (data) => {
      setSaveState(data.ok ? 'ok' : 'error');
      if (data.ok && data.file && selected) {
        const bpNote = data.breakpointCount && data.breakpointCount > 1
          ? `${data.breakpointCount} breakpoints`
          : `${data.skeletons} skeletons`;
        setSaveMsg(`✓  Saved  (${bpNote})`);
        setSaveSnippet({
          varName: toVarName(selected),
          importPath: `'../${outDir}/${selected}.skeletons.json'`,
          filePath: data.file,
          isDescriptor: false,
        });
      } else if (!data.ok) {
        setSaveMsg(`Error: ${data.error}`);
        setSaveSnippet(null);
      }
    });

    const u4 = client.onMessage('save-descriptor-result', (data) => {
      setDescState(data.ok ? 'ok' : 'error');
      if (data.ok && data.file && selected) {
        const bpNote = data.breakpointCount && data.breakpointCount > 1
          ? ` (${data.breakpointCount} breakpoints — works on all screens)`
          : '';
        setDescMsg(`✓  Saved .ts${bpNote}`);
        setSaveSnippet({
          varName: toVarName(selected),
          importPath: `'../${outDir}/${selected}.skeletons'`,
          filePath: data.file,
          isDescriptor: true,
        });
      } else if (!data.ok) {
        setDescMsg(`Error: ${data.error}`);
        setSaveSnippet(null);
      }
    });

    const u5 = client.onMessage('skeleton-drift', (data) => {
      setDriftMap((prev) => ({ ...prev, [data.name]: true }));
    });

    const u6 = client.onMessage('capture-all-result', (data) => {
      setCapturingAll(false);
      setCaptureAllLog(data.results);
    });

    return () => { u1.remove(); u2.remove(); u3.remove(); u4.remove(); u5.remove(); u6.remove(); };
  }, [client, selected, outDir, clearUndo]);

  // ── Skeleton mutations ────────────────────────────────────────────────────

  const resetSave = useCallback(() => {
    setSaveState('idle'); setSaveMsg('');
    setDescState('idle'); setDescMsg('');
    setSaveSnippet(null);
  }, []);

  const selectComponent = useCallback((name: string) => {
    setSelected(name);
    setBreakpoints({});
    setActiveWidth(null);
    clearUndo();
    resetSave();
    setCaptureAllLog(null);
  }, [clearUndo, resetSave]);

  // Called by canvas on mousedown — pushes snapshot BEFORE mutation
  const pushUndoForWidth = useCallback((width: number, sks: IndexedSkeleton[]) => {
    pushUndo(width, sks);
  }, [pushUndo]);

  const updateSkeleton = useCallback((width: number, origIdx: number, patch: Partial<SkeletonPiece>) => {
    setBreakpoints((prev) => {
      const entry = prev[width];
      if (!entry) return prev;
      return {
        ...prev,
        [width]: {
          ...entry,
          skeletons: entry.skeletons.map((b) =>
            b._origIdx === origIdx ? { ...b, ...patch } : b
          ),
        },
      };
    });
  }, []);

  const deleteSkeleton = useCallback((width: number, sks: IndexedSkeleton[], origIdx: number) => {
    pushUndo(width, sks);
    setBreakpoints((prev) => {
      const entry = prev[width];
      if (!entry) return prev;
      return {
        ...prev,
        [width]: { ...entry, skeletons: entry.skeletons.filter((b) => b._origIdx !== origIdx) },
      };
    });
    resetSave();
  }, [pushUndo, resetSave]);

  const addRect = useCallback(() => {
    if (activeWidth === null || !activeEntry) return;
    pushUndo(activeWidth, activeEntry.skeletons);
    const maxIdx = activeEntry.skeletons.reduce((m, b) => Math.max(m, b._origIdx), -1);
    const newPiece: IndexedSkeleton = {
      x: 5, y: 20, w: 90, h: 20, r: 8,
      _origIdx: maxIdx + 1,
      _label: 'new rect',
    };
    setBreakpoints((prev) => {
      const entry = prev[activeWidth];
      if (!entry) return prev;
      return { ...prev, [activeWidth]: { ...entry, skeletons: [...entry.skeletons, newPiece] } };
    });
    resetSave();
  }, [activeWidth, activeEntry, pushUndo, resetSave]);

  const addCircle = useCallback(() => {
    if (activeWidth === null || !activeEntry) return;
    pushUndo(activeWidth, activeEntry.skeletons);
    const maxIdx = activeEntry.skeletons.reduce((m, b) => Math.max(m, b._origIdx), -1);
    const newPiece: IndexedSkeleton = {
      x: 5, y: 20, w: 15, h: 50, r: '50%',
      _origIdx: maxIdx + 1,
      _label: 'new circle',
    };
    setBreakpoints((prev) => {
      const entry = prev[activeWidth];
      if (!entry) return prev;
      return { ...prev, [activeWidth]: { ...entry, skeletons: [...entry.skeletons, newPiece] } };
    });
    resetSave();
  }, [activeWidth, activeEntry, pushUndo, resetSave]);

  const undoAll = useCallback(() => {
    const stack = undoStack.current;
    if (stack.length === 0) return;
    // Jump all the way to the first snapshot
    const first = stack[0]!;
    undoStack.current = [];
    setUndoCount(0);
    setBreakpoints((bp) => {
      const entry = bp[first.width];
      if (!entry) return bp;
      return { ...bp, [first.width]: { ...entry, skeletons: first.skeletons } };
    });
    setSaveState('idle'); setSaveMsg('');
    setDescState('idle'); setDescMsg('');
    setSaveSnippet(null);
  }, []);

  // ── Save actions ──────────────────────────────────────────────────────────

  const capture = useCallback(() => {
    if (!client || !selected) return;
    setCapturing(true);
    resetSave();
    client.send('capture-request', { name: selected });
  }, [client, selected, resetSave]);

  const captureAll = useCallback(() => {
    if (!client) return;
    setCapturingAll(true);
    setCaptureAllLog(null);
    client.send('capture-all-request', {});
  }, [client]);

  // Build allBreakpoints payload from all currently captured breakpoint entries.
  // Always includes every captured width so saves are always complete/mergeable.
  const buildAllBreakpoints = useCallback((overrideWidth?: number, overrideSkeletons?: IndexedSkeleton[]) => {
    const all: Record<number, { viewportWidth: number; height: number; skeletons: SkeletonPiece[] }> = {};
    for (const [widthStr, entry] of Object.entries(breakpoints)) {
      if (!entry || entry.skeletons.length === 0) continue;
      const w = Number(widthStr);
      const sks = (w === overrideWidth && overrideSkeletons ? overrideSkeletons : entry.skeletons)
        .map(({ _origIdx: _i, _label: _l, ...b }) => b);
      all[w] = { viewportWidth: entry.result.viewportWidth, height: entry.result.height, skeletons: sks };
    }
    return all;
  }, [breakpoints]);

  const save = useCallback(() => {
    if (!client || !result || skeletons.length === 0) return;
    setSaveState('saving'); setSaveMsg(''); setSaveSnippet(null);
    client.send('save-request', {
      name: result.name,
      outDir,
      allBreakpoints: buildAllBreakpoints(activeWidth ?? undefined, skeletons),
    });
  }, [client, result, skeletons, outDir, buildAllBreakpoints, activeWidth]);

  const saveDescriptor = useCallback(() => {
    if (!client || !result || skeletons.length === 0) return;
    setDescState('saving'); setDescMsg(''); setSaveSnippet(null);
    client.send('save-descriptor-request', {
      name: result.name,
      outDir,
      allBreakpoints: buildAllBreakpoints(activeWidth ?? undefined, skeletons),
    });
  }, [client, result, skeletons, outDir, buildAllBreakpoints, activeWidth]);

  // exportAll sends every captured breakpoint at once in a single request
  const exportAll = useCallback(() => {
    if (!client || !selected) return;
    const all = buildAllBreakpoints();
    if (Object.keys(all).length === 0) return;
    setSaveState('saving'); setSaveMsg(''); setSaveSnippet(null);
    client.send('save-descriptor-request', {
      name: selected,
      outDir,
      allBreakpoints: all,
    });
  }, [client, selected, outDir, buildAllBreakpoints]);

  // ── Derived values ────────────────────────────────────────────────────────

  const filteredNames = useMemo(
    () => names.filter((n) => n.toLowerCase().includes(search.toLowerCase())),
    [names, search]
  );

  const breakpointWidths = useMemo(
    () => Object.keys(breakpoints).map(Number).filter((w) => w > 0).sort((a, b) => a - b),
    [breakpoints]
  );

  const hasDrift = selected ? (driftMap[selected] ?? false) : false;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!client) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#6366f1" />
        <Text style={s.muted}>Connecting to app…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>

      {/* ── Sidebar ─────────────────────────────── */}
      <View style={s.sidebar}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Skeleton Inspector</Text>

          <Text style={s.label}>Output directory</Text>
          <TextInput style={s.input} value={outDir} onChangeText={setOutDir} placeholder="src/skeletons" />
          <Text style={s.hint}>Relative to the project root</Text>

          <Text style={s.label}>Components ({names.length})</Text>
          <TextInput style={s.input} value={search} onChangeText={setSearch} placeholder="Search…" />

          {filteredNames.length === 0 ? (
            <View style={s.hintBox}>
              <Text style={s.hintText}>
                {names.length === 0
                  ? 'No components found.\n\nWrap a component with\n<SkeletonCapture name="…">\nand navigate to that screen.'
                  : `No match for "${search}"`}
              </Text>
            </View>
          ) : (
            <View style={s.list}>
              {filteredNames.map((name) => (
                <Pressable
                  key={name}
                  style={[s.listItem, selected === name && s.listItemActive]}
                  onPress={() => selectComponent(name)}
                >
                  <Text style={[s.listItemText, selected === name && s.listItemTextActive]} numberOfLines={1}>
                    {name}
                  </Text>
                  {(driftMap[name] ?? false) && (
                    <View style={s.driftBadge}><Text style={s.driftBadgeText}>drift</Text></View>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Capture / Capture All */}
          <View style={s.btnRow}>
            <Pressable
              style={[s.btn, s.btnCapture, s.flex1, (!selected || capturing) && s.disabled]}
              onPress={capture} disabled={!selected || capturing}
            >
              {capturing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.btnText}>⬡  Capture</Text>}
            </Pressable>
            <Pressable
              style={[s.btn, s.btnAll, s.flex1, capturingAll && s.disabled]}
              onPress={captureAll} disabled={capturingAll}
            >
              {capturingAll
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.btnText}>⬡⬡ All</Text>}
            </Pressable>
          </View>

          {hasDrift && (
            <View style={s.driftAlert}>
              <Text style={s.driftAlertText}>⚠ Layout drift — re-capture recommended.</Text>
            </View>
          )}

          {captureAllLog && (
            <View style={s.logBox}>
              <Text style={s.logTitle}>Capture All</Text>
              {captureAllLog.map((r) => (
                <Text key={r.name} style={[s.logRow, { color: r.ok ? '#059669' : '#ef4444' }]}>
                  {r.ok ? '✓' : '✗'} {r.name}{r.ok ? ` (${r.skeletonCount})` : ` — ${r.error ?? ''}`}
                </Text>
              ))}
            </View>
          )}

          {/* Post-capture controls */}
          {result && !result.error && (
            <>
              <View style={s.statRow}>
                <Text style={s.stat}>{skeletons.length} skeletons</Text>
                <Text style={s.stat}>{result.viewportWidth} × {result.height} dp</Text>
              </View>

              <View style={[s.btnRow, { marginBottom: 6 }]}>
                <Pressable style={[s.btn, s.btnAddRect, s.flex1]} onPress={addRect}>
                  <Text style={s.btnText}>＋ Rect</Text>
                </Pressable>
                <Pressable style={[s.btn, s.btnAddCircle, s.flex1]} onPress={addCircle}>
                  <Text style={s.btnText}>◯ Circle</Text>
                </Pressable>
              </View>

              <Pressable
                style={[s.btn, s.btnTs, (descState === 'saving' || skeletons.length === 0) && s.disabled]}
                onPress={saveDescriptor} disabled={descState === 'saving' || skeletons.length === 0}
              >
                {descState === 'saving'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.btnText}>
                      {descState === 'ok'
                        ? '✓  .ts Saved'
                        : breakpointWidths.length > 1
                          ? `↓  Save .ts  (${breakpointWidths.length} breakpoints)`
                          : '↓  Save .ts  (Responsive)'}
                    </Text>}
              </Pressable>
              <Text style={s.sub}>
                {breakpointWidths.length > 1
                  ? `Saves all ${breakpointWidths.length} captured breakpoints — works on every screen`
                  : 'x/w scale on every device · capture on more devices to add breakpoints'}
              </Text>

              {breakpointWidths.length > 1 && (
                <Pressable style={[s.btn, s.btnExport]} onPress={exportAll}>
                  <Text style={s.btnText}>↓ Export All Breakpoints</Text>
                </Pressable>
              )}
              {descMsg !== '' && (
                <Text style={[s.msg, { color: descState === 'ok' ? '#22c55e' : '#ef4444' }]}>{descMsg}</Text>
              )}

              <Pressable
                style={[s.btn, s.btnJson, (saveState === 'saving' || skeletons.length === 0) && s.disabled]}
                onPress={save} disabled={saveState === 'saving' || skeletons.length === 0}
              >
                {saveState === 'saving'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.btnText}>{saveState === 'ok' ? '✓  JSON Saved' : '↓  Save skeletons.json'}</Text>}
              </Pressable>
              <Text style={s.sub}>
                {breakpointWidths.length > 1
                  ? `Merges all ${breakpointWidths.length} breakpoints into one JSON file`
                  : 'Raw breakpoints snapshot — pixel-perfect on capture device'}
              </Text>
              {saveMsg !== '' && (
                <Text style={[s.msg, { color: saveState === 'ok' ? '#22c55e' : '#ef4444' }]}>{saveMsg}</Text>
              )}

              {saveSnippet && <SaveSnippet snippet={saveSnippet} />}
            </>
          )}

          {result?.error && <Text style={s.errorMsg}>{result.error}</Text>}
        </ScrollView>
      </View>

      {/* ── Preview ─────────────────────────────── */}
      <View style={s.preview}>
        {result && !result.error ? (
          <SkeletonCanvas
            result={result}
            skeletons={skeletons}
            activeWidth={activeWidth ?? 0}
            breakpointWidths={breakpointWidths}
            onSelectWidth={setActiveWidth}
            onUpdate={updateSkeleton}
            onDelete={deleteSkeleton}
            onPushUndo={pushUndoForWidth}
            onUndo={popUndo}
            onUndoAll={undoAll}
            undoCount={undoCount}
            darkMode={darkPreview}
            onToggleDark={() => setDarkPreview((v) => !v)}
          />
        ) : (
          <View style={s.center}>
            <Text style={s.muted}>
              {!selected ? 'Select a component from the sidebar'
                : capturing ? 'Measuring real layout…'
                : 'Press Capture to inspect skeletons'}
            </Text>
          </View>
        )}
      </View>

    </View>
  );
}

// ── Save snippet ──────────────────────────────────────────────────────────────

interface SnippetInfo { varName: string; importPath: string; filePath: string; isDescriptor: boolean }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { (navigator as any).clipboard?.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return <Pressable onPress={copy} style={s.copyBtn}><Text style={s.copyBtnText}>{copied ? '✓' : 'Copy'}</Text></Pressable>;
}

function SaveSnippet({ snippet }: { snippet: SnippetInfo }) {
  const imp = `import ${snippet.varName} from ${snippet.importPath};`;
  const usage = ['<Skeleton', `  initialSkeletons={${snippet.varName}}`, '  loading={loading}', '>', '  <YourComponent />', '</Skeleton>'];
  return (
    <View style={s.snippetBox}>
      <View style={s.snippetHeader}>
        <Text style={s.snippetTitle}>{snippet.isDescriptor ? '✅' : '📄'} Add to your screen:</Text>
        <CopyButton text={`${imp}\n\n${usage.join('\n')}`} />
      </View>
      <View style={s.snippetCode}>
        <Text style={s.code2} selectable>{imp}</Text>
        <View style={{ height: 8 }} />
        {usage.map((l, i) => <Text key={i} style={s.code2} selectable>{l}</Text>)}
      </View>
      <View style={s.snippetHint}>
        <Text style={s.snippetHintText}>
          {snippet.isDescriptor
            ? 'x/w are percentages → scale on every screen size.'
            : 'Pixel-perfect on capture device. Use Save .ts for responsive version.'}
        </Text>
      </View>
    </View>
  );
}

// ── Skeleton canvas ───────────────────────────────────────────────────────────

// ── Unit conversion helpers ───────────────────────────────────────────────────

// Internal format: x/w are % of viewport width, y/h are dp
// "% screen" mode: x/w stay as-is (already %), y/h become % of total height
// "dp" mode: x/w shown as computed dp, y/h shown as dp

type DimMode = 'dp' | 'pct';

function toDisplay(sk: IndexedSkeleton, field: 'x' | 'y' | 'w' | 'h', mode: DimMode, vw: number, vh: number): string {
  if (field === 'x' || field === 'w') {
    // x/w are always stored as % — show as dp or keep as %
    const pct = field === 'x' ? sk.x : sk.w;
    if (mode === 'dp') return String(Math.round(pct / 100 * vw));
    return String(pct);
  } else {
    // y/h are stored as dp
    const dp = field === 'y' ? sk.y : sk.h;
    if (mode === 'pct') return String(Math.round(dp / vh * 1000) / 10); // 1 decimal
    return String(dp);
  }
}

function fromDisplay(raw: string, field: 'x' | 'y' | 'w' | 'h', mode: DimMode, vw: number, vh: number): number | null {
  const v = parseFloat(raw);
  if (isNaN(v)) return null;
  if (field === 'x' || field === 'w') {
    // stored as % — convert from dp if needed
    if (mode === 'dp') return Math.round(Math.max(0, Math.min(100, v / vw * 100)) * 10) / 10;
    return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
  } else {
    // stored as dp — convert from % if needed
    if (mode === 'pct') return Math.round(Math.max(0, v / 100 * vh));
    return Math.round(Math.max(0, v));
  }
}

function unitLabel(field: 'x' | 'y' | 'w' | 'h', mode: DimMode): string {
  if (field === 'x' || field === 'w') return mode === 'dp' ? 'dp' : '%';
  return mode === 'pct' ? '%' : 'dp';
}

// ── Canvas ────────────────────────────────────────────────────────────────────

interface CanvasProps {
  result: CaptureResult;
  skeletons: IndexedSkeleton[];
  activeWidth: number;
  breakpointWidths: number[];
  onSelectWidth: (w: number) => void;
  onUpdate: (width: number, origIdx: number, patch: Partial<SkeletonPiece>) => void;
  onDelete: (width: number, sks: IndexedSkeleton[], origIdx: number) => void;
  onPushUndo: (width: number, sks: IndexedSkeleton[]) => void;
  onUndo: () => void;
  onUndoAll: () => void;
  undoCount: number;
  darkMode: boolean;
  onToggleDark: () => void;
}

function SkeletonCanvas({
  result, skeletons, activeWidth, breakpointWidths,
  onSelectWidth, onUpdate, onDelete, onPushUndo, onUndo, onUndoAll, undoCount,
  darkMode, onToggleDark,
}: CanvasProps) {
  const canvasRef = useRef<any>(null);
  const MAX_W = 380;
  const scale = Math.min(1, MAX_W / result.viewportWidth);
  const cw = Math.round(result.viewportWidth * scale);
  const ch = Math.round(result.height * scale);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dimMode, setDimMode] = useState<DimMode>('dp');

  // Clear selection when the skeleton list changes
  useEffect(() => {
    setSelectedIdx((prev) => {
      if (prev === null) return null;
      return skeletons.some((s) => s._origIdx === prev) ? prev : null;
    });
  }, [skeletons]);

  // ── Draw ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = darkMode ? '#1f2937' : '#f3f4f6';
    ctx.fillRect(0, 0, cw, ch);

    for (const sk of skeletons) {
      const x = (sk.x / 100) * cw;
      const y = sk.y * scale;
      const w = (sk.w / 100) * cw;
      const h = sk.h * scale;
      const r = sk.r === '50%'
        ? Math.min(w, h) / 2
        : Math.min(Number(sk.r) * scale, Math.min(w, h) / 2);
      const hue = (sk._origIdx * 41) % 360;
      const alpha = darkMode ? (sk.c ? 0.25 : 0.6) : (sk.c ? 0.3 : 0.7);
      const isSel = sk._origIdx === selectedIdx;

      ctx.fillStyle = `hsla(${hue},65%,${darkMode ? 65 : 55}%,${alpha})`;
      ctx.beginPath();
      ctx.roundRect?.(x, y, w, h, r);
      if (!ctx.roundRect) {
        // fallback for older browsers
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
      }
      ctx.closePath();
      ctx.fill();

      // Selection ring
      if (isSel) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect?.(x, y, w, h, r);
        if (!ctx.roundRect) {
          ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
          ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
          ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Resize handle (bottom-right)
      ctx.fillStyle = isSel ? '#6366f1' : (darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)');
      ctx.fillRect(x + w - HANDLE_PX, y + h - HANDLE_PX, HANDLE_PX, HANDLE_PX);

      // Index number
      ctx.fillStyle = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';
      ctx.font = `${Math.max(7, 9 * scale)}px monospace`;
      ctx.fillText(String(sk._origIdx), x + 3, y + 10 * scale);

      // Label badge (Feature 1)
      if (sk._label && w > 30 && h > 14) {
        const lbl = sk._label.length > 18 ? sk._label.slice(0, 17) + '…' : sk._label;
        const fs = Math.max(6, 8 * scale);
        ctx.font = `${fs}px sans-serif`;
        const tw = ctx.measureText(lbl).width;
        const pad = 3;
        const bx = x + (w - tw - pad * 2) / 2;
        const by = y + (h - fs) / 2 - 1;
        ctx.fillStyle = darkMode ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.roundRect?.(bx - pad, by - 1, tw + pad * 2, fs + 4, 3); ctx.fill();
        ctx.fillStyle = darkMode ? '#e5e7eb' : '#111827';
        ctx.font = `${fs}px sans-serif`;
        ctx.fillText(lbl, bx, by + fs - 1);
      }
    }
  }, [skeletons, cw, ch, scale, darkMode, selectedIdx]);

  // ── Drag (ref-based — never stale) ────────────────────────────────────────
  // We keep a ref to the current skeletons/width/callbacks so the imperative
  // drag handlers always see the latest values without causing re-renders.
  const liveRef = useRef({ skeletons, cw, scale, activeWidth, onUpdate, onDelete, onPushUndo });
  liveRef.current = { skeletons, cw, scale, activeWidth, onUpdate, onDelete, onPushUndo };

  const drag = useRef<{
    origIdx: number; mode: 'move' | 'resize';
    sx: number; sy: number; rx: number; ry: number; rw: number; rh: number;
  } | null>(null);

  const onMouseDown = useCallback((e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { skeletons: sks, cw: cw_, scale: sc, activeWidth: aw, onPushUndo: push } = liveRef.current;
    const br = canvas.getBoundingClientRect();
    const mx = e.clientX - br.left;
    const my = e.clientY - br.top;

    let hit: { origIdx: number; mode: 'move' | 'resize'; sk: IndexedSkeleton } | null = null;
    for (let i = sks.length - 1; i >= 0; i--) {
      const sk = sks[i]!;
      const x = (sk.x / 100) * cw_;
      const y = sk.y * sc;
      const w = (sk.w / 100) * cw_;
      const h = sk.h * sc;
      if (mx >= x + w - HANDLE_PX && my >= y + h - HANDLE_PX && mx <= x + w + 2 && my <= y + h + 2) {
        hit = { origIdx: sk._origIdx, mode: 'resize', sk }; break;
      }
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
        hit = { origIdx: sk._origIdx, mode: 'move', sk }; break;
      }
    }

    if (!hit) { setSelectedIdx(null); return; }
    e.preventDefault();
    setSelectedIdx(hit.origIdx);
    push(aw, sks); // snapshot before drag
    drag.current = {
      origIdx: hit.origIdx, mode: hit.mode,
      sx: e.clientX, sy: e.clientY,
      rx: hit.sk.x, ry: hit.sk.y, rw: hit.sk.w, rh: hit.sk.h,
    };
  }, []);

  const onMouseMove = useCallback((e: any) => {
    if (!drag.current) return;
    const { cw: cw_, scale: sc, activeWidth: aw, onUpdate: upd } = liveRef.current;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (drag.current.mode === 'move') {
      upd(aw, drag.current.origIdx, {
        x: Math.round(Math.max(0, Math.min(98, drag.current.rx + (dx / cw_) * 100)) * 10) / 10,
        y: Math.round(Math.max(0, drag.current.ry + dy / sc)),
      });
    } else {
      upd(aw, drag.current.origIdx, {
        w: Math.round(Math.max(2, Math.min(100 - drag.current.rx, drag.current.rw + (dx / cw_) * 100)) * 10) / 10,
        h: Math.round(Math.max(4, drag.current.rh + dy / sc)),
      });
    }
  }, []);

  const onMouseUp = useCallback(() => { drag.current = null; }, []);

  // ── Delete overlay position (canvas-relative) ──────────────────────────────
  const selSk = selectedIdx !== null ? skeletons.find((s) => s._origIdx === selectedIdx) : null;
  const delX = selSk ? (selSk.x / 100) * cw + (selSk.w / 100) * cw - 10 : 0;
  const delY = selSk ? selSk.y * scale - 10 : 0;

  return (
    <ScrollView contentContainerStyle={s.canvasContent}>
      {/* Toolbar */}
      <View style={s.toolbar}>
        <Pressable style={[s.toggleBtn, darkMode && s.toggleBtnOn]} onPress={onToggleDark}>
          <Text style={[s.toggleTxt, darkMode && s.toggleTxtOn]}>{darkMode ? '☀ Light' : '🌙 Dark'}</Text>
        </Pressable>
        <Pressable style={[s.undoBtn, undoCount === 0 && s.disabled]} onPress={onUndo} disabled={undoCount === 0}>
          <Text style={s.undoTxt}>↩ Undo{undoCount > 0 ? ` (${undoCount})` : ''}</Text>
        </Pressable>
        <Pressable style={[s.undoBtn, s.undoBtnAll, undoCount === 0 && s.disabled]} onPress={onUndoAll} disabled={undoCount === 0}>
          <Text style={s.undoTxt}>⟲ Undo All</Text>
        </Pressable>
        {/* Dimension unit toggle */}
        <View style={s.unitToggle}>
          <Pressable style={[s.unitBtn, dimMode === 'dp' && s.unitBtnOn]} onPress={() => setDimMode('dp')}>
            <Text style={[s.unitTxt, dimMode === 'dp' && s.unitTxtOn]}>dp</Text>
          </Pressable>
          <Pressable style={[s.unitBtn, dimMode === 'pct' && s.unitBtnOn]} onPress={() => setDimMode('pct')}>
            <Text style={[s.unitTxt, dimMode === 'pct' && s.unitTxtOn]}>%</Text>
          </Pressable>
        </View>
        {breakpointWidths.length > 1 && breakpointWidths.map((w) => (
          <Pressable key={w} style={[s.bpTab, w === activeWidth && s.bpTabOn]} onPress={() => onSelectWidth(w)}>
            <Text style={[s.bpTabTxt, w === activeWidth && s.bpTabTxtOn]}>{w}dp</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.previewTitle}>
        <Text style={{ fontWeight: '700' }}>{result.name}</Text>
        {'  ·  '}{result.viewportWidth}dp  ·  {skeletons.length} rects
        {scale < 1 ? `  (${Math.round(scale * 100)}%)` : ''}
      </Text>

      {/* Canvas + floating delete button */}
      {/* @ts-ignore */}
      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
        {/* @ts-ignore */}
        <canvas
          ref={canvasRef}
          width={cw}
          height={ch}
          style={{ border: `2px solid ${darkMode ? '#374151' : '#d1d5db'}`, borderRadius: 8, display: 'block', cursor: 'crosshair' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
        {selSk && (
          // @ts-ignore
          <div
            title={`Delete rect #${selSk._origIdx}`}
            onClick={() => { onDelete(activeWidth, skeletons, selSk._origIdx); setSelectedIdx(null); }}
            style={{
              position: 'absolute', left: delX, top: delY,
              width: 20, height: 20, borderRadius: 10,
              background: '#ef4444', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1,
              userSelect: 'none', zIndex: 10,
            }}
          >×</div>
        )}
      </div>

      <Text style={s.hint2}>Click to select · Drag to move · ◢ corner to resize · × to delete · ⌘Z / Ctrl+Z to undo</Text>

      {/* Inline property editor for selected rect */}
      {selSk && (
        <RectEditor
          sk={selSk}
          dimMode={dimMode}
          viewportWidth={result.viewportWidth}
          viewportHeight={result.height}
          onCommit={(patch) => {
            onPushUndo(activeWidth, skeletons);
            onUpdate(activeWidth, selSk._origIdx, patch);
          }}
          darkMode={darkMode}
        />
      )}

      <SkeletonTable
        skeletons={skeletons}
        dimMode={dimMode}
        viewportWidth={result.viewportWidth}
        viewportHeight={result.height}
        darkMode={darkMode}
        onDelete={(origIdx) => onDelete(activeWidth, skeletons, origIdx)}
      />
    </ScrollView>
  );
}

// ── Rect property editor ──────────────────────────────────────────────────────
// FieldInput is at module level so React never remounts it on parent re-renders,
// which would destroy focus. All context is passed as explicit props.

interface FieldInputProps {
  field: 'x' | 'y' | 'w' | 'h';
  sk: IndexedSkeleton;
  dimMode: DimMode;
  vw: number;
  vh: number;
  border: string;
  inputBg: string;
  inputC: string;
  labelC: string;
  onCommit: (patch: Partial<SkeletonPiece>) => void;
}

function FieldInput({ field, sk, dimMode, vw, vh, border, inputBg, inputC, labelC, onCommit }: FieldInputProps) {
  const [val, setVal] = useState(() => toDisplay(sk, field, dimMode, vw, vh));

  // Sync displayed value when the skeleton data or unit mode changes externally
  // (e.g. drag moves the rect while this input is visible, or user toggles dp/%)
  useEffect(() => {
    setVal(toDisplay(sk, field, dimMode, vw, vh));
    // Intentionally tracking the numeric values of sk, not the object reference,
    // so toggling dimMode or a drag update refreshes the display without unmounting.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sk._origIdx, sk.x, sk.y, sk.w, sk.h, dimMode, vw, vh]);

  const commit = useCallback(() => {
    const converted = fromDisplay(val, field, dimMode, vw, vh);
    if (converted === null) {
      setVal(toDisplay(sk, field, dimMode, vw, vh)); // revert bad input
      return;
    }
    onCommit({ [field]: converted });
  // onCommit identity is stable (useCallback in parent), safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val, field, dimMode, vw, vh, sk]);

  const unit = unitLabel(field, dimMode);

  return (
    <View style={{ flex: 1, marginHorizontal: 3 }}>
      <Text style={{ fontSize: 10, color: labelC, marginBottom: 2, textAlign: 'center' }}>
        {field.toUpperCase()} <Text style={{ fontSize: 9 }}>({unit})</Text>
      </Text>
      <TextInput
        style={{
          borderWidth: 1, borderColor: border, borderRadius: 5,
          backgroundColor: inputBg, color: inputC,
          fontSize: 12, fontFamily: 'monospace',
          paddingHorizontal: 6, paddingVertical: 4,
          textAlign: 'center',
        }}
        value={val}
        onChangeText={setVal}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );
}

interface RectEditorProps {
  sk: IndexedSkeleton;
  dimMode: DimMode;
  viewportWidth: number;
  viewportHeight: number;
  onCommit: (patch: Partial<SkeletonPiece>) => void;
  darkMode: boolean;
}

function RectEditor({ sk, dimMode, viewportWidth, viewportHeight, onCommit, darkMode }: RectEditorProps) {
  const vw = viewportWidth;
  const vh = viewportHeight;

  const bg     = darkMode ? '#1f2937' : '#f8fafc';
  const border  = darkMode ? '#374151' : '#e2e8f0';
  const labelC  = darkMode ? '#94a3b8' : '#64748b';
  const inputBg = darkMode ? '#111827' : '#fff';
  const inputC  = darkMode ? '#e5e7eb' : '#111';

  const shared = { sk, dimMode, vw, vh, border, inputBg, inputC, labelC, onCommit };

  return (
    <View style={{ backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: labelC, marginBottom: 8 }}>
        ✏ Rect #{sk._origIdx} — {sk._label || (sk.r === '50%' ? 'circle' : 'rect')}
        {'  ·  '}
        <Text style={{ fontWeight: '400' }}>
          {dimMode === 'dp' ? 'dp (pixels)' : '% of screen'} · Tab / Enter to apply
        </Text>
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <FieldInput field="x" {...shared} />
        <FieldInput field="y" {...shared} />
        <FieldInput field="w" {...shared} />
        <FieldInput field="h" {...shared} />
      </View>
    </View>
  );
}

// ── Skeleton table ────────────────────────────────────────────────────────────

function SkeletonTable({ skeletons, dimMode, viewportWidth, viewportHeight, darkMode, onDelete }: {
  skeletons: IndexedSkeleton[];
  dimMode: DimMode;
  viewportWidth: number;
  viewportHeight: number;
  darkMode: boolean;
  onDelete: (origIdx: number) => void;
}) {
  const vw = viewportWidth;
  const vh = viewportHeight;
  const hBg = darkMode ? '#374151' : '#f3f4f6';
  const eBg = darkMode ? '#1f2937' : '#fff';
  const oBg = darkMode ? '#111827' : '#fafafa';
  const tc = darkMode ? '#e5e7eb' : '#111';
  const hc = darkMode ? '#d1d5db' : '#374151';

  const xH = dimMode === 'dp' ? 'x dp' : 'x %';
  const yH = dimMode === 'pct' ? 'y %' : 'y dp';
  const wH = dimMode === 'dp' ? 'w dp' : 'w %';
  const hH = dimMode === 'pct' ? 'h %' : 'h dp';

  return (
    <View style={[s.table, darkMode && { borderColor: '#374151' }]}>
      <View style={[s.tRow, { backgroundColor: hBg }]}>
        {['#', xH, yH, wH, hH, 'r', 'type', 'label', ''].map((h, i) => (
          <Text key={i} style={[s.th, { color: hc }, h === '' && s.thDel]}>{h}</Text>
        ))}
      </View>
      {skeletons.map((b, i) => (
        <View key={b._origIdx} style={[s.tRow, { backgroundColor: i % 2 === 0 ? eBg : oBg }]}>
          <Text style={[s.td, { color: tc }]}>{b._origIdx}</Text>
          <Text style={[s.td, { color: tc }]}>{toDisplay(b, 'x', dimMode, vw, vh)}</Text>
          <Text style={[s.td, { color: tc }]}>{toDisplay(b, 'y', dimMode, vw, vh)}</Text>
          <Text style={[s.td, { color: tc }]}>{toDisplay(b, 'w', dimMode, vw, vh)}</Text>
          <Text style={[s.td, { color: tc }]}>{toDisplay(b, 'h', dimMode, vw, vh)}</Text>
          <Text style={[s.td, { color: tc }]}>{String(b.r)}</Text>
          <Text style={[s.td, { color: tc }]}>{b.c ? 'ctnr' : 'leaf'}</Text>
          <Text style={[s.td, s.tdLabel, { color: tc }]} numberOfLines={1}>{b._label}</Text>
          <Pressable style={s.tdDel} onPress={() => onDelete(b._origIdx)} hitSlop={4}>
            {/* @ts-ignore */}
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: '#9ca3af', fontSize: 13 },
  flex1: { flex: 1 },

  sidebar: { width: 270, borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 16, backgroundColor: '#fafafa' },
  title: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: '#6b7280', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  hint: { fontSize: 11, color: '#9ca3af', marginBottom: 14, marginTop: -4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 12, fontFamily: 'monospace', marginBottom: 8, backgroundColor: '#fff' },
  hintBox: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 12 },
  hintText: { fontSize: 12, color: '#6b7280', lineHeight: 18 },

  list: { gap: 4, marginBottom: 12 },
  listItem: { padding: 8, borderRadius: 6, backgroundColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listItemActive: { backgroundColor: '#e0e7ff' },
  listItemText: { fontSize: 12, fontFamily: 'monospace', color: '#374151', flex: 1 },
  listItemTextActive: { color: '#3730a3', fontWeight: '600' },

  driftBadge: { backgroundColor: '#ef4444', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  driftBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  driftAlert: { backgroundColor: '#fef2f2', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#fecaca', marginBottom: 10 },
  driftAlertText: { fontSize: 11, color: '#b91c1c' },

  logBox: { backgroundColor: '#f0fdf4', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 10 },
  logTitle: { fontSize: 11, fontWeight: '700', color: '#065f46', marginBottom: 4 },
  logRow: { fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },

  btnRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  btn: { borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8, flexDirection: 'row', gap: 6 },
  btnCapture: { backgroundColor: '#6366f1' },
  btnAll: { backgroundColor: '#8b5cf6' },
  btnAddRect: { backgroundColor: '#0891b2', marginBottom: 0 },
  btnAddCircle: { backgroundColor: '#7c3aed', marginBottom: 0 },
  btnExport: { backgroundColor: '#0d9488', marginBottom: 6 },
  btnTs: { backgroundColor: '#7c3aed' },
  btnJson: { backgroundColor: '#059669', marginTop: 4 },
  disabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  sub: { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: -4, marginBottom: 8 },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat: { fontSize: 11, fontFamily: 'monospace', color: '#374151' },
  msg: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  errorMsg: { fontSize: 12, color: '#ef4444', marginTop: 8, lineHeight: 16 },

  snippetBox: { marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: '#6ee7b7', backgroundColor: '#f0fdf4', overflow: 'hidden' },
  snippetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  snippetTitle: { fontSize: 13, fontWeight: '700', color: '#065f46', flex: 1 },
  copyBtn: { backgroundColor: '#059669', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  copyBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  snippetCode: { backgroundColor: '#0d1117', paddingHorizontal: 14, paddingVertical: 12, gap: 1 },
  code2: { fontSize: 12, lineHeight: 20, fontFamily: 'monospace', color: '#e6edf3' },
  snippetHint: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#bbf7d0' },
  snippetHintText: { fontSize: 12, color: '#047857', lineHeight: 18 },

  preview: { flex: 1, backgroundColor: '#fff' },
  canvasContent: { padding: 20, gap: 12 },
  previewTitle: { fontSize: 13, color: '#374151' },
  hint2: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },

  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  toggleBtnOn: { backgroundColor: '#1f2937', borderColor: '#374151' },
  toggleTxt: { fontSize: 12, color: '#374151', fontWeight: '600' },
  toggleTxtOn: { color: '#e5e7eb' },
  undoBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  undoBtnAll: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  undoTxt: { fontSize: 12, color: '#374151', fontWeight: '600' },
  unitToggle: { flexDirection: 'row', borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f3f4f6' },
  unitBtnOn: { backgroundColor: '#6366f1' },
  unitTxt: { fontSize: 12, color: '#374151', fontWeight: '700' },
  unitTxtOn: { color: '#fff' },
  bpTab: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  bpTabOn: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  bpTabTxt: { fontSize: 11, color: '#374151', fontFamily: 'monospace' },
  bpTabTxtOn: { color: '#fff', fontWeight: '700' },

  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
  tRow: { flexDirection: 'row' },
  th: { flex: 1, fontSize: 11, fontWeight: '600', padding: 5, borderRightWidth: 1, borderRightColor: '#e5e7eb', color: '#374151' },
  thDel: { flex: 0, width: 32 },
  td: { flex: 1, fontSize: 11, fontFamily: 'monospace', padding: 4, borderRightWidth: 1, borderRightColor: '#f3f4f6', color: '#111' },
  tdLabel: { flex: 2, fontSize: 10 },
  tdDel: { width: 32, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
});
