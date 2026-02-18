import React from "react";
import { Link } from "react-router-dom";
import { fmtMoney } from "../../utils/money";

export default function RecentTransactions({ recent = [], currency = "NGN" }) {
  return (
    <div className="st-card">
      <div className="st-row-between">
        <div>
          <div className="st-kicker">Recent Transactions</div>
          <div className="st-sub">Latest 5</div>
        </div>
        <Link className="st-mini st-link-btn" to="/transactions">View all</Link>
      </div>

      {recent.length === 0 ? (
        <div className="st-empty">No transactions yet. Start adding expenses. That is where the truth lives.</div>
      ) : (
        <div className="st-list">
          {recent.map((t) => (
            <div className="st-list-row" key={t.id}>
              <div>
                <div className="st-list-name">{t.title || t.categoryName || "Transaction"}</div>
                <div className="st-list-sub">{t.categoryName || "Other"} | {t.date || ""}</div>
              </div>
              <div className={`st-list-amt ${t.type === "expense" ? "neg" : "pos"}`}>
                {t.type === "expense" ? "-" : "+"}{fmtMoney(t.amount, currency)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
