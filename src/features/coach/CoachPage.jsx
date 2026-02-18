import React, { useMemo } from "react";
import { FaUserTie } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import useDashboardData from "../../hooks/useDashboardData";
import { getFinance } from "../../utils/localFinance";
import { getShopping } from "../../utils/localShopping";
import { computeCoachNotes } from "./coachEngine";

function safeNum(x, fallback = 0) {
  if (x === null || x === undefined || x === "") return fallback;
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function lastShoppingDate(items = []) {
  let latest = null;
  for (const it of items) {
    const iso = it?.createdAtISO;
    if (!iso) continue;
    const d = new Date(iso);
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

export default function CoachPage({ coachInput }) {
  const { user, profile } = useAuth();
  const uid = user?.uid || "";
  const finance = uid ? getFinance(uid) : { cashAtHand: 0, transactions: [] };
  const { computed } = useDashboardData(uid);
  const shopping = uid ? getShopping(uid) : [];

  const derivedInput = useMemo(() => {
    const profileCash = profile?.cashAtHand;
    const manualCash =
      profileCash === 0 || profileCash === null || profileCash === undefined
        ? (profileCash === 0 ? 0 : safeNum(finance?.cashAtHand, null))
        : safeNum(profileCash, null);

    const computedCash = safeNum(computed?.cashApprox ?? finance?.cashAtHand ?? 0);

    const paydayDay = safeNum(profile?.primaryIncome?.payday ?? 28, 28);
    const dailyFloor = safeNum(profile?.spendingPrefs?.dailySpendCap ?? 12000, 12000);

    return {
      paydayDay,
      dailyFloor,
      manualCash,
      computedCash,
      totalLoanOwed: 0,
      betBudgetMonthly: 0,
      betSpentMonthly: 0,
      workoutsLast7Days: 0,
      entryLastAt: null,
      breakfastLoggedToday: false,
      lastShoppingAt: lastShoppingDate(shopping),
      lastHomeAuditAt: null
    };
  }, [profile, finance, computed, shopping]);

  const input = coachInput || derivedInput;
  const out = useMemo(() => computeCoachNotes(input), [input]);

  return (
    <div className="page-shell">
      <div className="page-card" style={{ maxWidth: 860 }}>
        <div className="page-title-row">
          <span className="page-title-icon"><FaUserTie /></span>
          <h2 className="page-title">Coach</h2>
        </div>
        <p className="page-sub">
          Sapa Risk: <b>{out.sapaColor} ({out.sapaRisk}/100)</b> | Runway: <b>{out.runwayDays.toFixed(1)} days</b> | Days to 28th: <b>{out.daysToPayday}</b>
        </p>

        <div className="list-stack">
          {out.notes.map((n, idx) => (
            <div key={idx} className="list-card">
              <div className="small muted">{n.type} | {n.priority}</div>
              <div className="list-title">{n.title}</div>
              <div style={{ marginTop: 6 }}>{n.message}</div>
              {n.action ? <div style={{ marginTop: 8 }}><a href={n.action}>Open action</a></div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
