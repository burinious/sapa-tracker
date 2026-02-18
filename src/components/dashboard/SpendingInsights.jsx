import React, { useMemo } from "react";
import { fmtMoney } from "../../utils/money";

export default function SpendingInsights({ topCats = [], currency = "NGN" }) {
  const maxValue = useMemo(() => {
    if (!topCats.length) return 1;
    return Math.max(...topCats.map((x) => Number(x.amount || 0)), 1);
  }, [topCats]);

  return (
    <div className="st-card">
      <div className="st-kicker">Spending Insights</div>
      <div className="st-sub">Top categories in the selected window</div>

      {topCats.length === 0 ? (
        <div className="st-empty">No expense data yet. Add transactions to unlock insights.</div>
      ) : (
        <div className="st-list">
          {topCats.map((c) => {
            const pct = Math.max(6, Math.round((Number(c.amount || 0) / maxValue) * 100));
            return (
              <div className="st-list-row" key={c.name}>
                <div className="st-cat-main">
                  <div>
                    <div className="st-list-name">{c.name}</div>
                    <div className="st-list-sub">{c.count} tx</div>
                  </div>
                  <div className="st-list-amt">{fmtMoney(c.amount, currency)}</div>
                </div>
                <div className="st-cat-bar"><span style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
