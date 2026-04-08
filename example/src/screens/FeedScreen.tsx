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
import feedPostSkeletons from '../skeletons/feedPost.skeletons';
import feedPostTextSkeletons from '../skeletons/feedPostText.skeletons';

const PAD = 16;

const FEED_POSTS = [
  {
    id: 1,
    name: 'Alice Johnson',
    handle: '@alicej',
    avatar: 'https://i.pravatar.cc/80?img=1',
    text: 'Just shipped a huge performance improvement — cold start is now 40% faster! 🚀 Reanimated worklets running fully on the UI thread made all the difference.',
    image: 'https://picsum.photos/seed/post1/680/400',
    likes: '2.4k',
    comments: '138',
    time: '2h',
  },
  {
    id: 2,
    name: 'Bob Williams',
    handle: '@bobw',
    avatar: 'https://i.pravatar.cc/80?img=3',
    text: 'FlashList vs FlatList — tested both with 10k rows. FlashList wins every time. Migration takes 5 minutes and FPS goes from 35 to 60.',
    image: null,
    likes: '891',
    comments: '74',
    time: '5h',
  },
];

interface PostProps {
  post: (typeof FEED_POSTS)[number];
}

function FeedPostContent({ post }: PostProps) {
  return (
    <View style={styles.feedPost}>
      <View style={styles.feedHeader}>
        <Image source={{ uri: post.avatar }} style={styles.avatar40} />
        <View style={styles.feedMeta}>
          <Text style={styles.feedName}>{post.name}</Text>
          <Text style={styles.feedHandle}>
            {post.handle} · {post.time}
          </Text>
        </View>
      </View>
      <Text style={styles.feedText}>{post.text}</Text>
      {post.image && <Image source={{ uri: post.image }} style={styles.feedImage} />}
      <View style={styles.feedEngagement}>
        <Text style={styles.engagementText}>❤️ {post.likes}</Text>
        <Text style={styles.engagementText}>💬 {post.comments}</Text>
        <Text style={styles.engagementText}>↗ Share</Text>
      </View>
    </View>
  );
}

export function FeedScreen() {
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
    <ScreenShell title="Social Feed">
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

        {/* SkeletonCapture always wraps each post so Rozenite can inspect them */}
        {FEED_POSTS.map((post) => {
          const hasImg = !!post.image;
          return (
            <Skeleton
              key={post.id}
              initialSkeletons={hasImg ? feedPostSkeletons : feedPostTextSkeletons}
              loading={loading}
              animate={animStyle}
              style={styles.card}
            >
              <SkeletonCapture name={hasImg ? 'feedPost' : 'feedPostText'}>
                <FeedPostContent post={post} />
              </SkeletonCapture>
            </Skeleton>
          );
        })}
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
  feedPost: { padding: 16, gap: 10 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar40: { width: 40, height: 40, borderRadius: 20 },
  feedMeta: { gap: 2 },
  feedName: { fontSize: 15, fontWeight: '600', color: '#111' },
  feedHandle: { fontSize: 13, color: '#888' },
  feedText: { fontSize: 14, color: '#333', lineHeight: 20 },
  feedImage: { width: '100%', aspectRatio: 680 / 400, borderRadius: 12 },
  feedEngagement: { flexDirection: 'row', gap: 20 },
  engagementText: { fontSize: 14, color: '#666' },
});
