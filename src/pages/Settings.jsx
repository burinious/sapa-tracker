import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { applyAppTheme, getStoredAppTheme } from "../utils/theme";
import { normalizeNotificationPrefs, PUSH_NOTIFICATION_AREAS } from "../utils/pushAreas";
import { STUDENT_QUICK_LINKS, normalizeStudentQuickLinks, normalizeStudentQuickLinkOrder } from "../utils/studentQuickLinks";
import "../styles/app.css";

const DASHBOARD_KEY = "sapa-dashboard-settings";

const MODE_OPTIONS = ["focus", "simple", "standard", "pro"];
const DASHBOARD_THEME_OPTIONS = ["ocean", "sunrise", "midnight", "obsidian"];
const RISK_WINDOW_OPTIONS = [7, 14, 30];

function readDashboardSettings() {
  try {
    const raw = localStorage.getItem(DASHBOARD_KEY);
    if (!raw) {
      return {
        riskWindowDays: 7,
        mode: "simple",
        theme: "ocean",
        overrides: {},
        midOrder: [],
        quickLinks: normalizeStudentQuickLinks(),
        quickLinkOrder: normalizeStudentQuickLinkOrder(),
      };
    }
    const parsed = JSON.parse(raw);
    return {
      riskWindowDays: Number(parsed?.riskWindowDays) || 7,
      mode: parsed?.mode || "simple",
      theme: parsed?.theme || "ocean",
      overrides: parsed?.overrides || {},
      midOrder: Array.isArray(parsed?.midOrder) ? parsed.midOrder : [],
      quickLinks: normalizeStudentQuickLinks(parsed?.quickLinks),
      quickLinkOrder: normalizeStudentQuickLinkOrder(parsed?.quickLinkOrder),
    };
  } catch {
    return {
      riskWindowDays: 7,
      mode: "simple",
      theme: "ocean",
      overrides: {},
      midOrder: [],
      quickLinks: normalizeStudentQuickLinks(),
      quickLinkOrder: normalizeStudentQuickLinkOrder(),
    };
  }
}

export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, updateUserProfile } = useAuth();
  const initialDash = useMemo(() => readDashboardSettings(), []);
  const initialNotificationPrefs = useMemo(
    () => normalizeNotificationPrefs(profile?.notificationPrefs),
    [profile?.notificationPrefs]
  );

  const [appTheme, setAppTheme] = useState(getStoredAppTheme());
  const [dashTheme, setDashTheme] = useState(initialDash.theme);
  const [dashMode, setDashMode] = useState(initialDash.mode);
  const [riskWindowDays, setRiskWindowDays] = useState(initialDash.riskWindowDays);
  const [quickLinks, setQuickLinks] = useState(initialDash.quickLinks);
  const [notificationPrefs, setNotificationPrefs] = useState(initialNotificationPrefs);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNotificationPrefs(initialNotificationPrefs);
  }, [initialNotificationPrefs]);

  useEffect(() => {
    setQuickLinks(initialDash.quickLinks);
  }, [initialDash.quickLinks]);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace("#", "").trim();
    if (!id) return;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
    return () => clearTimeout(t);
  }, [location.hash]);

  async function saveSettings() {
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
          quickLinks,
        })
      );
      if (user?.uid) {
        await updateUserProfile({ notificationPrefs });
      }
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

  function toggleNotificationPref(key) {
    setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleQuickLink(id) {
    setQuickLinks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="page-shell">
      <div className="page-card settings-page-card">
        <div className="page-title-row">
          <h1 className="page-title">Settings</h1>
        </div>
        <p className="page-sub">Fix app behavior, dashboard display and theme mode.</p>

        <div className="page-stack-md" style={{ marginTop: 14 }}>
          <div className="section-card" id="display">
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

          <div className="section-card" id="dashboard">
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

          <div className="section-card">
            <h3 className="section-title">Student Quick Links</h3>
            <div className="small muted">Choose which quick links appear on top of your dashboard.</div>
            <div className="settings-notify-stack">
              {STUDENT_QUICK_LINKS.map((item) => (
                <label key={item.id} className="settings-notify-item">
                  <input
                    type="checkbox"
                    checked={!!quickLinks[item.id]}
                    onChange={() => toggleQuickLink(item.id)}
                  />
                  <span>
                    <b>{item.label}</b>
                    <div className="small muted">{item.description}</div>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="section-card" id="notifications">
            <h3 className="section-title">Push Notifications</h3>
            <div className="small muted">Choose notification areas to receive on your phone.</div>
            <div className="settings-notify-stack">
              <label className="settings-notify-item">
                <input
                  type="checkbox"
                  checked={!!notificationPrefs.enabled}
                  onChange={() => toggleNotificationPref("enabled")}
                />
                <span>
                  <b>Enable notifications</b>
                  <div className="small muted">Turn all push notifications on or off.</div>
                </span>
              </label>

              {PUSH_NOTIFICATION_AREAS.map((area) => (
                <label key={area.id} className="settings-notify-item">
                  <input
                    type="checkbox"
                    checked={!!notificationPrefs[area.prefKey]}
                    disabled={!notificationPrefs.enabled}
                    onChange={() => toggleNotificationPref(area.prefKey)}
                  />
                  <span>
                    <b>{area.title}</b>
                    <div className="small muted">Example: {area.sample}</div>
                  </span>
                </label>
              ))}
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
