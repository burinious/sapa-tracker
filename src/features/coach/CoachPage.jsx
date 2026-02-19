import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaUserTie } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import useDashboardData from "../../hooks/useDashboardData";
import { monthKey } from "../../services/budgets";
import { getMonthlyBudgetLocal } from "../../utils/localBudgets";
import { getEntries } from "../../utils/localEntries";
import { getFinance } from "../../utils/localFinance";
import { getLoans } from "../../utils/localLoans";
import { getShopping } from "../../utils/localShopping";
import { computeCoachNotes } from "./coachEngine";
import { deriveCoachInput } from "./coachInputBuilder";

function formatMoney(v) {
  return `NGN ${Math.round(Number(v || 0)).toLocaleString("en-NG")}`;
}

function priorityBadge(priority) {
  if (priority === "HIGH") return "coach-priority-high";
  if (priority === "MEDIUM") return "coach-priority-medium";
  return "coach-priority-low";
}

function riskClass(color) {
  if (color === "RED") return "coach-risk-red";
  if (color === "YELLOW") return "coach-risk-yellow";
  return "coach-risk-green";
}

export default function CoachPage({ coachInput }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const month = monthKey();

  const finance = useMemo(
    () => (uid ? getFinance(uid) : { cashAtHand: 0, transactions: [] }),
    [uid]
  );
  const entries = useMemo(() => (uid ? getEntries(uid) : []), [uid]);
  const loans = useMemo(() => (uid ? getLoans(uid) : []), [uid]);
  const shopping = useMemo(() => (uid ? getShopping(uid) : []), [uid]);
  const monthBudget = useMemo(() => (uid ? getMonthlyBudgetLocal(uid, month) : null), [uid, month]);

  const { computed, transactions } = useDashboardData(uid, {
    currency: "NGN",
    riskWindowDays: 7,
    txWindowDays: 30,
    notesLimit: 8,
  });

  const liveInput = useMemo(
    () =>
      deriveCoachInput({
        profile,
        computed,
        finance,
        transactions,
        entries,
        loans,
        shopping,
        monthBudget,
      }),
    [profile, computed, finance, transactions, entries, loans, shopping, monthBudget]
  );

  const input = coachInput || liveInput;
  const out = useMemo(() => computeCoachNotes(input), [input]);

  const immediateActions = useMemo(() => {
    const high = out.notes.filter((n) => n.priority === "HIGH");
    const medium = out.notes.filter((n) => n.priority === "MEDIUM");
    return [...high, ...medium].slice(0, 3);
  }, [out.notes]);

  const grouped = useMemo(() => {
    const groups = { HIGH: [], MEDIUM: [], LOW: [] };
    out.notes.forEach((n) => {
      if (groups[n.priority]) groups[n.priority].push(n);
      else groups.LOW.push(n);
    });
    return groups;
  }, [out.notes]);

  if (!uid) {
    return (
      <div className="page-shell">
        <div className="page-card">
          <div className="page-title-row">
            <span className="page-title-icon">
              <FaUserTie />
            </span>
            <h2 className="page-title">Coach</h2>
          </div>
          <p className="small">Log in to activate your coach.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-card coach-page-card">
        <div className="page-title-row">
          <span className="page-title-icon">
            <FaUserTie />
          </span>
          <h2 className="page-title">Coach</h2>
        </div>
        <p className="page-sub">Personal guidance based on your real entries, spending, loans and budget behavior.</p>

        <div className={`coach-risk-banner ${riskClass(out.sapaColor)}`}>
          <div>
            <div className="small">Sapa Risk</div>
            <div className="coach-risk-score">
              {out.sapaColor} <span>{out.sapaRisk}/100</span>
            </div>
          </div>
          <div className="coach-risk-meta">
            <div>Runway: <b>{out.runwayDays.toFixed(1)} days</b></div>
            <div>Days to payday: <b>{out.daysToPayday}</b></div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-pill">Cash view: <b>{formatMoney(input.manualCash ?? input.computedCash ?? 0)}</b></div>
          <div className="stat-pill">Daily floor: <b>{formatMoney(input.dailyFloor)}</b></div>
          <div className="stat-pill">Loan owed: <b>{formatMoney(input.totalLoanOwed)}</b></div>
          <div className="stat-pill">Bet spend: <b>{formatMoney(input.betSpentMonthly)}</b></div>
          <div className="stat-pill">Bet budget: <b>{formatMoney(input.betBudgetMonthly)}</b></div>
          <div className="stat-pill">Workouts (7d): <b>{input.workoutsLast7Days}</b></div>
        </div>

        <section className="section-card" style={{ marginTop: 12 }}>
          <h3 className="section-title">Do This Now</h3>
          <div className="small muted">Highest priority actions from your latest money behavior.</div>
          <div className="coach-action-grid">
            {immediateActions.length ? (
              immediateActions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`coach-action-card ${priorityBadge(item.priority)}`}
                  onClick={() => item.action && navigate(item.action)}
                >
                  <div className="coach-action-top">
                    <span className="coach-action-priority">{item.priority}</span>
                    <span className="coach-action-type">{item.type}</span>
                  </div>
                  <div className="coach-action-title">{item.title}</div>
                  <div className="coach-action-msg">{item.message}</div>
                  <div className="coach-action-cta">
                    {item.action ? "Open action" : "No action"} <FaArrowRight />
                  </div>
                </button>
              ))
            ) : (
              <div className="list-card">No urgent action right now.</div>
            )}
          </div>
        </section>

        <section className="section-card" style={{ marginTop: 12 }}>
          <h3 className="section-title">All Coach Notes</h3>
          <div className="coach-note-stack">
            {["HIGH", "MEDIUM", "LOW"].map((level) => (
              <div key={level}>
                <div className={`coach-level-head ${priorityBadge(level)}`}>{level} PRIORITY</div>
                {grouped[level].length ? (
                  grouped[level].map((item) => (
                    <div key={item.id} className="list-card coach-note-item">
                      <div className="coach-note-title">{item.title}</div>
                      <div className="small muted">{item.type}</div>
                      <div className="coach-note-msg">{item.message}</div>
                      {item.action ? (
                        <button type="button" className="btn" onClick={() => navigate(item.action)}>
                          Open
                        </button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="small muted" style={{ marginBottom: 8 }}>No {level.toLowerCase()} items.</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
