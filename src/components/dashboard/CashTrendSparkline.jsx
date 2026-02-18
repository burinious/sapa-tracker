import React, { useMemo } from "react";
import { addDays, format, subDays } from "date-fns";
import { fmtMoney } from "../../utils/money";

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function buildSeries(transactions = [], days = 14) {
  const start = subDays(new Date(), days - 1);
  const byDate = new Map();
  for (let i = 0; i < days; i++) {
    byDate.set(format(addDays(start, i), "yyyy-MM-dd"), 0);
  }

  for (const tx of transactions) {
    const d = typeof tx?.date === "string" ? tx.date : "";
    if (!byDate.has(d)) continue;
    const amt = safeNum(tx.amount);
    const signed = tx.type === "income" ? amt : -amt;
    byDate.set(d, safeNum(byDate.get(d)) + signed);
  }

  const labels = Array.from(byDate.keys());
  const values = labels.map((k) => safeNum(byDate.get(k)));
  return { labels, values };
}

function toPath(values, w, h, p = 8) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const step = (w - (p * 2)) / Math.max(values.length - 1, 1);

  return values
    .map((v, i) => {
      const x = p + (i * step);
      const y = h - p - (((v - min) / range) * (h - (p * 2)));
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function CashTrendSparkline({ transactions = [], currency = "NGN", days = 14 }) {
  const { labels, values } = useMemo(() => buildSeries(transactions, days), [transactions, days]);
  const path = useMemo(() => toPath(values, 320, 88, 10), [values]);
  const net = values.reduce((s, x) => s + safeNum(x), 0);
  const upDays = values.filter((v) => v > 0).length;

  return (
    <div className="st-card">
      <div className="st-row-between">
        <div>
          <div className="st-kicker">Cash Trend</div>
          <div className="st-sub">Net flow over last {days} days</div>
        </div>
        <div className={`st-trend-pill ${net >= 0 ? "pos" : "neg"}`}>
          {net >= 0 ? "+" : ""}{fmtMoney(net, currency)}
        </div>
      </div>

      <div className="st-spark-wrap">
        <svg viewBox="0 0 320 88" className="st-spark" role="img" aria-label="Cash trend sparkline">
          <path d={path} className="st-spark-line" />
        </svg>
      </div>

      <div className="st-sub">Up days: <b>{upDays}</b> | Window start: <b>{labels[0] || "-"}</b></div>
    </div>
  );
}
