# @react-native-auto-shimmer/rozenite-plugin

Rozenite DevTools plugin for `react-native-auto-shimmer` — capture pixel-perfect skeletons directly from your running app with visual verification before saving.

## How it works

```
App (simulator)                     React Native DevTools
┌─────────────────────┐             ┌──────────────────────────────┐
│  <SkeletonCapture   │  Rozenite   │  Skeleton Inspector panel    │
│    name="card">     │◄──bridge───►│                              │
│    <MyCard />       │             │  MOUNTED COMPONENTS          │
│  </SkeletonCapture> │  measure    │  ▶ card   ← select           │
│                     │──────────►  │                              │
│  UIManager.measure  │  skeletons  │  ○  Capture                  │
│  walks fiber tree   │──────────►  │  14 skeletons · 408 × 325 dp    │
└─────────────────────┘             │                              │
                                    │  ┌────────────────────────┐  │
                                    │  │  1 ████████████████   │  │
                                    │  │  2 ████████           │  │
                                    │  │  3 ██ ██ ██           │  │
                                    │  └────────────────────────┘  │
                                    │                              │
                                    │  ↓  Save skeletons.json          │
                                    └──────────────────────────────┘
                                              │
                                    src/skeletons/card.skeletons.json ✓
```

## Installation

```bash
yarn add -D @rozenite/metro @react-native-auto-shimmer/rozenite-plugin
```

## Setup

### 1. metro.config.js

```js
const { getDefaultConfig } = require('@expo/metro-config');
const { withRozenite } = require('@rozenite/metro');

let config = getDefaultConfig(__dirname);

if (process.env.WITH_ROZENITE === 'true') {
  config = withRozenite(config, {
    enabled: true,
    include: ['@react-native-auto-shimmer/rozenite-plugin'],
  });
}

module.exports = config;
```

### 2. App entry (App.tsx / index.js)

```tsx
if (__DEV__) {
  const { getRozeniteDevToolsClient } = require('@rozenite/plugin-bridge');
  const setupPlugin = require('@react-native-auto-shimmer/rozenite-plugin').default;

  getRozeniteDevToolsClient('react-native-auto-shimmer')
    .then((client) => setupPlugin(client))
    .catch((e) => console.warn('[SkeletonInspector]', e?.message));
}
```

### 3. Wrap components

```tsx
import { Skeleton, SkeletonCapture } from 'react-native-auto-shimmer';

// SkeletonCapture must sit INSIDE Skeleton
<Skeleton loading={loading} initialSkeletons={cardSkeletons} style={styles.card}>
  <SkeletonCapture name="card">
    <MyCard />
  </SkeletonCapture>
</Skeleton>
```

## Usage

```bash
# Start Metro with Rozenite enabled
WITH_ROZENITE=true yarn start
```

1. Run your app in the simulator
2. Navigate to a screen that has `<SkeletonCapture>` wrapped components
3. Turn **Loading OFF** on that screen so real content is visible (not opacity: 0)
4. Open **React Native DevTools** → **Rozenite** → **Skeleton Inspector**
5. Select a component under **Mounted Components**
6. Click **⬡ Capture** — skeletons are measured from the live layout
7. Review the numbered colour overlay; click the **🗑 trash icon** on any row to delete unwanted skeletons
8. Click **↓ Save skeletons.json** — the file is written to the **Output directory** shown in the sidebar (default: `src/skeletons/`)

## Building the plugin

```bash
cd packages/rozenite-skeleton-inspector
yarn install
yarn build
```

The built `dist/` is automatically discovered by Rozenite when this package is installed.
