import { NativeModules as g } from "react-native";
const c = "__rnAutoShimmerCaptureRegistry__";
function h() {
  const e = globalThis;
  return e[c] || (e[c] = /* @__PURE__ */ new Map()), e[c];
}
const y = "react-native-auto-shimmer";
function m(e) {
  const s = v();
  function n() {
    const t = h();
    e.send("registered-components", { names: [...t.keys()] });
  }
  n();
  const p = setInterval(n, 2e3);
  return e.onMessage("capture-request", async ({ name: t }) => {
    const a = h().get(t);
    if (!a) {
      e.send("capture-result", {
        name: t,
        viewportWidth: 0,
        height: 0,
        skeletons: [],
        error: `No mounted <SkeletonCapture name="${t}"> found.
Navigate to the screen that wraps this component.`
      });
      return;
    }
    try {
      const o = await a.capture();
      e.send("capture-result", o);
    } catch (o) {
      e.send("capture-result", {
        name: t,
        viewportWidth: 0,
        height: 0,
        skeletons: [],
        error: String(o?.message ?? o)
      });
    }
  }), e.onMessage("save-request", async ({ name: t, outDir: i, viewportWidth: a, height: o, skeletons: d }) => {
    if (!s) {
      e.send("save-result", {
        ok: !1,
        error: "Could not resolve Metro server URL. Make sure Metro is running."
      });
      return;
    }
    const l = `${s}/skeleton-save`;
    try {
      const r = await fetch(l, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: t, outDir: i, viewportWidth: a, height: o, skeletons: d })
      });
      if (r.ok) {
        const u = await r.json();
        e.send("save-result", { ok: !0, file: u.file, skeletons: u.skeletons });
      } else {
        const u = await r.text().catch(() => `HTTP ${r.status}`);
        e.send("save-result", { ok: !1, error: u });
      }
    } catch (r) {
      e.send("save-result", {
        ok: !1,
        error: `Could not reach Metro at ${l}.
${r?.message ?? String(r)}`
      });
    }
  }), () => clearInterval(p);
}
function v() {
  try {
    const e = g.DevSettings ?? g.RCTDevSettings, s = e?.scriptURL ?? e?.packagerHost;
    if (s)
      try {
        const n = new URL(s);
        return `${n.protocol}//${n.host}`;
      } catch {
        return `http://${s.replace(/\/.*$/, "")}`;
      }
    return "http://localhost:8081";
  } catch {
    return "http://localhost:8081";
  }
}
export {
  y as PLUGIN_ID,
  m as default
};
