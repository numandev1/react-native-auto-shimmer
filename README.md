<div align="center">

# ⬡ react-native-auto-shimmer

**Pixel-perfect skeleton loading screens — captured directly from your running UI.**  
No manual measurement. No guesswork. One click.

[![npm version](https://img.shields.io/npm/v/react-native-auto-shimmer?color=6366f1&style=flat-square)](https://www.npmjs.com/package/react-native-auto-shimmer)
[![npm downloads](https://img.shields.io/npm/dm/react-native-auto-shimmer?color=059669&style=flat-square)](https://www.npmjs.com/package/react-native-auto-shimmer)
[![license](https://img.shields.io/npm/l/react-native-auto-shimmer?color=f59e0b&style=flat-square)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-%3E%3D0.68-61dafb?style=flat-square&logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-compatible-000?style=flat-square&logo=expo)](https://expo.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

<br/>

<table>
<tr>
<td align="center" width="50%">

**pulse**

![pulse animation](media/simulator_with_pulse.gif)

</td>
<td align="center" width="50%">

**shimmer**

![shimmer animation](media/simulator_with_shimmer.gif)

</td>
</tr>
</table>

<br/>

</div>

---

## Why react-native-auto-shimmer?

Building skeleton screens is tedious. You eyeball pixel values, hardcode widths, and then redo it all when the design changes. **react-native-auto-shimmer eliminates that entirely.**

| The old way | With auto-shimmer |
|---|---|
| ❌ Manually measure every element | ✅ One-click capture from live UI |
| ❌ Hardcoded pixel values that break | ✅ % widths that adapt to any screen |
| ❌ Skeleton drifts from real layout | ✅ Always matches — captured from truth |
| ❌ Rebuild skeletons after redesigns | ✅ Re-capture in 10 seconds |
| ❌ Complex per-platform setup | ✅ Zero native code, works with Expo |

---

## Features

- **⬡ Visual skeleton inspector** — a built-in DevTools panel shows every captured skeleton with a numbered colour overlay
- **🎯 One-click capture** — skeletons are measured from the live fiber tree via `UIManager.measure` (real layout, not estimates)
- **✂️ Edit before saving** — delete noisy skeletons visually; canvas redraws instantly
- **📐 Responsive by default** — `x` and `w` are stored as percentages so skeletons scale across device sizes
- **🌓 Dark mode built-in** — `color` / `darkColor` props, reads `useColorScheme()` automatically
- **✨ Two animation styles** — `pulse` (native thread) or `shimmer` (sweeping highlight)
- **🏭 Zero native modules** — no `pod install`, no Gradle changes, no linking
- **⚡ New Architecture ready** — works on both Fabric and legacy renderers
- **📦 Tiny** — the runtime is a few KB; `<SkeletonCapture>` is a no-op in production

---

## How it works

![Skeleton Inspector live capture](media/simulator_with_debugger.png)

<br/>

```
Your app (simulator / device)                React Native DevTools
┌──────────────────────────────┐             ┌──────────────────────────────────────┐
│                              │             │  ⬡  Skeleton Inspector               │
│  <Skeleton loading={…}>      │             │                                      │
│    <SkeletonCapture          │  Rozenite   │  MOUNTED COMPONENTS                  │
│       name="card">           │◄───bridge──►│  ▸ card           ← select           │
│      <MyCard />              │             │  ▸ feedPost                          │
│    </SkeletonCapture>        │             │                                      │
│  </Skeleton>                 │             │  ⬡  Capture       ← click            │
└──────────────────────────────┘             │  14 skeletons · 408 × 325 dp             │
         │                                   │                                      │
         │  UIManager.measure                │  ┌────────────────────────────────┐  │
         │  walks fiber tree                 │  │  0  ████████████████████████   │  │
         └──────────────────────────────────►│  │     1  ██████████████          │  │
                                             │  │  2  ████████████████████████   │  │
                                             │  └────────────────────────────────┘  │
                                             │                                      │
                                             │  ↓  Save skeleton.json  ← click        │
                                             └──────────────────────────────────────┘
                                                              │
                                               src/skeletons/card.skeletons.json  ✓
```

**The workflow in 30 seconds:**

1. Wrap your component with `<SkeletonCapture name="card">`
2. Open Skeleton Inspector in React Native DevTools
3. Click **Capture** — real skeleton geometry is measured instantly
4. Remove any unwanted skeletons by clicking the trash icon
5. Click **Save** — `card.skeletons.json` is written to your project
6. Import the JSON and pass it to `<Skeleton initialSkeletons={…}>`
7. Ship. Done.

<div align="center">

![Skeleton Inspector live capture](media/simulator_with_debugger.png)

*Live capture — simulator on the left, Skeleton Inspector DevTools panel on the right*

</div>

---

## Installation

```sh
npm install react-native-auto-shimmer
# or
yarn add react-native-auto-shimmer
```

> **Requirements:** React Native ≥ 0.68 · React ≥ 17 · No native modules · No `pod install` · Works with Expo

---

## Quick start

### 1. Wrap your screen

```tsx
import { Skeleton } from 'react-native-auto-shimmer';
import cardSkeletons from './skeletons/card.skeletons.json'; // added after first capture

export function ArticleScreen() {
  const [loading, setLoading] = useState(true);

  return (
    <Skeleton loading={loading} initialSkeletons={cardSkeletons} style={styles.card}>
      <ArticleCard />
    </Skeleton>
  );
}
```

Before you've captured skeletons, `<Skeleton>` shows a blank fallback. The next section walks through capturing the real geometry.

---

## Capturing skeletons with Skeleton Inspector

Skeleton Inspector is a **DevTools panel** powered by [Rozenite](https://rozenite.dev). It connects to your running app, triggers a live measurement, and lets you edit the result before writing it to disk.

### Step 1 — Install dev dependencies

```sh
# inside your React Native project
yarn add -D @rozenite/metro @react-native-auto-shimmer/rozenite-plugin
```

### Step 2 — Configure Metro

```js
// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config'); // or require('metro-config')
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

### Step 3 — Register the plugin in your app entry

```tsx
// App.tsx or index.js
if (__DEV__) {
  const { getRozeniteDevToolsClient } = require('@rozenite/plugin-bridge');
  const setupPlugin = require('@react-native-auto-shimmer/rozenite-plugin').default;

  getRozeniteDevToolsClient('react-native-auto-shimmer')
    .then((client) => setupPlugin(client))
    .catch((e) => console.warn('[SkeletonInspector] Could not connect:', e?.message));
}
```

### Step 4 — Wrap your component

Place `<SkeletonCapture>` **inside** `<Skeleton>`, directly around your real content:

```tsx
import { Skeleton, SkeletonCapture } from 'react-native-auto-shimmer';

export function ArticleScreen() {
  const [loading, setLoading] = useState(true);

  return (
    <Skeleton loading={loading} initialSkeletons={cardSkeletons} style={styles.card}>
      {/* SkeletonCapture lives inside Skeleton so it sees the real laid-out content */}
      <SkeletonCapture name="card">
        <ArticleCard />
      </SkeletonCapture>
    </Skeleton>
  );
}
```

> **Why inside `<Skeleton>`?** `<Skeleton>` hides its children with `opacity: 0` while loading. Measuring from outside would give you hidden-element coordinates. Placing `<SkeletonCapture>` inside guarantees it only inspects the visible, real content.

### Step 5 — Start Metro with Rozenite

```sh
WITH_ROZENITE=true yarn start
```

### Step 6 — Open Skeleton Inspector

1. Run the app on a simulator or device
2. Open **React Native DevTools** (`j` in Metro, or via Expo Dev Tools)
3. Click the **Rozenite** tab → **Skeleton Inspector**

### Step 7 — Capture

1. Navigate to the screen with your `<SkeletonCapture>` component
2. Make sure `loading` is `false` (real content must be visible)
3. Your component name appears under **Mounted Components**
4. Click **⬡ Capture** — skeletons are measured from the live layout

![Skeleton Inspector — captured skeletons with numbered colour overlay and skeleton table](docs/captured-skeletons.png)

### Step 8 — Review and delete

The panel draws every skeleton with a numbered colour overlay and a data table below. Click the **trash icon** on any row to remove unwanted skeletons — the canvas redraws immediately.

### Step 9 — Save

Click **↓ Save skeleton.json**. The file lands in the Output Directory shown in the sidebar (default `src/skeletons`):

```
src/skeletons/card.skeletons.json   ✓
```

---

## Using saved skeletons

### Import directly

```tsx
import cardSkeletons from './skeletons/card.skeletons.json';

<Skeleton loading={loading} initialSkeletons={cardSkeletons} style={styles.card}>
  <ArticleCard />
</Skeleton>
```

### Register once, use everywhere

Register all your skeletons at app startup so every `<Skeleton>` can reference them by name:

```ts
// App.tsx
import { registerSkeletons } from 'react-native-auto-shimmer';
import cardSkeletons      from './skeletons/card.skeletons.json';
import profileSkeletons   from './skeletons/profile.skeletons.json';
import feedPostSkeletons  from './skeletons/feedPost.skeletons.json';

registerSkeletons({
  card:     cardSkeletons,
  profile:  profileSkeletons,
  feedPost: feedPostSkeletons,
});
```

Then reference by name from any screen — no per-screen import needed:

```tsx
<Skeleton name="card" loading={loading} style={styles.card}>
  <ArticleCard />
</Skeleton>
```

### What a `.skeletons.json` looks like

```json
{
  "breakpoints": {
    "408": {
      "name": "card",
      "viewportWidth": 408,
      "height": 375,
      "skeletons": [
        { "x": 0,      "y": 0,   "w": 100,    "h": 230, "r": 8     },
        { "x": 3.922,  "y": 246, "w": 92.157, "h": 22,  "r": 8     },
        { "x": 3.922,  "y": 275, "w": 92.157, "h": 40,  "r": 8     },
        { "x": 3.922,  "y": 327, "w": 7.843,  "h": 32,  "r": "50%" },
        { "x": 14.22,  "y": 335, "w": 18.46,  "h": 17,  "r": 8     }
      ]
    }
  }
}
```

| Field | Unit | Notes |
|-------|------|-------|
| `x`, `w` | % of container width | Scales correctly on every device size |
| `y`, `h` | absolute dp | Fixed vertical rhythm |
| `r` | dp or `"50%"` | Border radius; `"50%"` produces a circle |

---

## API Reference

### `<Skeleton>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | **required** | Show skeleton (`true`) or real content (`false`) |
| `children` | `ReactNode` | **required** | Your component |
| `name` | `string` | — | Registry key — looks up skeletons registered with `registerSkeletons` |
| `initialSkeletons` | `SkeletonResult \| ResponsiveSkeletons` | — | Direct skeleton data (JSON import). Takes priority over `name` |
| `skeletons` | `SkeletonResult` | — | Dynamically computed skeletons (from `computeLayout`) |
| `animate` | `'pulse' \| 'shimmer' \| 'solid' \| boolean` | `'pulse'` | Animation style |
| `color` | `string` | `'rgba(0,0,0,0.08)'` | Skeleton colour (light mode) |
| `darkColor` | `string` | `'rgba(255,255,255,0.06)'` | Skeleton colour (dark mode) |
| `style` | `ViewStyle` | — | Wrapper View style — set `width`, `height`, `borderRadius` here |
| `fallback` | `ReactNode` | — | Rendered when `loading=true` but no skeletons are registered yet |

---

### `<SkeletonCapture>` *(dev only)*

Exposes a component to the Skeleton Inspector panel. **No-op in production** — tree-shakes to a plain `<View>` with zero overhead.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | **required** | Identifier shown in the Skeleton Inspector panel |
| `children` | `ReactNode` | **required** | The component to measure |
| `style` | `ViewStyle` | — | Forwarded to the wrapper View |

---

### `registerSkeletons(map)`

Register pre-captured skeletons globally so `<Skeleton name="…">` can find them without a per-screen import.

```ts
import { registerSkeletons } from 'react-native-auto-shimmer';

registerSkeletons({
  card:    cardSkeletons,
  profile: profileSkeletons,
});
```

---

### `configureSkeleton(config)`

Set global defaults once at app startup — any `<Skeleton>` prop overrides them locally.

```ts
import { configureSkeleton } from 'react-native-auto-shimmer';

configureSkeleton({
  animate:   'shimmer',
  color:     'rgba(0,0,0,0.06)',
  darkColor: 'rgba(255,255,255,0.08)',
});
```

| Option | Type | Description |
|--------|------|-------------|
| `animate` | `'pulse' \| 'shimmer' \| 'solid' \| boolean` | Default animation for all skeletons |
| `color` | `string` | Default skeleton colour (light mode) |
| `darkColor` | `string` | Default skeleton colour (dark mode) |

---

### `computeLayout(descriptor, width)`

Pure-JS layout engine for when you want to hand-author skeletons or generate them server-side — no live device needed.

```ts
import { computeLayout } from 'react-native-auto-shimmer';
import type { SkeletonDescriptor } from 'react-native-auto-shimmer';

const card: SkeletonDescriptor = {
  display: 'flex',
  flexDirection: 'column',
  padding: 16,
  gap: 12,
  children: [
    { aspectRatio: 16 / 9 },
    { text: 'Article title', font: '700 18px Inter', lineHeight: 24 },
    { text: 'Body copy',     font: '14px Inter',    lineHeight: 20 },
    {
      display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center',
      children: [
        { width: 32, height: 32, borderRadius: 16 },           // avatar circle
        { text: 'Author name', font: '600 14px Inter', lineHeight: 18 },
      ],
    },
  ],
};

const result = computeLayout(card, 390); // container width in dp
// result.skeletons → array of SkeletonSkeleton objects ready for <Skeleton>
```

---

## Animation styles

| Value | Description |
|-------|-------------|
| `'pulse'` | Opacity fades 100% → 45% and back. Runs on the **native UI thread** via `Animated.loop`. |
| `'shimmer'` | A bright highlight sweeps left-to-right across all skeletons in sync. |
| `'solid'` | No animation — static skeletons. Useful for reduced-motion preferences. |
| `true` | Alias for `'pulse'` |
| `false` | Alias for `'solid'` |

```tsx
<Skeleton loading={loading} animate="shimmer" initialSkeletons={skeletons}>
  <MyCard />
</Skeleton>
```

---

## Responsive skeletons

When the same component renders at multiple widths (full-width on phone, half-width in a grid on tablet), capture at each size. The JSON stores one entry per breakpoint and `<Skeleton>` automatically picks the nearest match.

**To produce a multi-breakpoint file:**
1. Render at the first width → Capture → Save
2. Render at a different width (rotate device, change layout) → Capture → Save (same name)

The panel merges both captures into a single JSON file.

**Or generate programmatically:**

```ts
import { computeLayout, registerSkeletons } from 'react-native-auto-shimmer';
import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';

const descriptor = { /* … */ };

const responsiveSkeletons: ResponsiveSkeletons = {
  breakpoints: {
    0:   computeLayout(descriptor, 390),  // phones
    600: computeLayout(descriptor, 600),  // tablets
  },
};

registerSkeletons({ card: responsiveSkeletons });
```

---

## Dark mode

`<Skeleton>` calls `useColorScheme()` internally — no extra setup required:

```tsx
<Skeleton
  loading={loading}
  initialSkeletons={cardSkeletons}
  color="rgba(0,0,0,0.07)"
  darkColor="rgba(255,255,255,0.09)"
>
  <MyCard />
</Skeleton>
```

Or set it once with `configureSkeleton` and never think about it again.

---

## FAQ

<details>
<summary><strong>Do I need to keep <code>&lt;SkeletonCapture&gt;</code> in production?</strong></summary>

No — but you can safely leave it. In production (`__DEV__ === false`) it renders as a transparent zero-overhead `<View>` with no bridge calls.
</details>

<details>
<summary><strong>The panel shows "No components found".</strong></summary>

Navigate to the screen that mounts your `<SkeletonCapture>` component. Components register when they mount and deregister when they unmount — the panel always reflects what's currently on screen.
</details>

<details>
<summary><strong>&lt;Skeleton&gt; shows a blank space instead of skeletons.</strong></summary>

You haven't passed skeletons yet. Use the `fallback` prop as a placeholder while you run the capture workflow for the first time:

```tsx
<Skeleton loading={loading} fallback={<MyPlaceholder />}>
  <MyCard />
</Skeleton>
```
</details>

<details>
<summary><strong>My component renders at different widths. Which should I capture?</strong></summary>

Capture at every meaningful width. The saved JSON stores one entry per breakpoint and `<Skeleton>` automatically selects the closest one at render time.
</details>

<details>
<summary><strong>Can I edit the skeleton JSON by hand?</strong></summary>

Yes. The format is intentionally simple: `x`/`w` are percentages, `y`/`h` are dp, `r` is border-radius in dp or `"50%"` for circles. You can also delete skeletons interactively from Skeleton Inspector before saving.
</details>

<details>
<summary><strong>Does it work with Expo?</strong></summary>

Yes. No native modules are required. The Rozenite plugin uses Metro's `enhanceMiddleware` API, which Expo's Metro supports out of the box.
</details>

<details>
<summary><strong>Does it work with the New Architecture (Fabric)?</strong></summary>

Yes. `SkeletonCapture` detects the renderer at runtime and uses the correct measurement path for both Fabric (direct `.measure()` on public instances) and the legacy renderer (`UIManager.measure`).
</details>

<details>
<summary><strong>Does it work with React Navigation / Expo Router?</strong></summary>

Yes. `<SkeletonCapture>` registers itself when it mounts and cleans up when it unmounts, so it plays nicely with any navigation library's screen lifecycle.
</details>

---

## Contributing

We welcome contributions of all sizes — bug fixes, new features, docs improvements.

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)

---

## License

MIT © [Numan](https://github.com/shobbak)

---

<div align="center">

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob) · Powered by [Rozenite](https://rozenite.dev)

**If this saved you time, consider giving it a ⭐**

</div>
