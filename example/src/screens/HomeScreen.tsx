import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenShell, useNavigation, type RouteName } from '../navigation';

const EXAMPLES: { route: RouteName; title: string; description: string; highlight?: boolean }[] = [
  {
    route: 'KitchenSink',
    title: '⬡ Kitchen Sink',
    description: 'All examples on one screen — global & per-section loading toggles, animation switcher',
    highlight: true,
  },
  { route: 'Card', title: 'Content Card', description: 'Image + title + body + author row' },
  { route: 'Feed', title: 'Social Feed', description: 'Posts with avatars, text, and images' },
  { route: 'Profile', title: 'Profile Card', description: 'Centred avatar, stats, and action buttons' },
  { route: 'ProductGrid', title: 'Product Grid', description: 'Two-column grid with image + price' },
  { route: 'Notifications', title: 'Notifications', description: 'Icon circle + title + body + timestamp' },
];

export function HomeScreen() {
  const { navigate } = useNavigation();

  return (
    <ScreenShell title="react-native-auto-shimmer">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Auto-generated skeleton screens from component descriptors.
          Tap an example to see it in action.
        </Text>
        {EXAMPLES.map((ex) => (
          <TouchableOpacity
            key={ex.route}
            style={[styles.row, ex.highlight && styles.rowHighlight]}
            onPress={() => navigate(ex.route)}
            activeOpacity={0.7}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, ex.highlight && styles.rowTitleHighlight]}>
                {ex.title}
              </Text>
              <Text style={[styles.rowDesc, ex.highlight && styles.rowDescHighlight]}>
                {ex.description}
              </Text>
            </View>
            <Text style={[styles.chevron, ex.highlight && styles.chevronHighlight]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowDesc: { fontSize: 13, color: '#888' },
  chevron: { fontSize: 22, color: '#bbb' },
  rowHighlight: {
    backgroundColor: '#6366f1',
  },
  rowTitleHighlight: { color: '#fff' },
  rowDescHighlight: { color: 'rgba(255,255,255,0.75)' },
  chevronHighlight: { color: 'rgba(255,255,255,0.6)' },
});
