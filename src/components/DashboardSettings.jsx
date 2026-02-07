import { useEffect, useMemo, useState } from "react";
import { DASHBOARD_PRESETS, DASHBOARD_WIDGETS, mergeWidgets } from "../utils/dashboardPresets";

export default function DashboardSettings({
  open,
  onClose,
  mode,
  overrides,
  onSave,
}) {
  const [draftMode, setDraftMode] = useState(mode || "simple");
  const [draftOverrides, setDraftOverrides] = useState(overrides || {});

  useEffect(() => {
    if (open) {
      setDraftMode(mode || "simple");
      setDraftOverrides(overrides || {});
    }
  }, [open, mode, overrides]);

  const preset = DASHBOARD_PRESETS[draftMode]?.widgets || {};
  const show = useMemo(() => mergeWidgets(preset, draftOverrides), [preset, draftOverrides]);

  const toggle = (k) => {
    setDraftOverrides((prev) => ({ ...(prev || {}), [k]: !show[k] }));
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 14,
      }}
      onClick={onClose}
    >
      <div
        className="st-card"
        style={{ width: "min(860px, 96vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>Dashboard Settings</h3>
            <p className="small" style={{ opacity: 0.85 }}>
              Choose a level, then toggle widgets.
            </p>
          </div>
          <button className="btn" type="button" onClick={onClose}>Close</button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div>
            <label className="small">Dashboard level</label>
            <select className="input" value={draftMode} onChange={(e) => setDraftMode(e.target.value)}>
              <option value="simple">Simple</option>
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div>
            <div className="small" style={{ opacity: 0.85, marginBottom: 8 }}>
              Widgets (on/off)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {DASHBOARD_WIDGETS.map((k) => (
                <label
                  key={k}
                  className="small"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 14,
                    padding: 10,
                    background: "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                  }}
                >
                  <input type="checkbox" checked={!!show[k]} onChange={() => toggle(k)} />
                  <span style={{ fontWeight: 800 }}>{k}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <button
              className="btn"
              type="button"
              onClick={() => {
                onSave?.({ mode: draftMode, overrides: draftOverrides });
                onClose?.();
              }}
            >
              Save Settings
            </button>

            <button
              className="btn"
              type="button"
              onClick={() => setDraftOverrides({})}
            >
              Reset Overrides
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
