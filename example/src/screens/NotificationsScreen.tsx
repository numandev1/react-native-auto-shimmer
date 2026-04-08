import React, { useEffect, useState } from 'react';
import {
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
import notificationSkeletons from '../skeletons/notification.skeletons';

const PAD = 16;

const NOTIFICATIONS = [
  {
    id: 1,
    icon: '❤️',
    title: 'Alice liked your post',
    body: '"Just shipped a huge performance…"',
    time: '1m',
  },
  {
    id: 2,
    icon: '💬',
    title: 'Bob replied to you',
    body: 'FlashList migration guide looks great!',
    time: '12m',
  },
  {
    id: 3,
    icon: '🔔',
    title: 'New follower: Carol Martinez',
    body: 'Carol started following you',
    time: '1h',
  },
];

interface NotifProps {
  notif: (typeof NOTIFICATIONS)[number];
}

function NotifContent({ notif }: NotifProps) {
  return (
    <View style={styles.notifRow}>
      <View style={styles.notifIcon}>
        <Text style={styles.notifEmoji}>{notif.icon}</Text>
      </View>
      <View style={styles.notifBody}>
        <Text style={styles.notifTitle}>{notif.title}</Text>
        <Text style={styles.notifText}>{notif.body}</Text>
      </View>
      <Text style={styles.notifTime}>{notif.time}</Text>
    </View>
  );
}

export function NotificationsScreen() {
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
    <ScreenShell title="Notifications">
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

        <View style={styles.card}>
          {NOTIFICATIONS.map((notif, index) => (
            <React.Fragment key={notif.id}>
              {index > 0 && <View style={styles.divider} />}
              <Skeleton initialSkeletons={notificationSkeletons} loading={loading} animate={animStyle}>
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8e8e8',
    marginLeft: 68,
  },
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
