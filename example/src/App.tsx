import React from 'react';
import { Navigator } from './navigation';
import { HomeScreen } from './screens/HomeScreen';
import { CardScreen } from './screens/CardScreen';
import { FeedScreen } from './screens/FeedScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ProductGridScreen } from './screens/ProductGridScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { KitchenSinkScreen } from './screens/KitchenSinkScreen';
import { ShimmerScreen } from './screens/ShimmerScreen';
import { ShimmerPlaceholderScreen } from './screens/ShimmerPlaceholderScreen';

// Wire up the Rozenite Skeleton Inspector plugin in dev mode.
// getRozeniteDevToolsClient connects to the DevTools via the Fusebox dispatcher,
// then setupPlugin registers event handlers and starts broadcasting the registry.
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getRozeniteDevToolsClient } = require('@rozenite/plugin-bridge');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const setupPlugin = require('react-native-auto-shimmer-rozenite-plugin').default;
  getRozeniteDevToolsClient('react-native-auto-shimmer')
    .then((client: any) => {
      setupPlugin(client);
      console.log('[SkeletonInspector] Plugin connected to DevTools ✓');
    })
    .catch((e: any) => {
      console.warn('[SkeletonInspector] Could not connect to DevTools plugin:', e?.message ?? e);
    });
}

export default function App() {
  return (
    <Navigator>
      {(screen) => {
        switch (screen) {
          case 'Card':         return <CardScreen />;
          case 'Feed':         return <FeedScreen />;
          case 'Profile':      return <ProfileScreen />;
          case 'ProductGrid':  return <ProductGridScreen />;
          case 'Notifications': return <NotificationsScreen />;
          case 'KitchenSink':  return <KitchenSinkScreen />;
          case 'Shimmer':      return <ShimmerScreen />;
          case 'ShimmerPlaceholder': return <ShimmerPlaceholderScreen />;
          default:                   return <HomeScreen />;
        }
      }}
    </Navigator>
  );
}
