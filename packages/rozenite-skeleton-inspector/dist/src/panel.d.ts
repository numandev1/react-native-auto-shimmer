/**
 * Skeleton Inspector — Rozenite DevTools panel
 *
 * Full workflow — no CLI server needed:
 *  1. Select a mounted <SkeletonCapture> component from the sidebar
 *  2. Click Capture → skeletons are measured via UIManager.measure (real layout)
 *  3. Visual skeleton overlay lets you verify before saving
 *  4. Click Save → save-request sent via Rozenite bridge → react-native.ts
 *     POSTs to Metro's /skeleton-save endpoint → file written to disk
 */
export default function SkeletonInspectorPanel(): import("react/jsx-runtime").JSX.Element;
