import React from "react";
import { fmtMoney } from "../../utils/money";

export default function SapaRiskMeter({
  score = 50,
  zone = "YELLOW ZONE",
  cashApprox = 0,
  dueTotal = 0,
  avgDailySpend7 = 0,
  currency = "NGN",
  windowDays = 7,
}) {
  const explain = `Bills in ${windowDays}d: ${fmtMoney(dueTotal, currency)} | Avg/day: ${fmtMoney(avgDailySpend7, currency)} | Cash~ ${fmtMoney(cashApprox, currency)}`;

  return (
    <div className="st-card st-risk">
      <div className="st-risk-top">
        <div>
          <div className="st-kicker">Sapa Risk</div>
          <div className={`st-zone st-zone-${zone.startsWith("S") ? "green" : zone.startsWith("R") ? "red" : "yellow"}`}>
            {zone}
          </div>
        </div>
        <div className="st-score">
          <div className="st-score-num">{score}</div>
          <div className="st-score-lbl">Sapa Score</div>
        </div>
      </div>

      <div className="st-bar">
        <div className="st-bar-fill" style={{ width: `${score}%` }} />
      </div>

      <div className="st-explain">{explain}</div>
    </div>
  );
}
