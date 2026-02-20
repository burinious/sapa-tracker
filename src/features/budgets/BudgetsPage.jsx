import React, { useEffect, useMemo, useState } from "react";
import { FaBullseye, FaCalendarAlt, FaChartLine, FaWallet } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getMonthlyBudget, monthKey, upsertMonthlyBudget } from "../../services/budgets";
import { getMonthlyBudgetLocal } from "../../utils/localBudgets";
import { getFinance } from "../../utils/localFinance";
import { fmtMoney } from "../../utils/money";
import LocalOnlyNotice from "../../components/LocalOnlyNotice";

function num(v, fallback = 0) {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMonthKeyFromDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function txDate(tx) {
  return (
    tx?.dateISO ||
    tx?.date ||
    tx?.updatedAtISO ||
    tx?.createdAtISO ||
    tx?.updatedAt ||
    tx?.createdAt ||
    tx?.timestamp ||
    ""
  );
}

function isBetTransaction(tx) {
  const hay = `${tx?.categoryName || ""} ${tx?.category || ""} ${tx?.title || ""} ${tx?.note || ""}`;
  return /(bet|betting|gambl|sporty|bookmaker)/i.test(String(hay).toLowerCase());
}

function monthLabel(month) {
  const [year, m] = String(month || "").split("-").map(Number);
  const d = new Date(year, (m || 1) - 1, 1);
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default function BudgetsPage() {
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const month = monthKey();
  const [dailyFloor, setDailyFloor] = useState("12000");
  const [betBudget, setBetBudget] = useState("50000");
  const [salaryExpected, setSalaryExpected] = useState("200000");
  const [pendingCount, setPendingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lastSavedAtISO, setLastSavedAtISO] = useState("");

  const dailyFloorValue = Math.max(0, num(dailyFloor));
  const betBudgetValue = Math.max(0, num(betBudget));
  const salaryExpectedValue = Math.max(0, num(salaryExpected));
  const payday = Math.max(1, Math.min(31, Math.floor(num(profile?.primaryIncome?.payday, 28))));

  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const plannedMonthlySpend = dailyFloorValue * daysInMonth;
  const projectedBuffer = salaryExpectedValue - plannedMonthlySpend;
  const projectedUsagePct = salaryExpectedValue > 0
    ? Math.round((plannedMonthlySpend / salaryExpectedValue) * 100)
    : 0;

  const transactions = useMemo(() => (uid ? (getFinance(uid)?.transactions || []) : []), [uid]);
  const betSpentMonthly = useMemo(() => {
    return transactions.reduce((sum, tx) => {
      if (String(tx?.type || "").toLowerCase() !== "expense") return sum;
      if (!isBetTransaction(tx)) return sum;
      if (toMonthKeyFromDate(txDate(tx)) !== month) return sum;
      return sum + Math.max(0, num(tx?.amount));
    }, 0);
  }, [transactions, month]);

  const betUsedPct = betBudgetValue > 0 ? Math.round((betSpentMonthly / betBudgetValue) * 100) : 0;
  const betUsageBar = Math.max(0, Math.min(100, betUsedPct));
  const betRemaining = Math.max(0, betBudgetValue - betSpentMonthly);
  const betOvershoot = Math.max(0, betSpentMonthly - betBudgetValue);

  useEffect(() => {
    if (!uid) return;
    const refreshLocalMeta = () => {
      const local = getMonthlyBudgetLocal(uid, month);
      setPendingCount(local && local.syncStatus !== "synced" ? 1 : 0);
      setLastSavedAtISO(local?.updatedAtISO || "");
    };
    refreshLocalMeta();
    window.addEventListener("sapa-sync", refreshLocalMeta);
    window.addEventListener("online", refreshLocalMeta);
    window.addEventListener("offline", refreshLocalMeta);
    return () => {
      window.removeEventListener("sapa-sync", refreshLocalMeta);
      window.removeEventListener("online", refreshLocalMeta);
      window.removeEventListener("offline", refreshLocalMeta);
    };
  }, [uid, month]);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    getMonthlyBudget(uid, month)
      .then((d) => {
        if (!active || !d) return;
        setDailyFloor(String(num(d.dailyFloor, 12000)));
        setBetBudget(String(num(d.categoryBudgets?.bet, 50000)));
        setSalaryExpected(String(num(d.salaryExpected, 200000)));
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [uid, month]);

  async function save() {
    if (!uid || saving) return;
    setSaveError("");
    setSaving(true);
    try {
      await upsertMonthlyBudget(uid, month, {
        month,
        payday,
        dailyFloor: dailyFloorValue,
        salaryExpected: salaryExpectedValue,
        categoryBudgets: { bet: betBudgetValue },
      });
      const local = getMonthlyBudgetLocal(uid, month);
      setPendingCount(local && local.syncStatus !== "synced" ? 1 : 0);
      setLastSavedAtISO(local?.updatedAtISO || new Date().toISOString());
    } catch (err) {
      setSaveError(err?.message || "Could not save budget right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="page-card budgets-page-card">
        <div className="budgets-hero">
          <div>
            <div className="page-title-row">
              <span className="page-title-icon"><FaWallet /></span>
              <h2 className="page-title">Budget Control Room</h2>
            </div>
            <p className="page-sub">Set realistic monthly limits and instantly see pressure before it becomes stress.</p>
          </div>
          <div className="budgets-month-chip">
            <FaCalendarAlt />
            <div>
              <div className="small">Current Month</div>
              <b>{monthLabel(month)}</b>
            </div>
          </div>
        </div>

        <LocalOnlyNotice pendingCount={pendingCount} />

        <div className="budgets-stats-grid">
          <div className="budgets-stat-card">
            <div className="budgets-stat-top">
              <span className="budgets-stat-icon"><FaBullseye /></span>
              <span className="small">Daily Baseline</span>
            </div>
            <div className="budgets-stat-main">{fmtMoney(dailyFloorValue, "NGN")} / day</div>
            <div className="small">Plan total this month: <b>{fmtMoney(plannedMonthlySpend, "NGN")}</b></div>
          </div>

          <div className="budgets-stat-card">
            <div className="budgets-stat-top">
              <span className="budgets-stat-icon"><FaChartLine /></span>
              <span className="small">Betting Limit</span>
            </div>
            <div className="budgets-stat-main">{fmtMoney(betSpentMonthly, "NGN")} used</div>
            <div className="budgets-progress-track">
              <span className="budgets-progress-fill" style={{ width: `${betUsageBar}%` }} />
            </div>
            <div className="small">
              {betBudgetValue > 0
                ? `${betUsedPct}% of ${fmtMoney(betBudgetValue, "NGN")} budget`
                : "Set a bet budget to track this category."}
            </div>
          </div>

          <div className="budgets-stat-card">
            <div className="budgets-stat-top">
              <span className="budgets-stat-icon"><FaWallet /></span>
              <span className="small">Salary Projection</span>
            </div>
            <div className="budgets-stat-main">{fmtMoney(salaryExpectedValue, "NGN")}</div>
            <div className={`small ${projectedBuffer >= 0 ? "budgets-good" : "budgets-bad"}`}>
              {projectedBuffer >= 0 ? "Projected buffer" : "Projected shortfall"}: <b>{fmtMoney(Math.abs(projectedBuffer), "NGN")}</b>
            </div>
            <div className="small">Baseline usage of salary: <b>{Math.max(0, projectedUsagePct)}%</b></div>
          </div>

          <div className="budgets-stat-card">
            <div className="budgets-stat-top">
              <span className="budgets-stat-icon"><FaCalendarAlt /></span>
              <span className="small">Payday + Sync</span>
            </div>
            <div className="budgets-stat-main">Day {payday}</div>
            <div className="small">Payday comes from your profile settings.</div>
            <div className={`small ${pendingCount > 0 ? "budgets-bad" : "budgets-good"}`}>
              {pendingCount > 0 ? `Pending cloud sync (${pendingCount})` : "Synced or ready to sync"}
            </div>
          </div>
        </div>

        <div className="section-card budgets-form-card" style={{ marginTop: 14 }}>
          <h3 className="section-title">Edit Monthly Limits</h3>
          <div className="budgets-form-grid">
            <label className="budgets-field">
              <span className="budgets-field-label">Daily Spend Baseline (NGN/day)</span>
              <input
                type="number"
                min="0"
                step="100"
                value={dailyFloor}
                onChange={(e) => setDailyFloor(e.target.value)}
              />
              <span className="small">Coach uses this for runway and pressure alerts.</span>
            </label>

            <label className="budgets-field">
              <span className="budgets-field-label">Bet Budget (NGN/month)</span>
              <input
                type="number"
                min="0"
                step="500"
                value={betBudget}
                onChange={(e) => setBetBudget(e.target.value)}
              />
              <span className="small">
                {betOvershoot > 0
                  ? `You are over by ${fmtMoney(betOvershoot, "NGN")} this month.`
                  : `Remaining this month: ${fmtMoney(betRemaining, "NGN")}.`}
              </span>
            </label>

            <label className="budgets-field">
              <span className="budgets-field-label">Salary Expected (NGN/month)</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={salaryExpected}
                onChange={(e) => setSalaryExpected(e.target.value)}
              />
              <span className="small">Planning value for this month&apos;s budget target.</span>
            </label>
          </div>

          <div className="budgets-inline-note small">
            Payday is currently set to day <b>{payday}</b>. To change it, go to <b>Edit Profile</b>.
          </div>

          <div className="toolbar budgets-toolbar">
            <button className="btn" type="button" onClick={save} disabled={saving || !uid}>
              {saving ? "Saving..." : "Save Budget"}
            </button>
            <div className={`budgets-save-state small ${saveError ? "is-error" : "is-ok"}`}>
              {saveError
                ? saveError
                : lastSavedAtISO
                  ? `Last saved: ${new Date(lastSavedAtISO).toLocaleString()}`
                  : "No local save yet for this month."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
