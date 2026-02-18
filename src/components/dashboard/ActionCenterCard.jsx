import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { fmtMoney } from "../../utils/money";

function buildActions({ computed, riskWindowDays, currency = "NGN" }) {
  const actions = [];
  const score = Number(computed?.score || 0);
  const dueSoon = Array.isArray(computed?.dueSoon) ? computed.dueSoon : [];
  const topCat = computed?.topCats?.[0];
  const cashApprox = Number(computed?.cashApprox || 0);

  if (dueSoon.length > 0) {
    actions.push({
      title: `${dueSoon.length} bill(s) in ${riskWindowDays} days`,
      detail: `Due total ${fmtMoney(computed?.dueTotal || 0, currency)}. Review and pause non-essential subs.`,
      to: "/subscriptions",
      cta: "Open subscriptions",
      tone: "warn",
    });
  }

  if (score < 45 && topCat?.name) {
    actions.push({
      title: `Trim ${topCat.name} spending`,
      detail: `${topCat.count} tx recently. Biggest leak now.`,
      to: "/transactions",
      cta: "Review transactions",
      tone: "danger",
    });
  }

  if (cashApprox < 0) {
    actions.push({
      title: "Cash shortfall detected",
      detail: `Current MTD cash is ${fmtMoney(cashApprox, currency)}. Add income or reduce spend today.`,
      to: "/add-transaction?type=income",
      cta: "Add income",
      tone: "danger",
    });
  }

  actions.push({
    title: "Run coach check-in",
    detail: "Get personalized survival actions from your current state.",
    to: "/coach",
    cta: "Open coach",
    tone: "info",
  });

  return actions.slice(0, 3);
}

export default function ActionCenterCard({ computed, riskWindowDays = 7, currency = "NGN" }) {
  const actions = useMemo(
    () => buildActions({ computed, riskWindowDays, currency }),
    [computed, riskWindowDays, currency]
  );

  return (
    <div className="st-card">
      <div className="st-kicker">Action Center</div>
      <div className="st-sub">Do these now for immediate stability.</div>

      <div className="st-action-list">
        {actions.map((a) => (
          <div key={a.title} className={`st-action-card ${a.tone || "info"}`}>
            <div className="st-action-title">{a.title}</div>
            <div className="st-action-sub">{a.detail}</div>
            <Link className="st-mini st-link-btn" to={a.to}>{a.cta}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
