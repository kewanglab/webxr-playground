// App.jsx — composes the whole shell. Theme toggle, lab switch, HUD expand/collapse.
const { useState } = React;

const LABS = [
  { id: "selection",    name: "Selection Lab",    mode: "CROSS-XR", desc: "Compare selection via ray, direct touch, and hand pinch", method: "Hand · Pinch" },
  { id: "placement",    name: "Placement Lab",    mode: "AR",       desc: "Place objects on detected surfaces using hit-test",       method: "Controller · Ray" },
  { id: "locomotion",   name: "Locomotion Lab",   mode: "VR",       desc: "Teleport, smooth movement, and turning systems",          method: "Teleport · Snap" },
  { id: "manipulation", name: "Manipulation Lab", mode: "CROSS-XR", desc: "DOF-Separation for 3D object manipulation",               method: "Virtual Hand" },
];

function App() {
  const [theme, setTheme] = useState("warm-night");
  const [labId, setLabId] = useState("selection");
  const [hudExpanded, setHudExpanded] = useState(true);
  const [tuning, setTuning] = useState({ size: 0.32, boost: 0.18, delay: 0.12 });

  React.useEffect(() => { document.documentElement.setAttribute("data-pg-theme", theme); }, [theme]);

  const lab = LABS.find(l => l.id === labId);

  return (
    <div id="app">
      <div className="canvas" data-pg-theme={theme}>
        <div className="floor"><div className="floor-grid" /></div>

        {/* Lab heading floats high in the canvas */}
        <div className="lab-heading">
          <div className="title">{lab.name}</div>
          <div className="sub">{lab.desc}</div>
        </div>

        {/* Stage props for selection lab; other labs swap geometry. Keep it identical for the kit demo. */}
        <div className="stage">
          <div className="pedestal"><div className="obj ray"   /><div className="base" /></div>
          <div className="pedestal"><div className="obj pinch" /><div className="base" /></div>
          <div className="pedestal"><div className="obj touch" /><div className="base" /></div>
        </div>

        <div className="hud-float">
          <HUDPanel expanded={hudExpanded} onToggle={() => setHudExpanded(v => !v)} method={lab.method} />
        </div>

        <div className="leva-float">
          <LevaPanel title={lab.name} badgeText={lab.mode} values={tuning} setValues={setTuning} />
        </div>
      </div>

      <div className="lab-line">
        <span className="name">{lab.name}</span>
        <span className="badge">{lab.mode}</span>
        <span className="sep" />
        <span className="desc">{lab.desc}</span>
      </div>

      <div className="shell-bar">
        <div className="group">
          <span className="label">Session</span>
          <Button variant="ghost">Enter VR</Button>
          <Button variant="ghost">Enter AR</Button>
        </div>
        <div className="divider" />
        <div className="group">
          <span className="label">Experiments</span>
          {LABS.map(l => (
            <LabChip key={l.id} active={l.id === labId} onClick={() => setLabId(l.id)}>{l.name}</LabChip>
          ))}
        </div>
        <div className="theme-toggle">
          <Button
            variant="primary"
            onClick={() => setTheme(t => t === "warm-night" ? "cloud-park" : "warm-night")}
          >
            {theme === "warm-night" ? "Switch to Cloud Park" : "Switch to Warm Night"}
          </Button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
