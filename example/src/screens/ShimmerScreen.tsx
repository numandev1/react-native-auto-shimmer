import React, { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ShimmerOverlay, type ShimmerOverlayMode, type ShimmerOverlayDirection, type ShimmerOverlayRef } from 'react-native-auto-shimmer';
import { ScreenShell } from '../navigation';

// ── Demo section wrapper ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Demo card placeholder ─────────────────────────────────────────────────────

function Card({ style }: { style?: object }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.cardLine} />
        <View style={[styles.cardLine, { width: '60%' }]} />
        <View style={styles.cardFooter}>
          <View style={styles.cardAvatar} />
          <View style={[styles.cardLine, { flex: 1, marginBottom: 0 }]} />
        </View>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const MODES: ShimmerOverlayMode[] = ['normal', 'expand', 'shrink'];
const DIRECTIONS: ShimmerOverlayDirection[] = ['left-to-right', 'right-to-left'];

const COLORS = [
  { label: 'White', value: 'rgba(255, 255, 255, 0.8)' },
  { label: 'Gold', value: 'rgba(255, 200, 0, 0.7)' },
  { label: 'Blue', value: 'rgba(99, 102, 241, 0.7)' },
  { label: 'Pink', value: 'rgba(244, 114, 182, 0.7)' },
];

export function ShimmerScreen() {
  const [mode, setMode] = useState<ShimmerOverlayMode>('normal');
  const [direction, setDirection] = useState<ShimmerOverlayDirection>('left-to-right');
  const [colorIdx, setColorIdx] = useState(0);
  const [active, setActive] = useState(true);
  const [angle, setAngle] = useState(20);

  const shimmerRef = useRef<ShimmerOverlayRef>(null);
  const color = COLORS[colorIdx]!.value;

  return (
    <ScreenShell title="Overlay Shimmer Effect">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Controls ── */}
        <View style={styles.controlsBox}>
          {/* Mode */}
          <Text style={styles.controlLabel}>Mode</Text>
          <View style={styles.pills}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.pill, mode === m && styles.pillActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.pillText, mode === m && styles.pillTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Direction */}
          <Text style={styles.controlLabel}>Direction</Text>
          <View style={styles.pills}>
            {DIRECTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.pill, direction === d && styles.pillActive]}
                onPress={() => setDirection(d)}
              >
                <Text style={[styles.pillText, direction === d && styles.pillTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Color */}
          <Text style={styles.controlLabel}>Color</Text>
          <View style={styles.pills}>
            {COLORS.map((c, i) => (
              <TouchableOpacity
                key={c.label}
                style={[styles.pill, colorIdx === i && styles.pillActive]}
                onPress={() => setColorIdx(i)}
              >
                <Text style={[styles.pillText, colorIdx === i && styles.pillTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Angle */}
          <Text style={styles.controlLabel}>Angle: {angle}°</Text>
          <View style={styles.pills}>
            {[0, 10, 20, 35, 45].map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.pill, angle === a && styles.pillActive]}
                onPress={() => setAngle(a)}
              >
                <Text style={[styles.pillText, angle === a && styles.pillTextActive]}>{a}°</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.pills}>
            <TouchableOpacity
              style={[styles.pill, !active && styles.pillActive]}
              onPress={() => setActive((v) => !v)}
            >
              <Text style={[styles.pillText, !active && styles.pillTextActive]}>
                {active ? '⏸ Pause' : '▶ Resume'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pill} onPress={() => shimmerRef.current?.restart()}>
              <Text style={styles.pillText}>↺ Restart</Text>
            </TouchableOpacity>
          </View>
        </View>

          {/* ── Button highlight ── */}
          <Section title="Button Highlight">
          <View style={styles.buttonRow}>
            <ShimmerOverlay
              color="rgba(255, 255, 255, 0.6)"
              mode="normal"
              angle={30}
              active={active}
              duration={2000}
              delay={600}
            >
              <View style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </View>
            </ShimmerOverlay>

            <ShimmerOverlay
              color="rgba(255, 200, 0, 0.7)"
              mode="expand"
              angle={20}
              active={active}
              duration={1800}
              delay={800}
              initialDelay={300}
            >
              <View style={styles.goldButton}>
                <Text style={styles.goldButtonText}>⭐ Premium</Text>
              </View>
            </ShimmerOverlay>
          </View>
        </Section>

        {/* ── Live preview card ── */}
        <Section title="Live Preview">
          <ShimmerOverlay
            ref={shimmerRef}
            mode={mode}
            direction={direction}
            color={color}
            angle={angle}
            active={active}
            bandWidth={80}
            duration={1400}
          >
            <Card />
          </ShimmerOverlay>
        </Section>

        {/* ── Staggered list ── */}
        <Section title="Staggered List (initialDelay)">
          {[0, 200, 400, 600, 800].map((delay, i) => (
            <ShimmerOverlay
              key={i}
              color={color}
              angle={angle}
              active={active}
              initialDelay={delay}
              duration={1400}
              bandWidth={80}
            >
              <View style={styles.listRow}>
                <View style={styles.listAvatar} />
                <View style={styles.listLines}>
                  <View style={[styles.listLine, { width: `${75 - i * 5}%` }]} />
                  <View style={[styles.listLine, { width: `${45 - i * 3}%`, marginTop: 6 }]} />
                </View>
              </View>
            </ShimmerOverlay>
          ))}
        </Section>

        {/* ── Skeleton-style placeholders ── */}
        <Section title="Skeleton-style Placeholder">
          <ShimmerOverlay color="rgba(255,255,255,0.6)" angle={15} active={active} duration={1200} delay={300}>
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonBanner} />
              <View style={styles.skeletonBody}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '70%' }]} />
                <View style={[styles.skeletonLine, { width: '85%' }]} />
                <View style={styles.skeletonRow}>
                  <View style={styles.skeletonCircle} />
                  <View style={[styles.skeletonLine, { flex: 1, marginBottom: 0 }]} />
                </View>
              </View>
            </View>
          </ShimmerOverlay>
        </Section>

        {/* ── Programmatic control ── */}
        <Section title="Programmatic Control (ref)">
          <View style={styles.refButtons}>
            <TouchableOpacity style={styles.refBtn} onPress={() => shimmerRef.current?.start()}>
              <Text style={styles.refBtnText}>▶ start()</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refBtn} onPress={() => shimmerRef.current?.stop()}>
              <Text style={styles.refBtnText}>■ stop()</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refBtn} onPress={() => shimmerRef.current?.restart()}>
              <Text style={styles.refBtnText}>↺ restart()</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.refNote}>
            These buttons control the Live Preview card above via{' '}
            <Text style={styles.code}>useRef&lt;ShimmerOverlayRef&gt;</Text>
          </Text>
        </Section>

      </ScrollView>
    </ScreenShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 40 },

  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.6 },

  controlsBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  controlLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginTop: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  pillText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  pillTextActive: { color: '#fff' },

  // Live preview card
  card: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: { height: 160, backgroundColor: '#d1d5db' },
  cardBody: { padding: 14, gap: 0 },
  cardLine: { height: 14, backgroundColor: '#d1d5db', borderRadius: 6, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  cardAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#d1d5db' },

  // Staggered list
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    gap: 12,
    marginBottom: 6,
  },
  listAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#d1d5db' },
  listLines: { flex: 1 },
  listLine: { height: 13, backgroundColor: '#d1d5db', borderRadius: 6 },

  // Buttons
  buttonRow: { flexDirection: 'row', gap: 12 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  goldButton: {
    flex: 1,
    backgroundColor: '#1c1917',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  goldButtonText: { color: '#fbbf24', fontWeight: '700', fontSize: 15 },

  // Skeleton-style placeholder
  skeletonCard: {
    backgroundColor: '#e5e7eb',
    borderRadius: 14,
    overflow: 'hidden',
  },
  skeletonBanner: { height: 140, backgroundColor: '#d1d5db' },
  skeletonBody: { padding: 14, gap: 0 },
  skeletonLine: { height: 13, backgroundColor: '#d1d5db', borderRadius: 6, marginBottom: 10, width: '100%' },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  skeletonCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#d1d5db' },

  // Ref control
  refButtons: { flexDirection: 'row', gap: 8 },
  refBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  refBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  refNote: { fontSize: 12, color: '#888', lineHeight: 18 },
  code: { fontFamily: 'monospace', color: '#6366f1' },
});
