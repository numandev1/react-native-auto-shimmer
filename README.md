<div align="center">

<img src="media/logo.gif" alt="react-native-auto-shimmer" width="420" />

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
<td align="center" width="33%">

**Auto Pulse**

![pulse animation](media/simulator_with_pulse.gif)

</td>
<td align="center" width="33%">

**Auto shimmer**

![shimmer animation](media/simulator_with_shimmer.gif)

</td>
<td align="center" width="33%">

**Manual ShimmerOverlay**

![shimmer overlay effect](media/shimmer_overlay.gif)

</td>
<td align="center" width="33%">

**Manual ShimmerPlaceholder**

![shimmer overlay effect](media/shimmer_placeholder.gif)

</td>
</tr>
</table>

<br/>

</div>

<br/>

> ⭐ **If this saves you time, drop a star** — it helps others discover the library!

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
- **▭ `ShimmerPlaceholder`** — manual fixed-size loading boxes; drop-in for `react-native-shimmer-placeholder`, zero dependencies
- **✦ `ShimmerOverlay`** — wrap any content with a diagonal highlight sweep
- **🏭 Zero native modules** — no `pod install`, no Gradle changes, no linking
- **⚡ New Architecture ready** — works on both Fabric and legacy renderers
- **📦 Tiny** — the runtime is a few KB; `<SkeletonCapture>` is a no-op in production

---

## How it works

![Skeleton Inspector live capture](media/simulator_with_debugger.png)

<div align="center">

*Live capture —> simulator on the right, Skeleton Inspector DevTools panel on the left*

</div>

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
3. Click **⬡ Capture** — real skeleton geometry is measured instantly
4. Remove any unwanted skeletons by clicking the trash icon
5. Click **↓ Save .ts (Responsive)** for a TypeScript file that scales on every device, or **↓ Save skeletons.json** for a static JSON snapshot
6. The inspector shows the exact import + `<Skeleton>` snippet — copy and paste it
7. Ship. Done.

---

## Installation

```sh
npm install react-native-auto-shimmer
# or
yarn add react-native-auto-shimmer
```

> **Requirements:** React Native ≥ 0.68 · React ≥ 17 · No native modules · No `pod install` · Works with Expo

---

## Two approaches to skeleton data

There are two ways to provide skeleton data to `<Skeleton>`. Choose based on your needs:

| | **TypeScript `.ts`** ⭐ | **JSON `.json`** |
|---|---|---|
| How | Inspector auto-generates a `.ts` file with live measurements | Inspector saves raw captured data as `.json` |
| Horizontal | ✅ `x`/`w` stored as percentages → scale to any screen width | ⚠️ All values are dp — may shift on different device widths |
| Vertical | ✅ `y`/`h` are exact dp from live layout | ✅ `y`/`h` are exact dp from live layout |
| Editable | ✅ Plain TypeScript — add breakpoints, conditions, comments | ❌ Static data — requires re-capture to change |
| Auto-generate | ✅ Click **Save .ts** in the inspector | ✅ Click **Save .json** in the inspector |
| Prop | `initialSkeletons={data}` | `initialSkeletons={data}` |

**Use `.ts`** when you target multiple screen sizes or want easy future refinement — **recommended**.  
**Use `.json`** when you want the fastest possible save-and-ship flow on a single target device.

---

## Quick start

> **Just need a simple loading box without capturing anything?**  
> Skip to [`ShimmerPlaceholder`](#shimmerplaceholder----manual-loading-boxes) — drop in a fixed-size placeholder in two lines of code.

### Option A — TypeScript `.ts` ⭐ (recommended, responsive)

In the inspector, click **↓ Save .ts (Responsive)** after capturing. The inspector writes a ready-to-use `.ts` file like this to your `src/skeletons/` folder:

```ts
// card.skeletons.ts — auto-generated by Skeleton Inspector
import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';

/**
 * Auto-generated by Skeleton Inspector — 2025-01-15
 * Component : card
 * Captured  : 390dp wide · 280dp tall · 6 pieces
 *
 * ✅ Pixel-perfect: x/w are percentages so widths scale on any screen.
 *    y/h are exact dp values measured from the live layout.
 *
 * 💡 Add more breakpoints (capture on other devices) for more precision,
 *    or refine values manually in this file.
 */
const cardSkeletons: ResponsiveSkeletons = {
  breakpoints: {
    390: {
      name: 'card',
      viewportWidth: 390,
      width: 390,
      height: 280,
      skeletons: [
        // piece 0 — hero image / banner
        { x: 0, y: 0, w: 100, h: 180, r: 0 },
        // piece 1 — text line (full width)
        { x: 4.1, y: 196, w: 91.8, h: 22, r: 6 },
        // piece 2 — text line
        { x: 4.1, y: 226, w: 61.5, h: 16, r: 6 },
        // piece 3 — avatar circle
        { x: 4.1, y: 252, w: 8.2, h: 32, r: '50%' },
        // piece 4 — text line
        { x: 14.4, y: 258, w: 35.9, h: 18, r: 6 },
      ],
    },
  },
};

export default cardSkeletons;
```

Then import and use it — same `initialSkeletons` prop as JSON:

```tsx
// ArticleScreen.tsx
import { Skeleton } from 'react-native-auto-shimmer';
import cardSkeletons from './skeletons/card.skeletons';

export function ArticleScreen() {
  const [loading, setLoading] = useState(true);

  return (
    <Skeleton loading={loading} initialSkeletons={cardSkeletons} style={styles.card}>
      <ArticleCard />
    </Skeleton>
  );
}
```

> **Why `.ts` over `.json`?** The `x`/`w` values are percentages of the container width, so the skeleton automatically scales to the right proportions on any device. `y`/`h` are exact dp from the live layout measurement. Capture once on any device — it looks right everywhere.

### Option B — JSON `.json` (quickest, single device)

Run the [Skeleton Inspector](#capturing-skeletons-with-skeleton-inspector), click **↓ Save skeletons.json**, then use the generated file:

```tsx
import { Skeleton } from 'react-native-auto-shimmer';
import cardSkeletons from './skeletons/card.skeletons.json'; // generated by inspector

export function ArticleScreen() {
  const [loading, setLoading] = useState(true);

  return (
    <Skeleton loading={loading} initialSkeletons={cardSkeletons} style={styles.card}>
      <ArticleCard />
    </Skeleton>
  );
}
```

Before you've set up skeleton data, `<Skeleton>` shows its children without a skeleton overlay. The next section walks through the inspector capture workflow.

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
const { withSkeletonInspector } = require('@react-native-auto-shimmer/rozenite-plugin/metro');

let config = getDefaultConfig(__dirname);

config = withSkeletonInspector(config);

if (process.env.WITH_ROZENITE === 'true') {
  config = withRozenite(config, { enabled: true });
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

Two buttons appear after capture:

| Button | Output | Best for |
|---|---|---|
| **↓ Save .ts (Responsive)** ⭐ | `card.skeletons.ts` | Every device — x/w scale as percentages |
| **↓ Save skeletons.json** | `card.skeletons.json` | Quick snapshot, single device |

Files land in the Output Directory shown in the sidebar (default `src/skeletons`):

```
src/skeletons/card.skeletons.ts    ✓  ← responsive TypeScript (recommended)
src/skeletons/card.skeletons.json  ✓  ← static JSON snapshot
```

After saving, the inspector shows a **ready-to-paste code snippet** with the exact import line and `<Skeleton>` usage — just copy and drop it into your screen file.

---

## Using saved skeletons

### Import directly

**From the auto-generated `.ts` file (recommended):**

```tsx
import cardSkeletons from './skeletons/card.skeletons';  // ← .ts, no extension needed

<Skeleton loading={loading} initialSkeletons={cardSkeletons} style={styles.card}>
  <ArticleCard />
</Skeleton>
```

**Or from a JSON snapshot:**

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
import cardSkeletons      from './skeletons/card.skeletons';      // .ts (responsive)
import profileSkeletons   from './skeletons/profile.skeletons';   // .ts (responsive)
import feedPostSkeletons  from './skeletons/feedPost.skeletons.json'; // .json also works

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

## ShimmerOverlay

A **general-purpose shimmer highlight effect** that works on *any* React Native content — buttons, images, cards, headers, text — not just skeleton placeholders.

Unlike `<Skeleton>` (which manages loading state + placeholder layout), `<ShimmerOverlay>` simply wraps any element and sweeps a configurable highlight band over it.

> **Need a fixed-size placeholder box?** See [`<ShimmerPlaceholder>`](#shimmerplaceholder) below — a drop-in replacement for `react-native-shimmer-placeholder` with no LinearGradient dependency.

<div align="center">

| Use `<Skeleton>` when… | Use `<ShimmerOverlay>` when… |
|---|---|
| Showing loading placeholders | Adding a shine/highlight to real content |
| Need auto-captured layout | Wrapping any arbitrary element |
| Managing `loading` state | Just want the visual effect |

</div>

### ShimmerOverlay Basic usage

```tsx
import { ShimmerOverlay } from 'react-native-auto-shimmer';

// Shine over any element
<ShimmerOverlay>
  <View style={styles.card} />
</ShimmerOverlay>
```

### Examples

```tsx
import { ShimmerOverlay, type ShimmerOverlayRef } from 'react-native-auto-shimmer';

// ── Premium button highlight ──────────────────────────────────────────────────
<ShimmerOverlay
  color="rgba(255, 200, 0, 0.7)"
  mode="expand"
  angle={20}
  duration={1800}
>
  <PremiumButton />
</ShimmerOverlay>

// ── Staggered list (each row starts 200ms later) ──────────────────────────────
{items.map((item, i) => (
  <ShimmerOverlay key={item.id} initialDelay={i * 200}>
    <ListRow item={item} />
  </ShimmerOverlay>
))}

// ── Right-to-left sweep ───────────────────────────────────────────────────────
<ShimmerOverlay direction="right-to-left" bandWidth={100}>
  <HeroImage />
</ShimmerOverlay>

// ── Programmatic control via ref ──────────────────────────────────────────────
const shimmerRef = useRef<ShimmerOverlayRef>(null);

<ShimmerOverlay ref={shimmerRef} active={false}>
  <View style={styles.banner} />
</ShimmerOverlay>

<Button title="Start" onPress={() => shimmerRef.current?.start()} />
<Button title="Stop"  onPress={() => shimmerRef.current?.stop()} />
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | — | Content to apply the shimmer to |
| `active` | `boolean` | `true` | Whether the animation runs |
| `color` | `string` | `'rgba(255,255,255,0.8)'` | Color of the shimmer band |
| `duration` | `number` | `1500` | One cycle duration in ms |
| `delay` | `number` | `400` | Pause between cycles in ms |
| `initialDelay` | `number` | `0` | Delay before first cycle (useful for staggering) |
| `angle` | `number` | `20` | Band angle in degrees (0 = vertical) |
| `bandWidth` | `number` | `60` | Width of the shimmer band in px |
| `opacity` | `number` | `1` | Overall opacity of the effect (0–1) |
| `mode` | `'normal' \| 'expand' \| 'shrink'` | `'normal'` | Band size animation style |
| `position` | `'top' \| 'center' \| 'bottom'` | `'center'` | Anchor point for expand/shrink |
| `direction` | `'left-to-right' \| 'right-to-left'` | `'left-to-right'` | Sweep direction |
| `iterations` | `number` | `-1` | Number of cycles (-1 = infinite) |
| `easing` | `(t: number) => number` | bezier(0.4,0,0.2,1) | Custom easing function |
| `respectReduceMotion` | `boolean` | `true` | Pauses when system Reduce Motion is on |
| `pauseOnBackground` | `boolean` | `true` | Pauses when app goes to background |
| `onAnimationStart` | `() => void` | — | Called once when sequence starts |
| `onAnimationComplete` | `() => void` | — | Called when all iterations finish |
| `onIterationComplete` | `(n: number) => void` | — | Called after each iteration |
| `style` | `StyleProp<ViewStyle>` | — | Container style |
| `testID` | `string` | — | Test ID for e2e frameworks |

### Ref methods (`ShimmerOverlayRef`)

```tsx
const ref = useRef<ShimmerOverlayRef>(null);

ref.current?.start();       // Start animation
ref.current?.stop();        // Stop immediately
ref.current?.restart();     // Restart from beginning
ref.current?.isAnimating(); // → boolean
```

---

## ShimmerPlaceholder — manual loading boxes

Use `ShimmerPlaceholder` when you want to **handcraft individual loading boxes** without capturing a live component — perfect for simple screens, one-off placeholders, or when you prefer to build your skeleton layout manually in code.

> **Auto-captured skeletons vs manual placeholders**
>
> | | `<Skeleton>` + captured `.ts` | `ShimmerPlaceholder` |
> |---|---|---|
> | Layout source | Measured from live UI | You specify `width` / `height` |
> | Responsive | ✅ % widths auto-scale | ❌ Fixed px values |
> | Setup | DevTools capture | Just import and use |
> | Best for | Any real screen | Simple / one-off loading UIs |

`ShimmerPlaceholder` has the **same API as [`react-native-shimmer-placeholder`](https://github.com/tomzaku/react-native-shimmer-placeholder)** but with **zero dependencies** — no `LinearGradient`, no `react-native-linear-gradient`, no `expo-linear-gradient`. The gradient is simulated using layered `View` slices with a bell-curve opacity profile.

### Migrating from `react-native-shimmer-placeholder`

```diff
- import LinearGradient from 'react-native-linear-gradient';
- import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
- const ShimmerPlaceHolder = createShimmerPlaceholder(LinearGradient);

+ import { createShimmerPlaceholder } from 'react-native-auto-shimmer';
+ const ShimmerPlaceHolder = createShimmerPlaceholder(); // no LinearGradient needed
```

Or import directly:

```tsx
import { ShimmerPlaceholder } from 'react-native-auto-shimmer';
```

### Basic usage

```tsx
import { ShimmerPlaceholder } from 'react-native-auto-shimmer';

// Text line — shows shimmer until `loaded` is true
<ShimmerPlaceholder width={220} height={14} borderRadius={6} visible={loaded}>
  <Text>{title}</Text>
</ShimmerPlaceholder>

// Avatar circle
<ShimmerPlaceholder width={48} height={48} borderRadius={24} visible={loaded}>
  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
</ShimmerPlaceholder>
```

### Building a full placeholder card

```tsx
function ArticleCardPlaceholder({ loaded }: { loaded: boolean }) {
  return (
    <View style={styles.card}>
      {/* Hero image */}
      <ShimmerPlaceholder width={340} height={180} visible={loaded}>
        <Image source={{ uri: imageUrl }} style={styles.hero} />
      </ShimmerPlaceholder>

      <View style={styles.body}>
        {/* Title */}
        <ShimmerPlaceholder width={280} height={18} borderRadius={6} visible={loaded}
          style={{ marginBottom: 8 }}>
          <Text style={styles.title}>{title}</Text>
        </ShimmerPlaceholder>

        {/* Body line 1 */}
        <ShimmerPlaceholder width={300} height={13} borderRadius={6} visible={loaded}
          style={{ marginBottom: 6 }}>
          <Text style={styles.body}>{excerpt}</Text>
        </ShimmerPlaceholder>

        {/* Body line 2 — shorter */}
        <ShimmerPlaceholder width={200} height={13} borderRadius={6} visible={loaded}
          style={{ marginBottom: 12 }}>
          <Text style={styles.body}>{excerpt2}</Text>
        </ShimmerPlaceholder>

        {/* Author row */}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <ShimmerPlaceholder width={32} height={32} borderRadius={16} visible={loaded}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          </ShimmerPlaceholder>
          <ShimmerPlaceholder width={120} height={13} borderRadius={6} visible={loaded}>
            <Text style={styles.author}>{authorName}</Text>
          </ShimmerPlaceholder>
        </View>
      </View>
    </View>
  );
}
```

### Dark mode placeholder

```tsx
<ShimmerPlaceholder
  width={240} height={16} borderRadius={8}
  shimmerColors={['#2a2a3e', '#3d3d5c', '#2a2a3e']}
  visible={loaded}
>
  <Text style={styles.darkText}>{label}</Text>
</ShimmerPlaceholder>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `200` | Width of the placeholder in px |
| `height` | `number` | `15` | Height of the placeholder in px |
| `visible` | `boolean` | `false` | `true` = show children, `false` = show shimmer |
| `shimmerColors` | `[string, string, string]` | `['#ebebeb','#d0d0d0','#ebebeb']` | Edge / centre / edge gradient colours |
| `isReversed` | `boolean` | `false` | Sweep right-to-left instead |
| `stopAutoRun` | `boolean` | `false` | Prevent auto-start on mount |
| `duration` | `number` | `1000` | One sweep duration in ms |
| `delay` | `number` | `0` | Delay before each sweep |
| `borderRadius` | `number` | `0` | Border radius of the placeholder box |
| `style` | `StyleProp<ViewStyle>` | — | Outer container style |
| `contentStyle` | `StyleProp<ViewStyle>` | — | Children wrapper style (when `visible`) |
| `shimmerStyle` | `StyleProp<ViewStyle>` | — | Shimmer box style (when not `visible`) |

### Ref methods (`ShimmerPlaceholderRef`)

```tsx
const ref = useRef<ShimmerPlaceholderRef>(null);

ref.current?.start(); // manually start sweeping
ref.current?.stop();  // manually stop sweeping
```

---

## Contributing

We welcome contributions of all sizes — bug fixes, new features, docs improvements.

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)

---

## Support

### Would you like to support me?

<div align="center">
<a href="https://www.buymeacoffee.com/numan.dev" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>
</div>

---

## License

MIT © [Numan](https://github.com/numandev1)
