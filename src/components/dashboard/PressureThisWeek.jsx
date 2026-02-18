import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fmtMoney } from "../../utils/money";
import { daysUntil, humanDueLabel } from "../../utils/dates";

function DueCard({ item, currency }) {
  const nav = useNavigate();
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
        <button className="st-mini" type="button" onClick={() => nav("/subscriptions")}>Open Subs</button>
        <button className="st-mini" type="button" onClick={() => nav("/budgets")}>Adjust Budget</button>
      </div>
    </div>
  );
}

function groupDue(dueSoon = []) {
  const out = { overdue: [], today: [], soon: [] };
  for (const item of dueSoon) {
    const d = daysUntil(item.nextDueDate);
    if (d < 0) out.overdue.push(item);
    else if (d === 0) out.today.push(item);
    else out.soon.push(item);
  }
  return out;
}

export default function PressureThisWeek({ dueSoon = [], dueTotal = 0, currency = "NGN", riskWindowDays = 7 }) {
  const groups = useMemo(() => groupDue(dueSoon), [dueSoon]);

  return (
    <div className="st-card">
      <div className="st-row-between">
        <div>
          <div className="st-kicker">Pressure Window</div>
          <div className="st-sub">Total due in {riskWindowDays} days: <b>{fmtMoney(dueTotal, currency)}</b></div>
        </div>
      </div>

      <div className="st-chip-row" style={{ marginTop: 8 }}>
        <span className="st-chip">Overdue: <b>{groups.overdue.length}</b></span>
        <span className="st-chip">Today: <b>{groups.today.length}</b></span>
        <span className="st-chip">Soon: <b>{groups.soon.length}</b></span>
      </div>

      {dueSoon.length === 0 ? (
        <div className="st-empty">No upcoming bills in the next {riskWindowDays} days. Enjoy small peace.</div>
      ) : (
        <>
          {groups.overdue.length ? (
            <div className="st-sub" style={{ marginTop: 10 }}><b>Overdue</b></div>
          ) : null}
          {groups.overdue.length ? (
            <div className="st-due-row">
              {groups.overdue.slice(0, 6).map((s) => (
                <DueCard key={s.id} item={s} currency={currency} />
              ))}
            </div>
          ) : null}

          {groups.today.length ? (
            <div className="st-sub" style={{ marginTop: 10 }}><b>Due today</b></div>
          ) : null}
          {groups.today.length ? (
            <div className="st-due-row">
              {groups.today.slice(0, 6).map((s) => (
                <DueCard key={s.id} item={s} currency={currency} />
              ))}
            </div>
          ) : null}

          {groups.soon.length ? (
            <div className="st-sub" style={{ marginTop: 10 }}><b>Due soon</b></div>
          ) : null}
          {groups.soon.length ? (
            <div className="st-due-row">
              {groups.soon.slice(0, 10).map((s) => (
                <DueCard key={s.id} item={s} currency={currency} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
