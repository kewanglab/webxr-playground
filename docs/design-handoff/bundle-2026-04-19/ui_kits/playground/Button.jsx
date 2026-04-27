// Button.jsx — primary / ghost / disabled / focus
function Button({ variant = "ghost", disabled = false, focused = false, children, onClick }) {
  const base = {
    fontFamily: "inherit", fontSize: 13, fontWeight: 500,
    borderRadius: 10, padding: "10px 18px", cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 150ms cubic-bezier(0.4,0,0.2,1)",
    outline: focused ? "2px solid var(--pg-shell-accent-primary)" : "none",
    outlineOffset: focused ? 2 : 0,
  };
  const styles = {
    primary: { ...base, background: "var(--pg-shell-accent-primary)", color: "var(--pg-shell-text-inverse)", border: "1px solid var(--pg-shell-accent-primary-hover)" },
    ghost: { ...base, background: "transparent", color: "var(--pg-shell-text-primary)", border: "1px solid var(--pg-shell-accent-primary)" },
    disabled: { ...base, background: "var(--pg-shell-bg-subtle)", color: "var(--pg-shell-text-muted)", border: "1px solid var(--pg-shell-border-subtle)" },
  };
  const v = disabled ? "disabled" : variant;
  return <button style={styles[v]} disabled={disabled} onClick={onClick}>{children}</button>;
}
window.Button = Button;
