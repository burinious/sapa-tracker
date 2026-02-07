import React, { useMemo, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./AppRoutes";

/**
 * IMPORTANT:
 * - Replace uid with your real authenticated user id from Firebase/AuthContext.
 * - computedCash should come from your transactions aggregator.
 * - manualCash is your override input (what you said: manual overrides computed).
 */
export default function App() {
  // TEMP placeholders (replace with real auth + computed values)
  const uid = "demo-user";

  const [manualCash, setManualCash] = useState(200000);
  const computedCash = 0;

  const coachInput = useMemo(() => ({
    paydayDay: 28,
    dailyFloor: 12000,
    manualCash,
    computedCash,
    totalLoanOwed: 500000,
    betBudgetMonthly: 50000,
    betSpentMonthly: 0,
    workoutsLast7Days: 0,
    entryLastAt: null,
    breakfastLoggedToday: false,
    lastShoppingAt: null,
    lastHomeAuditAt: null
  }), [manualCash]);

  return (
    <BrowserRouter>
      <div style={{ padding: 16, borderBottom: "1px solid #2a3550" }}>
        <b>SapaTracker</b>{" "}
        <span style={{ opacity: 0.7, marginLeft: 8 }}>
          Manual Cash Override:
        </span>{" "}
        <input
          style={{ marginLeft: 8 }}
          type="number"
          value={manualCash}
          onChange={(e) => setManualCash(Number(e.target.value))}
        />
        <span style={{ opacity: 0.7, marginLeft: 8 }}>
          (overrides computed)
        </span>
      </div>

      <AppRoutes uid={uid} coachInput={coachInput} />
    </BrowserRouter>
  );
}
