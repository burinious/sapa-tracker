import React from "react";
import { fmtMoney } from "../../utils/money";
import { daysUntil, humanDueLabel } from "../../utils/dates";

function DueCard({ item, currency }) {
  const d = daysUntil(item.nextDueDate);
  const label = humanDueLabel(d);

  return (
    <div className="st-due-card">
      <div className="st-due-top">
        <div className="st-due-name">{item.name || "Subscription"}</div>
        <div className={`st-badge ${d < 0 ? "st-badge-red" : d <= 2 ? "st-badge-yellow" : "st-badge-green"}`}>
          {label}
        </div>
      </div>
      <div className="st-due-amt">{fmtMoney(item.amount, currency)}</div>
      <div className="st-due-date">Next: {item.nextDueDate || "-"}</div>
      <div className="st-due-actions">
        <button className="st-mini" type="button" disabled title="Hook to mark-paid flow next">Mark Paid</button>
        <button className="st-mini" type="button" disabled title="Hook to snooze reminders next">Snooze</button>
        <button className="st-mini" type="button" disabled title="Hook to view details next">View</button>
      </div>
    </div>
  );
}

export default function PressureThisWeek({ dueSoon = [], dueTotal = 0, currency = "NGN" }) {
  return (
    <div className="st-card">
      <div className="st-row-between">
        <div>
          <div className="st-kicker">Pressure This Week</div>
          <div className="st-sub">Total due in 7 days: <b>{fmtMoney(dueTotal, currency)}</b></div>
        </div>
      </div>

      {dueSoon.length === 0 ? (
        <div className="st-empty">No upcoming bills in the next 7 days. Enjoy small peace Ìπè</div>
      ) : (
        <div className="st-due-row">
          {dueSoon.slice(0, 10).map((s) => (
            <DueCard key={s.id} item={s} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
