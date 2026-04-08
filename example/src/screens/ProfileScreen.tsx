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
import profileSkeletons from '../skeletons/profile.skeletons';

const PAD = 16;

const PROFILE = {
  name: 'Carol Martinez',
  handle: '@carolm',
  bio: 'Senior iOS Engineer · Open source contributor · Building fast UIs with React Native.',
  avatar: 'https://i.pravatar.cc/160?img=9',
  posts: '248',
  followers: '12.4k',
  following: '381',
};

function ProfileContent() {
  return (
    <View style={styles.profileContainer}>
      <Image source={{ uri: PROFILE.avatar }} style={styles.profileAvatar} />
      <Text style={styles.profileName}>{PROFILE.name}</Text>
      <Text style={styles.profileHandle}>{PROFILE.handle}</Text>
      <Text style={styles.profileBio}>{PROFILE.bio}</Text>
      <View style={styles.statsRow}>
        {(
          [
            ['Posts', PROFILE.posts],
            ['Followers', PROFILE.followers],
            ['Following', PROFILE.following],
          ] as const
        ).map(([label, val]) => (
          <View key={label} style={styles.statItem}>
            <Text style={styles.statValue}>{val}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.profileButtons}>
        <TouchableOpacity style={[styles.profileBtn, styles.primaryBtn]}>
          <Text style={styles.primaryBtnText}>Follow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.profileBtn, styles.secondaryBtn]}>
          <Text style={styles.secondaryBtnText}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ProfileScreen() {
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
    <ScreenShell title="Profile Card">
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

        <Skeleton initialSkeletons={profileSkeletons} loading={loading} animate={animStyle} style={styles.card}>
          <SkeletonCapture name="profile">
            <ProfileContent />
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
  pillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  profileContainer: { padding: 20, alignItems: 'center', gap: 8 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111' },
  profileHandle: { fontSize: 14, color: '#888' },
  profileBio: { fontSize: 14, color: '#555', lineHeight: 20, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111' },
  statLabel: { fontSize: 12, color: '#888' },
  profileButtons: { flexDirection: 'row', gap: 12, marginTop: 4, width: '100%' },
  profileBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: { backgroundColor: '#111' },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  secondaryBtn: { backgroundColor: '#f0f0f0' },
  secondaryBtnText: { color: '#333', fontWeight: '600', fontSize: 14 },
});
