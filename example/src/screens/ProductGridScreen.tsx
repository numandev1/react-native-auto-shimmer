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
import productItemSkeletons from '../skeletons/productItem.skeletons.json';

const W = Dimensions.get('window').width;
const PAD = 16;
const CW = W - PAD * 2;
const GRID_GAP = 12;
const ITEM_W = (CW - GRID_GAP) / 2;

const PRODUCTS = [
  {
    id: 1,
    title: 'Wireless Headphones',
    price: '$129',
    image: 'https://picsum.photos/seed/p1/400/400',
  },
  {
    id: 2,
    title: 'Mechanical Keyboard',
    price: '$89',
    image: 'https://picsum.photos/seed/p2/400/400',
  },
  { id: 3, title: 'USB-C Hub', price: '$49', image: 'https://picsum.photos/seed/p3/400/400' },
  { id: 4, title: 'Webcam 4K', price: '$199', image: 'https://picsum.photos/seed/p4/400/400' },
];

interface ProductProps {
  product: (typeof PRODUCTS)[number];
}

function ProductContent({ product }: ProductProps) {
  return (
    <View style={styles.productInner}>
      <Image source={{ uri: product.image }} style={styles.productImage} />
      <Text style={styles.productTitle}>{product.title}</Text>
      <Text style={styles.productPrice}>{product.price}</Text>
    </View>
  );
}

export function ProductGridScreen() {
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
    <ScreenShell title="Product Grid">
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

        <View style={styles.grid}>
          {/* First item is always wrapped in SkeletonCapture for Rozenite inspection */}
          {PRODUCTS.map((product, index) => (
            <Skeleton
              key={product.id}
              initialSkeletons={productItemSkeletons}
              loading={loading}
              animate={animStyle}
              style={styles.productItem}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  productItem: { width: ITEM_W, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  productInner: { padding: 10, gap: 6 },
  productImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  productTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#111' },
});
