import React from "react";
import { format } from "date-fns";
import { fmtMoney } from "../../utils/money";

function greetByHour(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHeader({
  username = "User",
  dueCount = 0,
  riskWindowDays = 7,
  cashApprox = 0,
  mtdIncome = 0,
  mtdExpense = 0,
  score = 0,
  currency = "NGN",
}) {
  const today = format(new Date(), "EEEE, MMM d, yyyy");
  const greet = greetByHour();
  const netFlow = Number(mtdIncome || 0) - Number(mtdExpense || 0);
  const netFlowLabel = netFlow >= 0 ? "Positive flow" : "Net outflow";
  const netFlowClass = netFlow >= 0 ? "pos" : "neg";

  return (
    <div className="st-card st-header st-header-bank">
      <div className="st-header-main st-header-topline">
        <div className="st-header-copy">
          <div className="st-kicker">Dashboard</div>
          <h2 className="st-title st-title-hero">{greet}, {username}</h2>
          <div className="st-sub">{today}</div>
        </div>
        <div className="st-header-score-pill">
          <span>Sapa score</span>
          <b>{score}/100</b>
        </div>
      </div>

      <div className="st-header-balance">
        <div className="st-balance-kicker">Cash outlook</div>
        <div className="st-balance-value">{fmtMoney(cashApprox, currency)}</div>
      </div>

      <div className="st-header-metrics">
        <div className="st-header-metric">
          <div className="st-header-metric-label">Due soon</div>
          <div className="st-header-metric-value">{dueCount} in {riskWindowDays}d</div>
        </div>
        <div className="st-header-metric">
          <div className="st-header-metric-label">{netFlowLabel}</div>
          <div className={`st-header-metric-value ${netFlowClass}`}>{fmtMoney(netFlow, currency)}</div>
        </div>
      </div>
    </div>
  );
}
