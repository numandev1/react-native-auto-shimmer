import React, { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ShimmerPlaceholder,
  type ShimmerPlaceholderRef,
} from 'react-native-auto-shimmer';
import { ScreenShell } from '../navigation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ShimmerPlaceholderScreen() {
  const [visible, setVisible] = useState(false);
  const [reversed, setReversed] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const controlRef = useRef<ShimmerPlaceholderRef>(null);

  return (
    <ScreenShell title="Shimmer Placeholder">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Controls ── */}
        <View style={styles.controls}>
          <Text style={styles.controlLabel}>Speed</Text>
          <View style={styles.pills}>
            {[2000, 1000, 600, 300].map((ms) => (
              <TouchableOpacity
                key={ms}
                style={[styles.pill, speed === ms && styles.pillOn]}
                onPress={() => setSpeed(ms)}
              >
                <Text style={[styles.pillTxt, speed === ms && styles.pillTxtOn]}>{ms}ms</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.pills}>
            <TouchableOpacity
              style={[styles.pill, reversed && styles.pillOn]}
              onPress={() => setReversed((v) => !v)}
            >
              <Text style={[styles.pillTxt, reversed && styles.pillTxtOn]}>⇄ Reversed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, visible && styles.pillOn]}
              onPress={() => setVisible((v) => !v)}
            >
              <Text style={[styles.pillTxt, visible && styles.pillTxtOn]}>
                {visible ? '✅ Content visible' : '⬜ Placeholder visible'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pills}>
            <TouchableOpacity style={styles.pill} onPress={() => controlRef.current?.stop()}>
              <Text style={styles.pillTxt}>⏸ Stop</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pill} onPress={() => controlRef.current?.start()}>
              <Text style={styles.pillTxt}>▶ Start</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Basic shapes ── */}
        <Section title="Basic Shapes">
          {/* Text lines */}
          <ShimmerPlaceholder width={280} height={14} isReversed={reversed} duration={speed} />
          <View style={{ height: 8 }} />
          <ShimmerPlaceholder width={220} height={14} isReversed={reversed} duration={speed} />
          <View style={{ height: 8 }} />
          <ShimmerPlaceholder width={180} height={14} isReversed={reversed} duration={speed} />

          <View style={{ height: 16 }} />

          {/* Avatar circle */}
          <Row>
            <ShimmerPlaceholder
              width={48} height={48}
              style={{ borderRadius: 24 }}
              isReversed={reversed} duration={speed}
            />
            <View style={{ marginLeft: 12, gap: 8, justifyContent: 'center' }}>
              <ShimmerPlaceholder width={140} height={14} isReversed={reversed} duration={speed} />
              <ShimmerPlaceholder width={100} height={12} isReversed={reversed} duration={speed} />
            </View>
          </Row>

          <View style={{ height: 12 }} />

          {/* Image block */}
          <ShimmerPlaceholder
            width={320} height={160}
            style={{ borderRadius: 10 }}
            isReversed={reversed} duration={speed}
          />
        </Section>

        {/* ── Card skeleton ── */}
        <Section title="Card Skeleton">
          <View style={styles.card}>
            {/* Thumbnail */}
            <ShimmerPlaceholder width={80} height={80} style={{ borderRadius: 8 }} isReversed={reversed} duration={speed} />
            <View style={{ flex: 1, marginLeft: 12, gap: 8, justifyContent: 'center' }}>
              <ShimmerPlaceholder width={160} height={16} isReversed={reversed} duration={speed} />
              <ShimmerPlaceholder width={120} height={12} isReversed={reversed} duration={speed} />
              <ShimmerPlaceholder width={80}  height={12} isReversed={reversed} duration={speed} />
            </View>
          </View>
        </Section>

        {/* ── Feed skeleton ── */}
        <Section title="Feed Skeleton">
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.feedItem, i > 0 && { marginTop: 16 }]}>
              <ShimmerPlaceholder width={40} height={40} style={{ borderRadius: 20 }} isReversed={reversed} duration={speed} />
              <View style={{ flex: 1, marginLeft: 10, gap: 7 }}>
                <ShimmerPlaceholder width={120} height={13} isReversed={reversed} duration={speed} />
                <ShimmerPlaceholder width={'100%' as any} height={11} isReversed={reversed} duration={speed} />
                <ShimmerPlaceholder width={'85%' as any}  height={11} isReversed={reversed} duration={speed} />
              </View>
            </View>
          ))}
        </Section>

        {/* ── Visible toggle (real content shown when visible=true) ── */}
        <Section title="Visible Toggle">
          <Text style={styles.hint}>
            Toggle "Content visible" in Controls above to switch between placeholder and real content.
          </Text>
          <ShimmerPlaceholder
            width={260} height={18}
            isReversed={reversed}
            duration={speed}
            visible={visible}
            shimmerStyle={{ borderRadius: 4 }}
          >
            <Text style={styles.realContent}>✅ Real content loaded!</Text>
          </ShimmerPlaceholder>
        </Section>

        {/* ── Custom colours ── */}
        <Section title="Custom Colours">
          {/* Blue */}
          <ShimmerPlaceholder
            width={280} height={20}
            shimmerColors={['#bfdbfe', '#93c5fd', '#bfdbfe']}
            style={{ borderRadius: 4 }}
            isReversed={reversed} duration={speed}
          />
          <View style={{ height: 10 }} />
          {/* Purple */}
          <ShimmerPlaceholder
            width={240} height={20}
            shimmerColors={['#e9d5ff', '#c084fc', '#e9d5ff']}
            style={{ borderRadius: 4 }}
            isReversed={reversed} duration={speed}
          />
          <View style={{ height: 10 }} />
          {/* Warm / sepia */}
          <ShimmerPlaceholder
            width={200} height={20}
            shimmerColors={['#fde68a', '#fbbf24', '#fde68a']}
            style={{ borderRadius: 4 }}
            isReversed={reversed} duration={speed}
          />
        </Section>

        {/* ── Dark mode style ── */}
        <Section title="Dark Mode Style">
          <View style={styles.darkCard}>
            <ShimmerPlaceholder
              width={52} height={52}
              shimmerColors={['#374151', '#4b5563', '#374151']}
              style={{ borderRadius: 26 }}
              isReversed={reversed} duration={speed}
            />
            <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
              <ShimmerPlaceholder
                width={160} height={14}
                shimmerColors={['#374151', '#4b5563', '#374151']}
                isReversed={reversed} duration={speed}
              />
              <ShimmerPlaceholder
                width={110} height={12}
                shimmerColors={['#374151', '#4b5563', '#374151']}
                isReversed={reversed} duration={speed}
              />
            </View>
          </View>
        </Section>

        {/* ── Programmatic ref ── */}
        <Section title="Programmatic Control (ref)">
          <Text style={styles.hint}>Use Stop / Start buttons in Controls above to control this.</Text>
          <ShimmerPlaceholder
            ref={controlRef}
            width={280} height={20}
            shimmerColors={['#e0e7ff', '#818cf8', '#e0e7ff']}
            style={{ borderRadius: 4 }}
            isReversed={reversed}
            duration={speed}
            stopAutoRun={false}
          />
        </Section>

        {/* ── Product grid skeleton ── */}
        <Section title="Product Grid Skeleton">
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.gridItem}>
                <ShimmerPlaceholder width={140} height={140} style={{ borderRadius: 8 }} isReversed={reversed} duration={speed} />
                <View style={{ height: 8 }} />
                <ShimmerPlaceholder width={120} height={13} isReversed={reversed} duration={speed} />
                <View style={{ height: 6 }} />
                <ShimmerPlaceholder width={70}  height={13} isReversed={reversed} duration={speed} />
              </View>
            ))}
          </View>
        </Section>

      </ScrollView>
    </ScreenShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 48 },

  controls: {
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
  controlLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#f3f4f6',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillOn: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  pillTxt: { fontSize: 12, color: '#374151', fontWeight: '500' },
  pillTxtOn: { color: '#fff' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#6366f1',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14,
  },

  row: { flexDirection: 'row', alignItems: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },

  feedItem: { flexDirection: 'row', alignItems: 'flex-start' },

  darkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
  },

  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 10 },
  realContent: { fontSize: 16, color: '#22c55e', fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { alignItems: 'flex-start' },
});
