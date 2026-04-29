// HUDPanel.jsx — in-XR HUD pill / expanded panel with FPS, trial, metrics, method footer.
// All colors come from --pg-xr-hud-* tokens so it themes between warm-night and cloud-park.
function HUDPanel({ expanded, onToggle, fps = 89, trial = "Trial 2 / 8", method = "Hand · Pinch", metrics }) {
  const cells = metrics ?? [
    { label: "HIT", value: "0.92" }, { label: "ERR", value: "3.4°" },
    { label: "DIST", value: "0.28m" }, { label: "FRAME", value: "11.2" },
  ];
  // FPS health color — uses CSS vars that themes can rebind if needed.
  const fpsColor =
    fps >= 90 ? "var(--pg-xr-hud-fps-good, #6f9e78)" :
    fps >= 72 ? "var(--pg-xr-hud-fps-ok,   #d8b56d)" :
    fps >= 45 ? "var(--pg-xr-hud-fps-warn, #c9794d)" :
                "var(--pg-xr-hud-fps-bad,  #b64f4a)";

  // Translucent panel fill via color-mix on the theme's panel-fill token.
  // 90% keeps text legible against any canvas backdrop while preserving the "floating glass" feel.
  const panelBg = "color-mix(in srgb, var(--pg-xr-hud-panel-fill) 92%, transparent)";

  const shell = {
    background: panelBg,
    border: "1.4px solid var(--pg-xr-hud-panel-border)",
    color: "var(--pg-xr-hud-text-primary)",
    cursor: "pointer", userSelect: "none",
    backdropFilter: "blur(2px)",
    WebkitBackdropFilter: "blur(2px)",
    // Animate only what we want to animate. `transition: all` would interpolate
    // background through dark intermediate values when the theme flips, which
    // looks like a 200ms flash of warm-night.
    transition: "transform 200ms cubic-bezier(0.4,0,0.2,1)",
  };

  if (!expanded) {
    return (
      <div onClick={onToggle} style={{ ...shell, height: 38, borderRadius: 19, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: fpsColor, flexShrink: 0 }} />
        <span style={{ fontFamily: "var(--pg-font-mono)", fontSize: 17, color: fpsColor, lineHeight: 1, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fps}</span>
      </div>
    );
  }
  return (
    <div onClick={onToggle} style={{ ...shell, width: 295, borderRadius: 13, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: fpsColor, alignSelf: "center", marginBottom: 4 }} />
          <span style={{ fontFamily: "var(--pg-font-mono)", fontSize: 32, color: fpsColor, lineHeight: 1, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fps}</span>
          <span style={{ fontSize: 10, color: "var(--pg-xr-hud-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>FPS</span>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", lineHeight: 1.3 }}>
          <div style={{ fontSize: 11, color: "var(--pg-xr-hud-text-primary)", fontVariantNumeric: "tabular-nums" }}>{trial}</div>
          <div style={{ fontSize: 10, color: "var(--pg-xr-hud-text-muted)", marginTop: 2 }}>⌄ tap to collapse</div>
        </div>
      </div>
      <div style={{ height: 1, background: "color-mix(in srgb, var(--pg-xr-hud-panel-border) 36%, transparent)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 6 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "var(--pg-xr-hud-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontFamily: "var(--pg-font-mono)", fontSize: 13.5, color: "var(--pg-xr-hud-text-primary)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{
        padding: "7px 0", textAlign: "center",
        background: "color-mix(in srgb, var(--pg-xr-hud-panel-border) 20%, transparent)",
        borderRadius: 6, fontSize: 11,
        color: "var(--pg-xr-hud-panel-border)", fontWeight: 500, letterSpacing: "0.04em",
      }}>{method}</div>
    </div>
  );
}
window.HUDPanel = HUDPanel;
