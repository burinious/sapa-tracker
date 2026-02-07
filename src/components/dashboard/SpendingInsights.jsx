import React from "react";
import { fmtMoney } from "../../utils/money";

export default function SpendingInsights({ topCats = [], currency = "NGN" }) {
  return (
    <div className="st-card">
      <div className="st-kicker">Spending Insights</div>
      <div className="st-sub">Top categories (last 7 days)</div>

      {topCats.length === 0 ? (
        <div className="st-empty">No expense data in last 7 days yet. Add transactions to unlock insights.</div>
      ) : (
        <div className="st-list">
          {topCats.map((c) => (
            <div className="st-list-row" key={c.name}>
              <div>
                <div className="st-list-name">{c.name}</div>
                <div className="st-list-sub">{c.count} tx</div>
              </div>
              <div className="st-list-amt">{fmtMoney(c.amount, currency)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
