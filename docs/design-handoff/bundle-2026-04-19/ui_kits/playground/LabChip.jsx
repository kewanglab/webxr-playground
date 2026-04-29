// LabChip.jsx — active / inactive lab selector chip (used inside the shell bar)
function LabChip({ active = false, onClick, children }) {
  const base = {
    fontFamily: "inherit", fontSize: 13, fontWeight: active ? 600 : 500,
    borderRadius: 10, padding: "10px 14px", cursor: "pointer",
    transition: "all 150ms cubic-bezier(0.4,0,0.2,1)",
    whiteSpace: "nowrap",
  };
  const style = active
    ? { ...base,
        background: "color-mix(in srgb, var(--pg-shell-accent-primary) 14%, transparent)",
        color: "var(--pg-shell-text-primary)",
        border: "1px solid var(--pg-shell-accent-primary)" }
    : { ...base,
        background: "transparent",
        color: "var(--pg-shell-text-muted)",
        border: "1px solid var(--pg-shell-border-subtle)" };
  return <button style={style} onClick={onClick}>{children}</button>;
}
window.LabChip = LabChip;
