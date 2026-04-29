// LevaPanel.jsx — minimal Leva tuning recreation with stepperNumber rows
function LevaRow({ label, value, min = 0, max = 1, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid var(--pg-shell-bg-subtle)", gap: 12 }}>
      <span style={{ fontSize: 12, color: "var(--pg-shell-text-muted)", width: 130, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => onChange(Math.max(min, value - (max - min) / 20))} style={stepBtn}>−</button>
        <input value={value.toFixed(2)} readOnly style={numInput} />
        <button onClick={() => onChange(Math.min(max, value + (max - min) / 20))} style={stepBtn}>+</button>
        <div style={{ flex: 1, height: 8, background: "var(--pg-shell-bg-subtle)", borderRadius: 4, position: "relative", marginLeft: 8 }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, background: "var(--pg-shell-accent-primary)", borderRadius: 4, width: `${pct}%` }} />
          <div style={{
            position: "absolute", top: "50%", left: `${pct}%`,
            transform: "translate(-50%,-50%)",
            width: 20, height: 20, borderRadius: 999,
            background: "var(--pg-shell-bg-elevated)",
            border: "2px solid var(--pg-shell-accent-primary)",
            boxShadow: "0 1px 3px rgba(58,40,32,0.18), 0 0 0 4px rgba(185,86,78,0.08)",
            cursor: "grab",
          }}>
            <div style={{
              position: "absolute", inset: 5, borderRadius: 999,
              background: "var(--pg-shell-accent-primary)",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
const stepBtn = { width: 24, height: 24, borderRadius: 6, background: "var(--pg-shell-bg-subtle)", border: "1px solid var(--pg-shell-border-subtle)", color: "var(--pg-shell-text-primary)", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const numInput = { width: 52, height: 24, borderRadius: 6, background: "#fff", border: "1px solid var(--pg-shell-border-subtle)", padding: "0 6px", fontFamily: "var(--pg-font-mono)", fontSize: 12, color: "var(--pg-shell-text-primary)" };

function LevaPanel({ title, badgeText, values, setValues }) {
  return (
    <div style={{
      background: "var(--pg-shell-bg-elevated)",
      border: "1px solid var(--pg-shell-border-subtle)",
      borderRadius: 14,
      boxShadow: "0 1px 0 var(--pg-shell-shadow-soft)",
      overflow: "hidden",
      color: "var(--pg-shell-text-primary)",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--pg-shell-border-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        {badgeText && <span style={{ marginLeft: "auto", fontSize: 9.5, padding: "2px 8px", borderRadius: 999, background: "var(--pg-shell-bg-subtle)", color: "var(--pg-shell-text-muted)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{badgeText}</span>}
      </div>
      <LevaRow label="target size"   value={values.size}    min={0.10} max={0.50} onChange={(v) => setValues({ ...values, size: v })} />
      <LevaRow label="confirm boost" value={values.boost}   min={0.00} max={0.30} onChange={(v) => setValues({ ...values, boost: v })} />
      <LevaRow label="hover delay"   value={values.delay}   min={0}    max={0.50} onChange={(v) => setValues({ ...values, delay: v })} />
    </div>
  );
}
window.LevaPanel = LevaPanel;
