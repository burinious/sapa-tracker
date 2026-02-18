import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { applyAppTheme, getStoredAppTheme } from "../utils/theme";
import "../styles/app.css";

const DASHBOARD_KEY = "sapa-dashboard-settings";

const MODE_OPTIONS = ["focus", "simple", "standard", "pro"];
const DASHBOARD_THEME_OPTIONS = ["ocean", "sunrise", "midnight", "obsidian"];
const RISK_WINDOW_OPTIONS = [7, 14, 30];

function readDashboardSettings() {
  try {
    const raw = localStorage.getItem(DASHBOARD_KEY);
    if (!raw) {
      return { riskWindowDays: 7, mode: "simple", theme: "ocean", overrides: {}, midOrder: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      riskWindowDays: Number(parsed?.riskWindowDays) || 7,
      mode: parsed?.mode || "simple",
      theme: parsed?.theme || "ocean",
      overrides: parsed?.overrides || {},
      midOrder: Array.isArray(parsed?.midOrder) ? parsed.midOrder : [],
    };
  } catch {
    return { riskWindowDays: 7, mode: "simple", theme: "ocean", overrides: {}, midOrder: [] };
  }
}

export default function Settings() {
  const navigate = useNavigate();
  const initialDash = useMemo(() => readDashboardSettings(), []);

  const [appTheme, setAppTheme] = useState(getStoredAppTheme());
  const [dashTheme, setDashTheme] = useState(initialDash.theme);
  const [dashMode, setDashMode] = useState(initialDash.mode);
  const [riskWindowDays, setRiskWindowDays] = useState(initialDash.riskWindowDays);
  const [busy, setBusy] = useState(false);

  function saveSettings() {
    setBusy(true);
    try {
      applyAppTheme(appTheme);
      localStorage.setItem(
        DASHBOARD_KEY,
        JSON.stringify({
          ...initialDash,
          riskWindowDays,
          mode: dashMode,
          theme: dashTheme,
        })
      );
      toast.success("Settings updated");
    } catch (err) {
      toast.error(err?.message || "Failed to save settings");
    } finally {
      setBusy(false);
    }
  }

  function resetDashboardLayout() {
    try {
      const current = readDashboardSettings();
      localStorage.setItem(
        DASHBOARD_KEY,
        JSON.stringify({
          ...current,
          overrides: {},
          midOrder: [],
        })
      );
      toast.success("Dashboard layout reset");
    } catch (err) {
      toast.error(err?.message || "Failed to reset dashboard layout");
    }
  }

  return (
    <div className="page-shell">
      <div className="page-card settings-page-card">
        <div className="page-title-row">
          <h1 className="page-title">Settings</h1>
        </div>
        <p className="page-sub">Fix app behavior, dashboard display and theme mode.</p>

        <div className="page-stack-md" style={{ marginTop: 14 }}>
          <div className="section-card">
            <h3 className="section-title">App Theme</h3>
            <div className="small muted">Switch between light and dark mode for the entire app.</div>
            <div className="toolbar">
              {["light", "dark"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="btn settings-chip-btn"
                  onClick={() => setAppTheme(value)}
                  aria-pressed={appTheme === value}
                  data-active={appTheme === value ? "1" : "0"}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title">Dashboard Themes</h3>
            <div className="small muted">Choose a dashboard style including dark themes.</div>
            <div className="split-2" style={{ marginTop: 10 }}>
              <div>
                <label className="small">Theme</label>
                <select className="input" value={dashTheme} onChange={(e) => setDashTheme(e.target.value)}>
                  {DASHBOARD_THEME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="small">Mode</label>
                <select className="input" value={dashMode} onChange={(e) => setDashMode(e.target.value)}>
                  {MODE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="small">Risk window</label>
              <div className="toolbar">
                {RISK_WINDOW_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    className="btn settings-chip-btn"
                    onClick={() => setRiskWindowDays(days)}
                    aria-pressed={riskWindowDays === days}
                    data-active={riskWindowDays === days ? "1" : "0"}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title">Fix Dashboard</h3>
            <div className="small muted">If widgets look wrong, reset order and visibility overrides.</div>
            <div className="toolbar">
              <button type="button" className="btn settings-secondary-btn" onClick={resetDashboardLayout}>
                Reset layout
              </button>
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn" onClick={saveSettings} disabled={busy}>
              {busy ? "Saving..." : "Save settings"}
            </button>
            <button type="button" className="btn settings-secondary-btn" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
