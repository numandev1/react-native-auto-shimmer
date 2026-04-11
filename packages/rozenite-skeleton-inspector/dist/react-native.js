import { NativeModules as m } from "react-native";
const k = "__rnAutoShimmerCaptureRegistry__", w = "__rnAutoShimmerSavedRegistry__";
function $() {
  const e = globalThis;
  return e[k] || (e[k] = /* @__PURE__ */ new Map()), e[k];
}
function b(e) {
  try {
    const a = globalThis, s = a[w];
    if (s && typeof s.get == "function") return s.get(e) ?? null;
    const u = a.__rnAutoShimmerLookup__;
    if (typeof u == "function") return u(e) ?? null;
  } catch {
  }
  return null;
}
const R = "react-native-auto-shimmer";
function d(e, a, s) {
  const u = e.w, c = e.r === "50%", r = u > 85, o = u > 50, t = e.h > 100, n = !!e.c;
  return n && c ? `piece ${s} — button container` : n ? `piece ${s} — container (background layer)` : c && e.h >= 60 ? `piece ${s} — avatar circle` : c && e.h >= 30 ? `piece ${s} — icon circle` : c ? `piece ${s} — small circle` : t && r ? `piece ${s} — hero image / banner` : t && o ? `piece ${s} — image` : r && e.h >= 36 ? `piece ${s} — block (button / card section)` : r && e.h >= 20 ? `piece ${s} — text line (full width)` : r ? `piece ${s} — thin line` : o && e.h >= 36 ? `piece ${s} — block` : o && e.h <= 25 ? `piece ${s} — text line` : u < 20 && e.h <= 15 ? `piece ${s} — timestamp / label` : u < 20 ? `piece ${s} — small element` : e.h <= 20 ? `piece ${s} — text line` : `piece ${s}`;
}
function v(e) {
  const a = e.match(/— (.+)$/);
  return a ? a[1] : e;
}
const y = 8;
function S(e, a, s) {
  if (!a) return { hasDrift: !1, diffCount: 0 };
  let u = null;
  if (a.breakpoints) {
    const r = Object.keys(a.breakpoints).map(Number).sort((t, n) => t - n);
    let o = r[0];
    for (const t of r)
      t <= s && (o = t);
    u = o !== void 0 ? a.breakpoints[o]?.skeletons ?? null : null;
  } else Array.isArray(a.skeletons) && (u = a.skeletons);
  if (!u) return { hasDrift: !1, diffCount: 0 };
  if (u.length !== e.length)
    return { hasDrift: !0, diffCount: Math.abs(u.length - e.length) };
  let c = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r], t = u[r];
    (Math.abs(o.y - t.y) > y || Math.abs(o.h - t.h) > y || Math.abs(o.x - t.x) > 3 || // percent
    Math.abs(o.w - t.w) > 3) && c++;
  }
  return { hasDrift: c > 0, diffCount: c };
}
function T(e) {
  const a = _(), s = {};
  function u() {
    const r = $();
    e.send("registered-components", {
      names: [...r.keys()],
      driftMap: { ...s }
    });
  }
  u();
  const c = setInterval(u, 2e3);
  return e.onMessage("capture-request", async ({ name: r }) => {
    const t = $().get(r);
    if (!t) {
      e.send("capture-result", {
        name: r,
        viewportWidth: 0,
        height: 0,
        skeletons: [],
        labels: [],
        error: `No mounted <SkeletonCapture name="${r}"> found.
Navigate to the screen that wraps this component.`
      });
      return;
    }
    try {
      const n = await t.capture(), i = n.skeletons.map(
        (f, g) => v(d(f, n.viewportWidth, g))
      ), l = b(r), { hasDrift: p, diffCount: h } = S(n.skeletons, l, n.viewportWidth);
      s[r] = p, p && e.send("skeleton-drift", {
        name: r,
        viewportWidth: n.viewportWidth,
        diffCount: h,
        threshold: y
      }), e.send("capture-result", { ...n, labels: i });
    } catch (n) {
      e.send("capture-result", {
        name: r,
        viewportWidth: 0,
        height: 0,
        skeletons: [],
        labels: [],
        error: String(n?.message ?? n)
      });
    }
  }), e.onMessage("capture-all-request", async () => {
    const r = $(), o = [];
    for (const [t, n] of r.entries())
      try {
        const i = await n.capture(), l = i.skeletons.map(
          (f, g) => v(d(f, i.viewportWidth, g))
        ), p = b(t), { hasDrift: h } = S(i.skeletons, p, i.viewportWidth);
        s[t] = h, e.send("capture-result", { ...i, labels: l }), o.push({ name: t, ok: !0, skeletonCount: i.skeletons.length });
      } catch (i) {
        o.push({ name: t, ok: !1, skeletonCount: 0, error: String(i?.message ?? i) });
      }
    e.send("capture-all-result", { results: o });
  }), e.onMessage("save-request", async ({ name: r, outDir: o, allBreakpoints: t }) => {
    if (!a) {
      e.send("save-result", {
        ok: !1,
        error: "Could not resolve Metro server URL. Make sure Metro is running."
      });
      return;
    }
    const n = `${a}/skeleton-save`;
    try {
      const i = await fetch(n, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: r, outDir: o, allBreakpoints: t })
      });
      if (i.ok) {
        const l = await i.json();
        s[r] = !1, e.send("save-result", { ok: !0, file: l.file, skeletons: l.skeletons, breakpointCount: l.breakpointCount });
      } else {
        const l = await i.text().catch(() => `HTTP ${i.status}`);
        e.send("save-result", { ok: !1, error: l });
      }
    } catch (i) {
      e.send("save-result", {
        ok: !1,
        error: `Could not reach Metro at ${n}.
${i?.message ?? String(i)}`
      });
    }
  }), e.onMessage("save-descriptor-request", async ({ name: r, outDir: o, allBreakpoints: t }) => {
    if (!a) {
      e.send("save-descriptor-result", {
        ok: !1,
        error: "Could not resolve Metro server URL. Make sure Metro is running."
      });
      return;
    }
    const n = M(r, t), i = `${a}/skeleton-save`;
    try {
      const l = await fetch(i, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: r,
          outDir: o,
          allBreakpoints: t,
          asDescriptor: !0,
          descriptorSource: n
        })
      });
      if (l.ok) {
        const p = await l.json();
        s[r] = !1, e.send("save-descriptor-result", { ok: !0, file: p.file, breakpointCount: p.breakpointCount });
      } else {
        const p = await l.text().catch(() => `HTTP ${l.status}`);
        e.send("save-descriptor-result", { ok: !1, error: p });
      }
    } catch (l) {
      e.send("save-descriptor-result", {
        ok: !1,
        error: `Could not reach Metro at ${i}.
${l?.message ?? String(l)}`
      });
    }
  }), () => clearInterval(c);
}
function C(e, a, s, u, c) {
  const r = [...u].map((t, n) => ({ ...t, origIdx: n })).sort((t, n) => t.y - n.y), o = [];
  o.push(`${c}${a}: {`), o.push(`${c}  name: '${e}',`), o.push(`${c}  viewportWidth: ${a},`), o.push(`${c}  width: ${a},`), o.push(`${c}  height: ${s},`), o.push(`${c}  skeletons: [`);
  for (const t of r) {
    const n = t.r === "50%" ? "'50%'" : String(t.r), i = d(t, a, t.origIdx), l = [`x: ${t.x}`, `y: ${t.y}`, `w: ${t.w}`, `h: ${t.h}`, `r: ${n}`];
    t.c && l.push("c: true"), o.push(`${c}    // ${i}`), o.push(`${c}    { ${l.join(", ")} },`);
  }
  return o.push(`${c}  ],`), o.push(`${c}},`), o;
}
function M(e, a) {
  const s = e.replace(/-([a-z])/g, (n, i) => i.toUpperCase()) + "Skeletons", u = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), c = Object.keys(a).map(Number).sort((n, i) => n - i), r = a[c[0]]?.skeletons.length ?? 0, o = c.map((n) => `${n}dp`).join(", "), t = [];
  for (const n of c) {
    const i = a[n];
    t.push(...C(e, n, i.height, i.skeletons, "    "));
  }
  return [
    "import type { ResponsiveSkeletons } from 'react-native-auto-shimmer';",
    "",
    "/**",
    ` * Auto-generated by Skeleton Inspector — ${u}`,
    ` * Component  : ${e}`,
    ` * Breakpoints: ${o} (${c.length} total)`,
    ` * Pieces     : ${r} per breakpoint`,
    " *",
    " * ✅ x/w are percentages — widths scale automatically on any screen.",
    " *    y/h are dp values measured from the live layout per breakpoint.",
    " *",
    " * Usage:",
    ` *   import ${s} from './${e}.skeletons';`,
    ` *   <Skeleton initialSkeletons={${s}} loading={loading}>`,
    " *     <YourComponent />",
    " *   </Skeleton>",
    " */",
    `const ${s}: ResponsiveSkeletons = {`,
    "  breakpoints: {",
    ...t,
    "  },",
    "};",
    "",
    `export default ${s};`,
    ""
  ].join(`
`);
}
function _() {
  try {
    const e = m.DevSettings ?? m.RCTDevSettings, a = e?.scriptURL ?? e?.packagerHost;
    if (a)
      try {
        const s = new URL(a);
        return `${s.protocol}//${s.host}`;
      } catch {
        return `http://${a.replace(/\/.*$/, "")}`;
      }
    return "http://localhost:8081";
  } catch {
    return "http://localhost:8081";
  }
}
export {
  R as PLUGIN_ID,
  T as default
};
