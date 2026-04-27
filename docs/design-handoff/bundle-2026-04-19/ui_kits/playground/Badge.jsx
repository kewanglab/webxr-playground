// Badge.jsx — VR / AR / CROSS-XR mode badge or state tag
function Badge({ tone = "neutral", children }) {
  const tones = {
    neutral: { bg: "var(--pg-shell-bg-subtle)", border: "var(--pg-shell-border-subtle)", color: "var(--pg-shell-text-muted)" },
    coral:   { bg: "rgba(185,86,78,0.12)", border: "var(--pg-shell-accent-primary)", color: "var(--pg-shell-accent-primary-hover)" },
    cyan:    { bg: "rgba(111,135,146,0.14)", border: "var(--pg-shell-state-success)", color: "var(--pg-shell-state-success)" },
    amber:   { bg: "rgba(222,161,153,0.18)", border: "var(--pg-shell-accent-soft)", color: "var(--pg-shell-accent-primary-hover)" },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 999,
      background: t.bg, border: `1px solid ${t.border}`, color: t.color,
      fontSize: 9.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
    }}>{children}</span>
  );
}
window.Badge = Badge;
