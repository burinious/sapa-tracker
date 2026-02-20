import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardUpgrade.css";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardControlBar from "../components/dashboard/DashboardControlBar";
import SapaRiskMeter from "../components/dashboard/SapaRiskMeter";
import QuickAddRow from "../components/dashboard/QuickAddRow";
import StudentQuickLinks from "../components/dashboard/StudentQuickLinks";
import PressureThisWeek from "../components/dashboard/PressureThisWeek";
import AINotesCarousel from "../components/dashboard/AINotesCarousel";
import SnapshotCards from "../components/dashboard/SnapshotCards";
import CashTrendSparkline from "../components/dashboard/CashTrendSparkline";
import SpendingInsights from "../components/dashboard/SpendingInsights";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import SidebarModulesPanel from "../components/dashboard/SidebarModulesPanel";
import ActionCenterCard from "../components/dashboard/ActionCenterCard";

import useDashboardData from "../hooks/useDashboardData";
import useSapaAiNotes from "../hooks/useSapaAiNotes";
import { DASHBOARD_PRESETS, mergeWidgets } from "../utils/dashboardPresets";
import {
  STUDENT_QUICK_LINK_DEFAULTS,
  STUDENT_QUICK_LINK_ORDER,
  normalizeStudentQuickLinks,
  normalizeStudentQuickLinkOrder,
} from "../utils/studentQuickLinks";

import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

const MID_WIDGET_KEYS = ["quickAdd", "modules", "actionCenter", "pressureThisWeek", "aiNotes", "spendingInsights"];
const RISK_WINDOWS = [7, 14, 30];
const DEFAULT_DASHBOARD_MODE = "simple";
const DASHBOARD_THEMES = ["ocean", "sunrise", "midnight", "obsidian"];
const DEFAULT_DASHBOARD_THEME = "ocean";
const WIDGET_TITLES = {
  quickAdd: "Quick Add",
  modules: "Sidebar Modules",
  actionCenter: "Action Center",
  pressureThisWeek: "Pressure This Week",
  aiNotes: "AI Notes",
  spendingInsights: "Spending Insights",
};

function normalizeOrder(order = []) {
  const valid = order.filter((k) => MID_WIDGET_KEYS.includes(k));
  const missing = MID_WIDGET_KEYS.filter((k) => !valid.includes(k));
  return [...valid, ...missing];
}

function normalizeRiskWindow(value) {
  const days = Number(value);
  return RISK_WINDOWS.includes(days) ? days : 7;
}

function normalizeMode(value) {
  return DASHBOARD_PRESETS[value] ? value : DEFAULT_DASHBOARD_MODE;
}

function normalizeTheme(value) {
  return DASHBOARD_THEMES.includes(value) ? value : DEFAULT_DASHBOARD_THEME;
}

function reorder(list, dragged, target) {
  const copy = [...list];
  const from = copy.indexOf(dragged);
  const to = copy.indexOf(target);
  if (from < 0 || to < 0 || from === to) return copy;
  copy.splice(from, 1);
  copy.splice(to, 0, dragged);
  return copy;
}

function anchorOf(widgetKey) {
  if (widgetKey === "pressureThisWeek") return "pressure";
  if (widgetKey === "spendingInsights") return "insights";
  if (widgetKey === "aiNotes") return "notes";
  return undefined;
}

function reorderByStep(list, key, step) {
  const from = list.indexOf(key);
  if (from < 0) return list;
  const to = Math.max(0, Math.min(list.length - 1, from + step));
  if (to === from) return list;
  const copy = [...list];
  copy.splice(from, 1);
  copy.splice(to, 0, key);
  return copy;
}

function LoadingStateCard({
  kicker = "SapaTracker",
  title = "SapaTracker",
  sub = "Preparing your dashboard...",
}) {
  return (
    <div className="st-card st-loading-card" role="status" aria-live="polite">
      <div className="st-loading-head">
        <div className="st-loader-orbit" aria-hidden="true">
          <span className="st-loader-ring st-loader-ring-a" />
          <span className="st-loader-ring st-loader-ring-b" />
          <span className="st-loader-ring st-loader-ring-c" />
          <span className="st-loader-core" />
        </div>
        <div>
          <div className="st-kicker">{kicker}</div>
          <div className="st-loading-title st-loading-brand">{title}</div>
          <div className="st-sub">{sub}</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [fbUser, setFbUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authTimeout, setAuthTimeout] = useState(false);
  const [riskWindowDays, setRiskWindowDays] = useState(7);
  const [dashboardMode, setDashboardMode] = useState(DEFAULT_DASHBOARD_MODE);
  const [dashboardTheme, setDashboardTheme] = useState(DEFAULT_DASHBOARD_THEME);
  const [widgetOverrides, setWidgetOverrides] = useState({});
  const [midOrder, setMidOrder] = useState(MID_WIDGET_KEYS);
  const [quickLinks, setQuickLinks] = useState(STUDENT_QUICK_LINK_DEFAULTS);
  const [quickLinkOrder, setQuickLinkOrder] = useState(STUDENT_QUICK_LINK_ORDER);
  const [draggedWidget, setDraggedWidget] = useState("");
  const [dragTargetWidget, setDragTargetWidget] = useState("");
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAuthTimeout(true);
      setAuthLoading(false);
    }, 8000);

    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(timeoutId);
      setFbUser(u || null);
      setAuthLoading(false);
      setAuthTimeout(false);
    });
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, []);

  const uid = fbUser?.uid;
  const username =
    profile?.fullName ||
    fbUser?.displayName ||
    profile?.username ||
    (fbUser?.email ? fbUser.email.split("@")[0] : "User");
  const currency = "NGN";
  const txWindowDays = riskWindowDays === 30 ? 60 : 30;

  useEffect(() => {
    const raw = localStorage.getItem("sapa-dashboard-settings");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.riskWindowDays != null) {
          setRiskWindowDays(normalizeRiskWindow(parsed.riskWindowDays));
        }
        if (parsed?.mode) setDashboardMode(normalizeMode(parsed.mode));
        if (parsed?.theme) setDashboardTheme(normalizeTheme(parsed.theme));
        if (parsed?.overrides && typeof parsed.overrides === "object") {
          setWidgetOverrides(parsed.overrides);
        }
        if (Array.isArray(parsed?.midOrder)) {
          setMidOrder(normalizeOrder(parsed.midOrder));
        }
        setQuickLinks(normalizeStudentQuickLinks(parsed?.quickLinks));
        setQuickLinkOrder(normalizeStudentQuickLinkOrder(parsed?.quickLinkOrder));
      } catch {
        // ignore invalid local settings
      }
    }
    setSettingsReady(true);
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    localStorage.setItem("sapa-dashboard-settings", JSON.stringify({
      riskWindowDays,
      mode: dashboardMode,
      theme: dashboardTheme,
      overrides: widgetOverrides,
      midOrder,
      quickLinks,
      quickLinkOrder,
    }));
  }, [riskWindowDays, dashboardMode, dashboardTheme, widgetOverrides, midOrder, quickLinks, quickLinkOrder, settingsReady]);

  const visibleWidgets = useMemo(() => {
    const preset = DASHBOARD_PRESETS[dashboardMode]?.widgets || {};
    return mergeWidgets(preset, widgetOverrides);
  }, [dashboardMode, widgetOverrides]);

  const { loading, error, notes: storedNotes, computed, transactions, subscriptions } = useDashboardData(uid, {
    currency,
    riskWindowDays,
    txWindowDays,
    notesLimit: 8,
    cashAtHand: profile?.cashAtHand,
  });

  const { notes: aiNotes } = useSapaAiNotes({
    transactions: transactions || [],
    subscriptions: subscriptions || [],
    computed,
    profile: { currency, riskWindowDays },
  });

  const mergedNotes = aiNotes?.length ? aiNotes : (storedNotes || []);
  const dueCount = computed?.dueSoon?.length || 0;

  const leftProps = useMemo(() => ({
    score: computed?.score || 0,
    zone: computed?.zone || "YELLOW ZONE",
    cashApprox: computed?.cashApprox || 0,
    dueTotal: computed?.dueTotal || 0,
    avgDailySpend7: computed?.avgDailySpend7 || 0,
  }), [computed]);

  const renderMidWidget = (key) => {
    if (key === "quickAdd") return visibleWidgets.quickAdd ? <QuickAddRow /> : null;
    if (key === "modules") {
      if (!visibleWidgets.modules) return null;
      return (
        <SidebarModulesPanel
          uid={uid}
          computed={computed}
          transactions={transactions}
          subscriptions={subscriptions}
          aiNotesCount={mergedNotes?.length || 0}
        />
      );
    }
    if (key === "actionCenter") {
      if (!visibleWidgets.actionCenter || loading) return null;
      return <ActionCenterCard computed={computed} riskWindowDays={riskWindowDays} currency={currency} />;
    }
    if (key === "pressureThisWeek") {
      if (!visibleWidgets.pressureThisWeek || loading) return null;
      return (
        <PressureThisWeek
          dueSoon={computed?.dueSoon || []}
          dueTotal={computed?.dueTotal || 0}
          currency={currency}
          riskWindowDays={riskWindowDays}
        />
      );
    }
    if (key === "aiNotes") {
      if (!visibleWidgets.aiNotes || loading) return null;
      return <AINotesCarousel notes={mergedNotes || []} />;
    }
    if (key === "spendingInsights") {
      if (!visibleWidgets.spendingInsights || loading) return null;
      return <SpendingInsights topCats={computed?.topCats || []} currency={currency} />;
    }
    return null;
  };

  const moveWidget = (key, step) => {
    setMidOrder((prev) => normalizeOrder(reorderByStep(prev, key, step)));
  };

  const swapQuickLink = (draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    setQuickLinkOrder((prev) => normalizeStudentQuickLinkOrder(reorder(prev, draggedId, targetId)));
  };

  if (authLoading) {
    return (
      <div className="st-wrap">
        <LoadingStateCard
          kicker="SapaTracker"
          title="SapaTracker"
          sub="Securing your session..."
        />
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="st-wrap">
        <div className="st-card">
          <div className="st-kicker">Auth</div>
          <div className="st-title">You are not logged in</div>
          <div className="st-sub">
            {authTimeout
              ? "Session check timed out. Please log in again. If this keeps happening, verify Vercel env vars and Firebase authorized domains."
              : "Go back to login to access your dashboard."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`st-wrap st-theme-${dashboardTheme}`}>
      <div className="st-grid">
        <div className="st-col st-col-left">
          <div className="st-anim" style={{ "--d": "0.02s" }}>
            <DashboardHeader
              username={username}
              dueCount={dueCount}
              riskWindowDays={riskWindowDays}
              cashApprox={computed?.cashApprox || 0}
              mtdIncome={computed?.mtdIncome || 0}
              mtdExpense={computed?.mtdExpense || 0}
              score={computed?.score || 0}
              currency={currency}
            />
          </div>

          <div className="st-anim" style={{ "--d": "0.04s" }}>
            <SapaRiskMeter
              score={leftProps.score}
              zone={leftProps.zone}
              cashApprox={leftProps.cashApprox}
              dueTotal={leftProps.dueTotal}
              avgDailySpend7={leftProps.avgDailySpend7}
              currency={currency}
              windowDays={riskWindowDays}
            />
          </div>

          <div className="st-anim" style={{ "--d": "0.05s" }}>
            <SnapshotCards
              currency={currency}
              cashApprox={computed?.cashApprox || 0}
              mtdIncome={computed?.mtdIncome || 0}
              mtdExpense={computed?.mtdExpense || 0}
            />
          </div>

          <div className="st-anim" style={{ "--d": "0.06s" }}>
            <DashboardControlBar
              riskWindowDays={riskWindowDays}
              onChangeWindow={setRiskWindowDays}
              mode={dashboardMode}
              theme={dashboardTheme}
              onOpenSettings={() => navigate("/settings")}
            />
          </div>

          <div className="st-anim" style={{ "--d": "0.07s" }}>
            <StudentQuickLinks
              computed={computed}
              visibility={quickLinks}
              order={quickLinkOrder}
              onSwap={swapQuickLink}
            />
          </div>

          <div className="st-anim" style={{ "--d": "0.10s" }}>
            <CashTrendSparkline transactions={transactions || []} currency={currency} days={14} />
          </div>
        </div>

        <div className="st-mid st-col-mid">
          {error ? (
            <div className="st-card">
              <div className="st-kicker">Error</div>
              <div className="st-sub">{error}</div>
            </div>
          ) : null}

          {loading ? (
            <LoadingStateCard
              kicker="SapaTracker"
              title="SapaTracker"
              sub="Syncing your money reality..."
            />
          ) : null}

          {midOrder.map((key, idx) => {
            const widget = renderMidWidget(key);
            if (!widget) return null;
            const canMoveUp = idx > 0;
            const canMoveDown = idx < (midOrder.length - 1);
            return (
              <div
                key={key}
                id={anchorOf(key)}
                draggable
                className={`st-draggable-item st-anim ${draggedWidget === key ? "is-dragging" : ""} ${dragTargetWidget === key ? "is-drop-target" : ""}`}
                style={{ "--d": `${0.04 + (idx * 0.03)}s` }}
                onDragStart={() => setDraggedWidget(key)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedWidget && draggedWidget !== key) {
                    setDragTargetWidget(key);
                  }
                }}
                onDrop={() => {
                  setMidOrder((prev) => normalizeOrder(reorder(prev, draggedWidget, key)));
                  setDragTargetWidget("");
                }}
                onDragEnd={() => {
                  setDraggedWidget("");
                  setDragTargetWidget("");
                }}
              >
                <div className="st-drag-meta">
                  <div className="st-drag-handle">Hold and drag to reorder</div>
                  <div className="st-drag-buttons">
                    <button
                      type="button"
                      className="st-drag-btn"
                      aria-label={`Move ${WIDGET_TITLES[key] || key} up`}
                      disabled={!canMoveUp}
                      onClick={() => moveWidget(key, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="st-drag-btn"
                      aria-label={`Move ${WIDGET_TITLES[key] || key} down`}
                      disabled={!canMoveDown}
                      onClick={() => moveWidget(key, 1)}
                    >
                      Down
                    </button>
                  </div>
                </div>
                {widget}
              </div>
            );
          })}
        </div>

        <div className="st-col st-col-right">
          {visibleWidgets.recentTransactions ? <RecentTransactions recent={computed?.recent || []} currency={currency} /> : null}

          {visibleWidgets.sapaAiInfo ? (
            <div className="st-card st-anim" style={{ "--d": "0.09s" }}>
              <div className="st-kicker">SAPA A.I</div>
              <div className="st-sub">
                SAPA A.I is data-driven and can use backend AI for deeper insight.
              </div>
            </div>
          ) : null}
        </div>
      </div>

    </div>
  );
}
