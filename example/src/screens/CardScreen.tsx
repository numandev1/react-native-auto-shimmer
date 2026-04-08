import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Skeleton,
  SkeletonCapture,
  type AnimationStyle,
} from 'react-native-auto-shimmer';
import { ScreenShell } from '../navigation';
import cardSkeletons from '../skeletons/card.skeletons';

const PAD = 16;

const CARD_DATA = {
  image: 'https://picsum.photos/seed/skeletonyard/680/383',
  title: 'Building Better Loading States',
  body: 'Skeleton screens reduce perceived loading time and improve perceived performance.',
  author: 'Jane Smith',
  avatar: 'https://i.pravatar.cc/64?img=5',
};

function CardContent() {
  return (
    <View>
      <Image source={{ uri: CARD_DATA.image }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{CARD_DATA.title}</Text>
        <Text style={styles.cardText}>{CARD_DATA.body}</Text>
        <View style={styles.authorRow}>
          <Image source={{ uri: CARD_DATA.avatar }} style={styles.avatar32} />
          <Text style={styles.authorName}>{CARD_DATA.author}</Text>
        </View>
      </View>
    </View>
  );
}

export function CardScreen() {
  const [loading, setLoading] = useState(true);
  const [animStyle, setAnimStyle] = useState<AnimationStyle>('pulse');

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), 3000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [loading]);

  const cycleAnim = () =>
    setAnimStyle((p) => (p === 'pulse' ? 'shimmer' : p === 'shimmer' ? 'solid' : 'pulse'));

  return (
    <ScreenShell title="Content Card">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.controls}>
          <View style={styles.row}>
            <Text style={styles.label}>Loading</Text>
            <Switch value={loading} onValueChange={setLoading} />
          </View>
          <TouchableOpacity onPress={cycleAnim} style={styles.pill}>
            <Text style={styles.pillText}>Animation: {String(animStyle)}</Text>
          </TouchableOpacity>
        </View>

        {/* Skeleton handles the loading overlay; SkeletonCapture sits inside so
            Rozenite measures the real content geometry (not Skeleton internals) */}
        <Skeleton initialSkeletons={cardSkeletons} loading={loading} animate={animStyle} style={styles.card}>
          <SkeletonCapture name="card">
            <CardContent />
          </SkeletonCapture>
        </Skeleton>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: PAD, gap: 12 },
  controls: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, color: '#333' },
  pill: {
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  capturePill: { backgroundColor: '#5b21b6' },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  cardImage: { width: '100%', aspectRatio: 16 / 9 },
  cardBody: { padding: 16, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  cardText: { fontSize: 14, color: '#555', lineHeight: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  avatar32: { width: 32, height: 32, borderRadius: 16 },
  authorName: { fontSize: 14, fontWeight: '600', color: '#333' },
});
