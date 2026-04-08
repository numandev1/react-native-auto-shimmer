/**
 * Kitchen Sink — every skeleton example on one scrollable screen.
 *
 * Global controls at the top let you toggle loading + cycle animation for
 * ALL sections at once. Each section also has its own individual toggle so
 * you can mix-and-match states and compare live content next to skeletons.
 */
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
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

// ── Skeletons (descriptor-driven — responsive on every device) ─────────────────────
import cardSkeletons from '../skeletons/card.skeletons';
import feedPostSkeletons from '../skeletons/feedPost.skeletons';
import feedPostTextSkeletons from '../skeletons/feedPostText.skeletons';
import profileSkeletons from '../skeletons/profile.skeletons';
import productItemSkeletons from '../skeletons/productItem.skeletons';
import notificationSkeletons from '../skeletons/notification.skeletons';

// ── Layout constants ───────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 16;
const GRID_GAP = 12;
const ITEM_W = (SCREEN_W - PAD * 2 - GRID_GAP) / 2;

const ANIM_ORDER: AnimationStyle[] = ['pulse', 'shimmer', 'solid'];
const ANIM_COLORS: Record<string, string> = {
  pulse: '#6366f1',
  shimmer: '#0ea5e9',
  solid: '#64748b',
  true: '#6366f1',
  false: '#64748b',
};

// ── Helper: section wrapper ────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  description: string;
  loading: boolean;
  onToggleLoading: (v: boolean) => void;
  children: React.ReactNode;
}

function Section({ title, description, loading, onToggleLoading, children }: SectionProps) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionMeta}>
          <Text style={s.sectionTitle}>{title}</Text>
          <Text style={s.sectionDesc}>{description}</Text>
        </View>
        <View style={s.sectionToggle}>
          <Text style={[s.sectionBadge, loading ? s.badgeOn : s.badgeOff]}>
            {loading ? 'loading' : 'live'}
          </Text>
          <Switch
            value={loading}
            onValueChange={onToggleLoading}
            trackColor={{ false: '#d1fae5', true: '#c7d2fe' }}
            thumbColor={loading ? '#6366f1' : '#059669'}
          />
        </View>
      </View>
      {children}
    </View>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────────

const CARD_DATA = {
  image: 'https://picsum.photos/seed/skeletonyard/680/383',
  title: 'Building Better Loading States',
  body: 'Skeleton screens reduce perceived loading time and improve perceived performance significantly.',
  author: 'Jane Smith',
  avatar: 'https://i.pravatar.cc/64?img=5',
};

const FEED_POSTS = [
  {
    id: 1,
    name: 'Alice Johnson',
    handle: '@alicej',
    avatar: 'https://i.pravatar.cc/80?img=1',
    text: 'Just shipped a huge perf improvement — cold start is 40% faster! 🚀',
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
    text: 'FlashList vs FlatList with 10k rows — FlashList wins every time. Migration takes 5 minutes.',
    image: null,
    likes: '891',
    comments: '74',
    time: '5h',
  },
];

const PROFILE = {
  name: 'Carol Martinez',
  handle: '@carolm',
  bio: 'Senior iOS Engineer · Open source contributor · Building fast UIs with React Native.',
  avatar: 'https://i.pravatar.cc/160?img=9',
  posts: '248',
  followers: '12.4k',
  following: '381',
};

const PRODUCTS = [
  { id: 1, title: 'Wireless Headphones', price: '$129', image: 'https://picsum.photos/seed/p1/400/400' },
  { id: 2, title: 'Mechanical Keyboard', price: '$89', image: 'https://picsum.photos/seed/p2/400/400' },
  { id: 3, title: 'USB-C Hub', price: '$49', image: 'https://picsum.photos/seed/p3/400/400' },
  { id: 4, title: 'Webcam 4K', price: '$199', image: 'https://picsum.photos/seed/p4/400/400' },
];

const NOTIFICATIONS = [
  { id: 1, icon: '❤️', title: 'Alice liked your post', body: '"Just shipped a huge performance…"', time: '1m' },
  { id: 2, icon: '💬', title: 'Bob replied to you', body: 'FlashList migration guide looks great!', time: '12m' },
  { id: 3, icon: '🔔', title: 'New follower: Carol Martinez', body: 'Carol started following you', time: '1h' },
];

// ── Content components ─────────────────────────────────────────────────────────

function CardContent() {
  return (
    <View>
      <Image source={{ uri: CARD_DATA.image }} style={s.cardImage} />
      <View style={s.cardBody}>
        <Text style={s.cardTitle}>{CARD_DATA.title}</Text>
        <Text style={s.cardText}>{CARD_DATA.body}</Text>
        <View style={s.authorRow}>
          <Image source={{ uri: CARD_DATA.avatar }} style={s.avatar32} />
          <Text style={s.authorName}>{CARD_DATA.author}</Text>
        </View>
      </View>
    </View>
  );
}

function FeedPostContent({ post }: { post: (typeof FEED_POSTS)[number] }) {
  return (
    <View style={s.feedPost}>
      <View style={s.feedHeader}>
        <Image source={{ uri: post.avatar }} style={s.avatar40} />
        <View style={s.feedMeta}>
          <Text style={s.feedName}>{post.name}</Text>
          <Text style={s.feedHandle}>{post.handle} · {post.time}</Text>
        </View>
      </View>
      <Text style={s.feedText}>{post.text}</Text>
      {post.image && <Image source={{ uri: post.image }} style={s.feedImage} />}
      <View style={s.feedEngagement}>
        <Text style={s.engText}>❤️ {post.likes}</Text>
        <Text style={s.engText}>💬 {post.comments}</Text>
        <Text style={s.engText}>↗ Share</Text>
      </View>
    </View>
  );
}

function ProfileContent() {
  return (
    <View style={s.profileContainer}>
      <Image source={{ uri: PROFILE.avatar }} style={s.profileAvatar} />
      <Text style={s.profileName}>{PROFILE.name}</Text>
      <Text style={s.profileHandle}>{PROFILE.handle}</Text>
      <Text style={s.profileBio}>{PROFILE.bio}</Text>
      <View style={s.statsRow}>
        {(['Posts', 'Followers', 'Following'] as const).map((label) => (
          <View key={label} style={s.statItem}>
            <Text style={s.statValue}>{PROFILE[label.toLowerCase() as 'posts' | 'followers' | 'following']}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={s.profileButtons}>
        <TouchableOpacity style={[s.profileBtn, s.primaryBtn]}>
          <Text style={s.primaryBtnText}>Follow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.profileBtn, s.secondaryBtn]}>
          <Text style={s.secondaryBtnText}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProductContent({ product }: { product: (typeof PRODUCTS)[number] }) {
  return (
    <View style={s.productInner}>
      <Image source={{ uri: product.image }} style={s.productImage} />
      <Text style={s.productTitle}>{product.title}</Text>
      <Text style={s.productPrice}>{product.price}</Text>
    </View>
  );
}

function NotifContent({ notif }: { notif: (typeof NOTIFICATIONS)[number] }) {
  return (
    <View style={s.notifRow}>
      <View style={s.notifIcon}>
        <Text style={s.notifEmoji}>{notif.icon}</Text>
      </View>
      <View style={s.notifBody}>
        <Text style={s.notifTitle}>{notif.title}</Text>
        <Text style={s.notifText}>{notif.body}</Text>
      </View>
      <Text style={s.notifTime}>{notif.time}</Text>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

type SectionKey = 'card' | 'feed' | 'profile' | 'products' | 'notifications';

const SECTION_KEYS: SectionKey[] = ['card', 'feed', 'profile', 'products', 'notifications'];

export function KitchenSinkScreen() {
  const [globalLoading, setGlobalLoading] = useState(true);
  const [animStyle, setAnimStyle] = useState<AnimationStyle>('pulse');
  const [autoStop, setAutoStop] = useState(true);
  const [sectionLoading, setSectionLoading] = useState<Record<SectionKey, boolean>>({
    card: true,
    feed: true,
    profile: true,
    products: true,
    notifications: true,
  });

  // Sync global toggle → all sections
  useEffect(() => {
    setSectionLoading({
      card: globalLoading,
      feed: globalLoading,
      profile: globalLoading,
      products: globalLoading,
      notifications: globalLoading,
    });
  }, [globalLoading]);

  useEffect(() => {
    if (!autoStop || !globalLoading) return;
    const t = setTimeout(() => setGlobalLoading(false), 3000);
    return () => clearTimeout(t);
  }, [globalLoading, autoStop]);

  // Auto-turn-off each section individually after 3 s
  useEffect(() => {
    if (!autoStop) return;
    const timers = SECTION_KEYS.filter((k) => sectionLoading[k]).map((k) =>
      setTimeout(
        () => setSectionLoading((prev) => ({ ...prev, [k]: false })),
        3000,
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [sectionLoading, autoStop]);

  const cycleAnim = () =>
    setAnimStyle((prev) => {
      const idx = ANIM_ORDER.indexOf(prev);
      return ANIM_ORDER[(idx + 1) % ANIM_ORDER.length]!;
    });

  const toggleSection = (key: SectionKey) => (v: boolean) => {
    setSectionLoading((prev) => ({ ...prev, [key]: v }));
  };

  const allLoading = SECTION_KEYS.every((k) => sectionLoading[k]);
  const anyLoading = SECTION_KEYS.some((k) => sectionLoading[k]);

  return (
    <ScreenShell title="Kitchen Sink">
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>

        {/* ── Global controls ─────────────────────────────────────────────── */}
        <View style={s.globalControls}>
          <Text style={s.globalLabel}>Global controls</Text>

          <View style={s.globalRow}>
            <View style={s.globalLeft}>
              <Text style={s.controlTitle}>All sections</Text>
              <Text style={s.controlSub}>
                {allLoading ? 'All showing skeletons' : anyLoading ? 'Some sections loading' : 'All showing live content'}
              </Text>
            </View>
            <Switch
              value={allLoading}
              onValueChange={setGlobalLoading}
              trackColor={{ false: '#d1fae5', true: '#c7d2fe' }}
              thumbColor={allLoading ? '#6366f1' : '#059669'}
            />
          </View>

          <View style={s.divider} />

          <View style={s.globalRow}>
            <View style={s.globalLeft}>
              <Text style={s.controlTitle}>Animation</Text>
              <Text style={s.controlSub}>Applies to all sections</Text>
            </View>
            <TouchableOpacity
              onPress={cycleAnim}
              style={[s.animPill, { backgroundColor: ANIM_COLORS[String(animStyle)] }]}
            >
              <Text style={s.animPillText}>{animStyle}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          <View style={s.globalRow}>
            <View style={s.globalLeft}>
              <Text style={s.controlTitle}>Auto-stop after 3 s</Text>
              <Text style={s.controlSub}>
                {autoStop ? 'Skeletons turn off automatically' : 'Stays loading until toggled off'}
              </Text>
            </View>
            <Switch
              value={autoStop}
              onValueChange={setAutoStop}
              trackColor={{ false: '#fee2e2', true: '#d1fae5' }}
              thumbColor={autoStop ? '#059669' : '#ef4444'}
            />
          </View>

          {/* Quick-toggle chips per section */}
          <View style={s.divider} />
          <Text style={s.controlTitle}>Per-section toggles</Text>
          <View style={s.chips}>
            {SECTION_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                style={[s.chip, sectionLoading[key] ? s.chipOn : s.chipOff]}
                onPress={() => toggleSection(key)(!sectionLoading[key])}
              >
                <Text style={[s.chipText, sectionLoading[key] ? s.chipTextOn : s.chipTextOff]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 1. Content Card ─────────────────────────────────────────────── */}
        <Section
          title="Content Card"
          description="Image · title · body · author avatar"
          loading={sectionLoading.card}
          onToggleLoading={toggleSection('card')}
        >
          <Skeleton
            initialSkeletons={cardSkeletons}
            loading={sectionLoading.card}
            animate={animStyle}
            style={s.card}
          >
            <SkeletonCapture name="card">
              <CardContent />
            </SkeletonCapture>
          </Skeleton>
        </Section>

        {/* ── 2. Social Feed ──────────────────────────────────────────────── */}
        <Section
          title="Social Feed"
          description="Posts with avatars, images, and engag row"
          loading={sectionLoading.feed}
          onToggleLoading={toggleSection('feed')}
        >
          <View style={s.gap8}>
            {FEED_POSTS.map((post) => {
              const hasImg = !!post.image;
              return (
                <Skeleton
                  key={post.id}
                  initialSkeletons={hasImg ? feedPostSkeletons : feedPostTextSkeletons}
                  loading={sectionLoading.feed}
                  animate={animStyle}
                  style={s.card}
                >
                  <SkeletonCapture name={hasImg ? 'feedPost' : 'feedPostText'}>
                    <FeedPostContent post={post} />
                  </SkeletonCapture>
                </Skeleton>
              );
            })}
          </View>
        </Section>

        {/* ── 3. Profile Card ─────────────────────────────────────────────── */}
        <Section
          title="Profile Card"
          description="Centred avatar · stats row · action buttons"
          loading={sectionLoading.profile}
          onToggleLoading={toggleSection('profile')}
        >
          <Skeleton
            initialSkeletons={profileSkeletons}
            loading={sectionLoading.profile}
            animate={animStyle}
            style={s.card}
          >
            <SkeletonCapture name="profile">
              <ProfileContent />
            </SkeletonCapture>
          </Skeleton>
        </Section>

        {/* ── 4. Product Grid ─────────────────────────────────────────────── */}
        <Section
          title="Product Grid"
          description="Two-column grid · square image · price label"
          loading={sectionLoading.products}
          onToggleLoading={toggleSection('products')}
        >
          <View style={s.grid}>
            {PRODUCTS.map((product, index) => (
              <Skeleton
                key={product.id}
                initialSkeletons={productItemSkeletons}
                loading={sectionLoading.products}
                animate={animStyle}
                style={s.productItem}
              >
                {index === 0 ? (
                  <SkeletonCapture name="productItem">
                    <ProductContent product={product} />
                  </SkeletonCapture>
                ) : (
                  <ProductContent product={product} />
                )}
              </Skeleton>
            ))}
          </View>
        </Section>

        {/* ── 5. Notifications ────────────────────────────────────────────── */}
        <Section
          title="Notifications"
          description="Icon circle · title · body text · timestamp"
          loading={sectionLoading.notifications}
          onToggleLoading={toggleSection('notifications')}
        >
          <View style={s.card}>
            {NOTIFICATIONS.map((notif, index) => (
              <React.Fragment key={notif.id}>
                {index > 0 && <View style={s.notifDivider} />}
                <Skeleton
                  initialSkeletons={notificationSkeletons}
                  loading={sectionLoading.notifications}
                  animate={animStyle}
                >
                  {index === 0 ? (
                    <SkeletonCapture name="notification">
                      <NotifContent notif={notif} />
                    </SkeletonCapture>
                  ) : (
                    <NotifContent notif={notif} />
                  )}
                </Skeleton>
              </React.Fragment>
            ))}
          </View>
        </Section>

      </ScrollView>
    </ScreenShell>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { padding: PAD, gap: 20, paddingBottom: 40 },

  // Global controls card
  globalControls: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  globalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  globalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  globalLeft: { gap: 2, flex: 1, marginRight: 12 },
  controlTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  controlSub: { fontSize: 12, color: '#888' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb' },
  animPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 76,
    alignItems: 'center',
  },
  animPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5 },
  chipOn: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  chipOff: { backgroundColor: '#f0fdf4', borderColor: '#059669' },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: '#4338ca' },
  chipTextOff: { color: '#047857' },

  // Section wrapper
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionMeta: { flex: 1, gap: 1, marginRight: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  sectionDesc: { fontSize: 12, color: '#888' },
  sectionToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeOn: { backgroundColor: '#eef2ff', color: '#4338ca' },
  badgeOff: { backgroundColor: '#dcfce7', color: '#166534' },

  // Shared card shell
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  gap8: { gap: 8 },

  // Card content
  cardImage: { width: '100%', aspectRatio: 16 / 9 },
  cardBody: { padding: 16, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  cardText: { fontSize: 14, color: '#555', lineHeight: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  avatar32: { width: 32, height: 32, borderRadius: 16 },
  authorName: { fontSize: 14, fontWeight: '600', color: '#333' },

  // Feed
  feedPost: { padding: 16, gap: 10 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar40: { width: 40, height: 40, borderRadius: 20 },
  feedMeta: { gap: 2 },
  feedName: { fontSize: 15, fontWeight: '600', color: '#111' },
  feedHandle: { fontSize: 13, color: '#888' },
  feedText: { fontSize: 14, color: '#333', lineHeight: 20 },
  feedImage: { width: '100%', aspectRatio: 680 / 400, borderRadius: 12 },
  feedEngagement: { flexDirection: 'row', gap: 20 },
  engText: { fontSize: 14, color: '#666' },

  // Profile
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
  profileBtn: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#111' },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  secondaryBtn: { backgroundColor: '#f0f0f0' },
  secondaryBtnText: { color: '#333', fontWeight: '600', fontSize: 14 },

  // Product grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  productItem: { width: ITEM_W, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  productInner: { padding: 10, gap: 6 },
  productImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  productTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#111' },

  // Notifications
  notifDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e8e8e8', marginLeft: 68 },
  notifRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifEmoji: { fontSize: 18 },
  notifBody: { flex: 1, gap: 2 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  notifText: { fontSize: 13, color: '#666' },
  notifTime: { fontSize: 12, color: '#999' },
});
