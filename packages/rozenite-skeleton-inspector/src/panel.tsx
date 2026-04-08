/**
 * Skeleton Inspector — Rozenite DevTools panel
 *
 * Full workflow — no CLI server needed:
 *  1. Select a mounted <SkeletonCapture> component from the sidebar
 *  2. Click Capture → skeletons are measured via UIManager.measure (real layout)
 *  3. Visual skeleton overlay lets you verify before saving
 *  4. Click Save → save-request sent via Rozenite bridge → react-native.ts
 *     POSTs to Metro's /skeleton-save endpoint → file written to disk
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

type CaptureResult = PluginEvents['capture-result'];

// Skeleton list with stable original indices so we can delete by index
type IndexedSkeleton = SkeletonPiece & { _origIdx: number };

// ── Panel root ────────────────────────────────────────────────────────────────

export default function SkeletonInspectorPanel() {
  const client = useRozeniteDevToolsClient<PluginEvents>({ pluginId: PLUGIN_ID });

  const [names, setNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [skeletons, setSkeletons] = useState<IndexedSkeleton[]>([]);
  const [outDir, setOutDir] = useState('src/skeletons');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [saveSnippet, setSaveSnippet] = useState<{ varName: string; importPath: string; filePath: string; isDescriptor: boolean } | null>(null);
  const [descState, setDescState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [descMsg, setDescMsg] = useState('');

  useEffect(() => {
    if (!client) return;

    const s1 = client.onMessage('registered-components', ({ names: n }) => {
      setNames(n);
      if (selected && !n.includes(selected)) setSelected(null);
    });

    const s2 = client.onMessage('capture-result', (data) => {
      setCapturing(false);
      setResult(data);
      setSkeletons(data.skeletons.map((b: SkeletonPiece, i: number) => ({ ...b, _origIdx: i })));
      setSaveState('idle');
      setSaveMsg('');
    });

    const s3 = client.onMessage('save-result', (data) => {
      setSaveState(data.ok ? 'ok' : 'error');
      if (data.ok && data.file && selected) {
        setSaveMsg(`✓  Saved  (${data.skeletons} skeletons)`);
        const varName = selected.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()) + 'Skeletons';
        const importPath = `'../${outDir}/${selected}.skeletons.json'`;
        setSaveSnippet({ varName, importPath, filePath: data.file, isDescriptor: false });
      } else if (!data.ok) {
        setSaveMsg(`Error: ${data.error}`);
        setSaveSnippet(null);
      }
    });

    const s4 = client.onMessage('save-descriptor-result', (data) => {
      setDescState(data.ok ? 'ok' : 'error');
      if (data.ok && data.file && selected) {
        setDescMsg(`✓  Saved .ts`);
        const varName = selected.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()) + 'Skeletons';
        const importPath = `'../${outDir}/${selected}.skeletons'`;
        setSaveSnippet({ varName, importPath, filePath: data.file, isDescriptor: true });
      } else if (!data.ok) {
        setDescMsg(`Error: ${data.error}`);
        setSaveSnippet(null);
      }
    });

    return () => { s1.remove(); s2.remove(); s3.remove(); s4.remove(); };
  }, [client, selected, outDir]);

  const resetSaveState = useCallback(() => {
    setSaveState('idle'); setSaveMsg('');
    setDescState('idle'); setDescMsg('');
    setSaveSnippet(null);
  }, []);

  const capture = useCallback(() => {
    if (!client || !selected) return;
    setCapturing(true);
    setResult(null);
    setSkeletons([]);
    resetSaveState();
    client.send('capture-request', { name: selected });
  }, [client, selected, resetSaveState]);

  const deleteSkeleton = useCallback((origIdx: number) => {
    setSkeletons((prev) => prev.filter((b) => b._origIdx !== origIdx));
    resetSaveState();
  }, [resetSaveState]);

  // Save JSON → Metro /skeleton-save → disk
  const save = useCallback(() => {
    if (!client || !result || skeletons.length === 0) return;
    setSaveState('saving');
    setSaveMsg('');
    setSaveSnippet(null);
    client.send('save-request', {
      name: result.name,
      outDir,
      viewportWidth: result.viewportWidth,
      height: result.height,
      skeletons: skeletons.map(({ _origIdx: _i, ...b }) => b),
    });
  }, [client, result, skeletons, outDir]);

  // Save Descriptor (.ts) → Metro /skeleton-save → disk
  const saveDescriptor = useCallback(() => {
    if (!client || !result || skeletons.length === 0) return;
    setDescState('saving');
    setDescMsg('');
    setSaveSnippet(null);
    client.send('save-descriptor-request', {
      name: result.name,
      outDir,
      viewportWidth: result.viewportWidth,
      height: result.height,
      skeletons: skeletons.map(({ _origIdx: _i, ...b }) => b),
    });
  }, [client, result, skeletons, outDir]);

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

      {/* ── Sidebar ─────────────────────────────────── */}
      <View style={s.sidebar}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Skeleton Inspector</Text>

          <Text style={s.label}>Output directory</Text>
          <TextInput
            style={s.input}
            value={outDir}
            onChangeText={setOutDir}
            placeholder="src/skeletons"
          />
          <Text style={s.hint}>Relative to the project root</Text>

          <Text style={s.label}>Mounted components</Text>

          {names.length === 0 ? (
            <View style={s.hintBox}>
              <Text style={s.hintText}>
                No components found.{'\n\n'}Wrap a component with{'\n'}
                <Text style={s.code}>{'<SkeletonCapture name="…">'}</Text>
                {'\n'}and navigate to that screen.
              </Text>
            </View>
          ) : (
            <View style={s.list}>
              {names.map((name) => (
                <Pressable
                  key={name}
                  style={[s.listItem, selected === name && s.listItemActive]}
                  onPress={() => { setSelected(name); setResult(null); resetSaveState(); }}
                >
                  <Text style={[s.listItemText, selected === name && s.listItemTextActive]}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Capture */}
          <Pressable
            style={[s.btn, s.btnCapture, (!selected || capturing) && s.btnDisabled]}
            onPress={capture}
            disabled={!selected || capturing}
          >
            {capturing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.btnText}>⬡  Capture</Text>}
          </Pressable>

          {/* Save — appears after a successful capture */}
          {result && !result.error && (
            <>
              <View style={s.statRow}>
                <Text style={s.stat}>{skeletons.length} skeletons</Text>
                <Text style={s.stat}>{result.viewportWidth} × {result.height} dp</Text>
              </View>

              {/* ── Save Descriptor (.ts) — recommended, cross-platform ── */}
              <Pressable
                style={[s.btn, s.btnDescriptor, (descState === 'saving' || skeletons.length === 0) && s.btnDisabled]}
                onPress={saveDescriptor}
                disabled={descState === 'saving' || skeletons.length === 0}
              >
                {descState === 'saving'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.btnText}>
                      {descState === 'ok' ? '✓  .ts Saved' : '↓  Save .ts  (Responsive)'}
                    </Text>}
              </Pressable>
              <Text style={s.btnSubtitle}>x/w scale on every device · pixel-perfect y/h</Text>

              {descMsg !== '' && (
                <Text style={[s.saveMsg, { color: descState === 'ok' ? '#22c55e' : '#ef4444' }]}>
                  {descMsg}
                </Text>
              )}

              {/* ── Save JSON — pixel-perfect on capture device ── */}
              <Pressable
                style={[s.btn, s.btnSave, (saveState === 'saving' || skeletons.length === 0) && s.btnDisabled]}
                onPress={save}
                disabled={saveState === 'saving' || skeletons.length === 0}
              >
                {saveState === 'saving'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.btnText}>
                      {saveState === 'ok' ? '✓  JSON Saved' : '↓  Save skeletons.json'}
                    </Text>}
              </Pressable>
              <Text style={s.btnSubtitle}>Pixel-perfect on capture device</Text>

              {saveMsg !== '' && (
                <Text style={[s.saveMsg, { color: saveState === 'ok' ? '#22c55e' : '#ef4444' }]}>
                  {saveMsg}
                </Text>
              )}

              {saveSnippet && (
                <SaveSnippet snippet={saveSnippet} />
              )}
            </>
          )}

          {result?.error && (
            <Text style={s.errorMsg}>{result.error}</Text>
          )}
        </ScrollView>
      </View>

      {/* ── Preview ─────────────────────────────────── */}
      <View style={s.preview}>
        {result && !result.error
          ? <SkeletonPreview result={result} skeletons={skeletons} onDelete={deleteSkeleton} />
          : (
            <View style={s.center}>
              <Text style={s.muted}>
                {!selected
                  ? 'Select a component from the sidebar'
                  : capturing
                    ? 'Measuring real layout…'
                    : 'Press Capture to inspect skeletons'}
              </Text>
            </View>
          )}
      </View>

    </View>
  );
}

// ── Save snippet card ─────────────────────────────────────────────────────────────

interface SnippetInfo { varName: string; importPath: string; filePath: string; isDescriptor: boolean }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    try { (navigator as any).clipboard?.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <Pressable onPress={copy} style={s.copyBtn}>
      <Text style={s.copyBtnText}>{copied ? '✓ Copied' : 'Copy'}</Text>
    </Pressable>
  );
}

function CodeLine({ children }: { children: string }) {
  return <Text style={s.snippetLine} selectable>{children}</Text>;
}

function SaveSnippet({ snippet }: { snippet: SnippetInfo }) {
  const importLine = `import ${snippet.varName} from ${snippet.importPath};`;
  const usageLine = [
    `<Skeleton`,
    `  initialSkeletons={${snippet.varName}}`,
    `  loading={loading}`,
    `>`,
    `  <YourComponent />`,
    `</Skeleton>`,
  ].join('\n');
  const fullSnippet = `${importLine}\n\n${usageLine}`;

  return (
    <View style={s.snippetBox}>
      {/* Header row */}
      <View style={s.snippetHeader}>
        <Text style={s.snippetTitle}>
          {snippet.isDescriptor ? '✅ Add to your screen:' : '📄 Add to your screen:'}
        </Text>
        <CopyButton text={fullSnippet} />
      </View>

      {/* Code block */}
      <View style={s.snippetCode}>
        <CodeLine>{importLine}</CodeLine>
        <View style={s.snippetSpacer} />
        <CodeLine>{'<Skeleton'}</CodeLine>
        <CodeLine>{`  initialSkeletons={${snippet.varName}}`}</CodeLine>
        <CodeLine>{'  loading={loading}'}</CodeLine>
        <CodeLine>{'>'}</CodeLine>
        <CodeLine>{'  <YourComponent />'}</CodeLine>
        <CodeLine>{'</Skeleton>'}</CodeLine>
      </View>

      {/* Hint */}
      <View style={s.snippetHint}>
        {snippet.isDescriptor ? (
          <Text style={s.snippetHintText}>
            {'x/w are percentages → scale on every screen size.\ny/h are exact dp from live layout measurement.'}
          </Text>
        ) : (
          <Text style={s.snippetHintText}>
            {'Pixel-perfect on capture device.\nUse '}
            <Text style={s.snippetHintBold}>Save .ts</Text>
            {' for responsive TypeScript version.'}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Skeleton canvas overlay ───────────────────────────────────────────────────────

interface SkeletonPreviewProps {
  result: CaptureResult;
  skeletons: IndexedSkeleton[];
  onDelete: (origIdx: number) => void;
}

function SkeletonPreview({ result, skeletons, onDelete }: SkeletonPreviewProps) {
  const canvasRef = useRef<any>(null);
  const MAX_W = 380;
  const scale = Math.min(1, MAX_W / result.viewportWidth);
  const cw = Math.round(result.viewportWidth * scale);
  const ch = Math.round(result.height * scale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, cw, ch);

    skeletons.forEach((skeleton, i) => {
      const x = (skeleton.x / 100) * cw;
      const y = skeleton.y * scale;
      const w = (skeleton.w / 100) * cw;
      const h = skeleton.h * scale;
      const r = skeleton.r === '50%'
        ? Math.min(w, h) / 2
        : Math.min(Number(skeleton.r) * scale, Math.min(w, h) / 2);

      const hue = (skeleton._origIdx * 41) % 360;
      ctx.fillStyle = `hsla(${hue}, 65%, 55%, ${skeleton.c ? 0.3 : 0.7})`;

      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      ctx.fill();

      // Index label (uses original index so it matches table)
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.font = `${Math.max(7, 9 * scale)}px monospace`;
      ctx.fillText(String(skeleton._origIdx), x + 3, y + 10 * scale);
    });
  }, [skeletons, cw, ch, scale]);

  return (
    <ScrollView contentContainerStyle={s.previewContent}>
      <Text style={s.previewTitle}>
        <Text style={{ fontWeight: '700' }}>{result.name}</Text>
        {'  ·  '}{result.viewportWidth}dp  ·  {skeletons.length} skeletons
        {scale < 1 ? `  (${Math.round(scale * 100)}% scale)` : ''}
      </Text>

      {/* @ts-ignore — canvas is valid DOM via react-native-web */}
      <canvas
        ref={canvasRef}
        width={cw}
        height={ch}
        style={{ border: '1px solid #d1d5db', borderRadius: 8, display: 'block' }}
      />

      <SkeletonTable skeletons={skeletons} onDelete={onDelete} />
    </ScrollView>
  );
}

interface SkeletonTableProps {
  skeletons: IndexedSkeleton[];
  onDelete: (origIdx: number) => void;
}

function SkeletonTable({ skeletons, onDelete }: SkeletonTableProps) {
  return (
    <View style={s.table}>
      <View style={[s.tableRow, s.tableHeader]}>
        {['#', 'x %', 'y dp', 'w %', 'h dp', 'r', 'type', ''].map((h) => (
          <Text key={h} style={[s.th, h === '' && s.thDel]}>{h}</Text>
        ))}
      </View>
      {skeletons.map((b, i) => (
        <View key={b._origIdx} style={[s.tableRow, i % 2 === 0 ? s.trEven : s.trOdd]}>
          <Text style={s.td}>{b._origIdx}</Text>
          <Text style={s.td}>{b.x}</Text>
          <Text style={s.td}>{b.y}</Text>
          <Text style={s.td}>{b.w}</Text>
          <Text style={s.td}>{b.h}</Text>
          <Text style={s.td}>{String(b.r)}</Text>
          <Text style={s.td}>{b.c ? 'ctnr' : 'leaf'}</Text>
          <Pressable
            style={s.tdDelBtn}
            onPress={() => onDelete(b._origIdx)}
            hitSlop={4}
          >
            {/* @ts-ignore — SVG is valid DOM via react-native-web */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
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

  sidebar: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    padding: 16,
    backgroundColor: '#fafafa',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 16 },
  label: {
    fontSize: 11, fontWeight: '600', color: '#6b7280',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6,
  },
  hint: { fontSize: 11, color: '#9ca3af', marginBottom: 14, marginTop: -4 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 5, fontSize: 12,
    fontFamily: 'monospace', marginBottom: 4, backgroundColor: '#fff',
  },
  hintBox: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 12 },
  hintText: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  code: { fontFamily: 'monospace', fontSize: 11, color: '#374151' },

  list: { gap: 4, marginBottom: 14 },
  listItem: { padding: 8, borderRadius: 6, backgroundColor: '#f3f4f6' },
  listItemActive: { backgroundColor: '#e0e7ff' },
  listItemText: { fontSize: 12, fontFamily: 'monospace', color: '#374151' },
  listItemTextActive: { color: '#3730a3', fontWeight: '600' },

  btn: {
    borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, flexDirection: 'row', gap: 6,
  },
  btnCapture: { backgroundColor: '#6366f1' },
  btnDescriptor: { backgroundColor: '#7c3aed' },
  btnSave: { backgroundColor: '#059669', marginTop: 4 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnSubtitle: { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: -6, marginBottom: 8 },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat: { fontSize: 11, fontFamily: 'monospace', color: '#374151' },

  saveMsg: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  errorMsg: { fontSize: 12, color: '#ef4444', marginTop: 8, lineHeight: 16 },

  snippetBox: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6ee7b7',
    backgroundColor: '#f0fdf4',
    overflow: 'hidden',
  },
  snippetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  snippetTitle: {
    fontSize: 13, fontWeight: '700', color: '#065f46', flex: 1,
  },
  copyBtn: {
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  copyBtnText: {
    color: '#fff', fontSize: 12, fontWeight: '600',
  },
  snippetCode: {
    backgroundColor: '#0d1117',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 1,
  },
  snippetSpacer: { height: 8 },
  snippetLine: { fontSize: 13, lineHeight: 20, fontFamily: 'monospace', color: '#e6edf3' },
  snippetKeyword: { color: '#cba6f7' },
  snippetVar: { color: '#89dceb' },
  snippetStr: { color: '#a6e3a1' },
  snippetTag: { color: '#89b4fa' },
  snippetAttr: { color: '#fab387' },
  snippetHint: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#bbf7d0',
  },
  snippetHintText: { fontSize: 12, color: '#047857', lineHeight: 18 },
  snippetHintBold: { fontWeight: '700' },
  snippetCode2: { fontFamily: 'monospace', fontSize: 12 },

  preview: { flex: 1, backgroundColor: '#fff' },
  previewContent: { padding: 20, gap: 16 },
  previewTitle: { fontSize: 13, color: '#374151' },

  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  tableHeader: { backgroundColor: '#f3f4f6' },
  trEven: { backgroundColor: '#fff' },
  trOdd: { backgroundColor: '#fafafa' },
  th: {
    flex: 1, fontSize: 11, fontWeight: '600', padding: 5,
    borderRightWidth: 1, borderRightColor: '#e5e7eb', color: '#374151',
  },
  td: {
    flex: 1, fontSize: 11, fontFamily: 'monospace', padding: 4,
    borderRightWidth: 1, borderRightColor: '#f3f4f6', color: '#111',
  },
  thDel: { flex: 0, width: 32 },
  tdDelBtn: {
    width: 32, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 4,
  },
});
