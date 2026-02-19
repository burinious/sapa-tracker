import { useEffect, useMemo, useState } from "react";
import { DASHBOARD_PRESETS, DASHBOARD_WIDGETS, mergeWidgets } from "../utils/dashboardPresets";

const WIDGET_LABELS = {
  quickAdd: "Quick Add",
  modules: "Sidebar Modules",
  actionCenter: "Action Center",
  pressureThisWeek: "Pressure This Week",
  aiNotes: "AI Notes",
  spendingInsights: "Spending Insights",
  recentTransactions: "Recent Transactions",
  sapaAiInfo: "SAPA A.I Info",
};

export default function DashboardSettings({
  open,
  onClose,
  mode,
  theme,
  overrides,
  onSave,
}) {
  const [draftMode, setDraftMode] = useState(mode || "simple");
  const [draftTheme, setDraftTheme] = useState(theme || "ocean");
  const [draftOverrides, setDraftOverrides] = useState(overrides || {});

  useEffect(() => {
    if (open) {
      setDraftMode(mode || "simple");
      setDraftTheme(theme || "ocean");
      setDraftOverrides(overrides || {});
    }
  }, [open, mode, theme, overrides]);

  const show = useMemo(() => {
    const preset = DASHBOARD_PRESETS[draftMode]?.widgets || {};
    return mergeWidgets(preset, draftOverrides);
  }, [draftMode, draftOverrides]);

  const toggle = (k) => {
    setDraftOverrides((prev) => ({ ...(prev || {}), [k]: !show[k] }));
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="list-top">
          <div>
            <h3 className="page-title">Dashboard Settings</h3>
            <p className="small muted">Choose a level, then toggle widgets.</p>
          </div>
          <button className="btn" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="page-stack-md" style={{ marginTop: 12 }}>
          <div>
            <label className="small">Dashboard level</label>
            <select className="input" value={draftMode} onChange={(e) => setDraftMode(e.target.value)}>
              <option value="focus">Focus</option>
              <option value="simple">Simple</option>
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div>
            <label className="small">Visual theme</label>
            <select className="input" value={draftTheme} onChange={(e) => setDraftTheme(e.target.value)}>
              <option value="ocean">Ocean Glass</option>
              <option value="sunrise">Sunrise Glow</option>
              <option value="midnight">Midnight Dark</option>
              <option value="obsidian">Obsidian Dark</option>
            </select>
          </div>

          <div>
            <div className="small muted" style={{ marginBottom: 8 }}>Widgets (on/off)</div>
            <div className="split-2">
              {DASHBOARD_WIDGETS.map((k) => (
                <label key={k} className="list-card small" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!show[k]} onChange={() => toggle(k)} />
                  <span style={{ fontWeight: 800 }}>{WIDGET_LABELS[k] || k}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="toolbar">
            <button
              className="btn"
              type="button"
              onClick={() => {
                onSave?.({ mode: draftMode, theme: draftTheme, overrides: draftOverrides });
                onClose?.();
              }}
            >
              Save Settings
            </button>

            <button className="btn" type="button" onClick={() => setDraftOverrides({})}>
              Reset Overrides
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
