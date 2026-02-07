import { format, subDays } from "date-fns";

const isoToday = () => format(new Date(), "yyyy-MM-dd");
const isoOf = (d) => format(d, "yyyy-MM-dd");

const safeNum = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};

const sum = (arr, fn) => arr.reduce((a, x) => a + safeNum(fn(x)), 0);

const groupBy = (arr, keyFn) => {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
};

const pctChange = (cur, prev) => {
  const c = safeNum(cur);
  const p = safeNum(prev);
  if (p <= 0 && c <= 0) return 0;
  if (p <= 0 && c > 0) return 999;
  return Math.round(((c - p) / p) * 100);
};

const clip = (s, max = 140) => {
  const str = String(s || "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
};

function mkNote({ type, severity, title, body, action, meta, expiresInDays = 7 }) {
  const createdAtISO = isoToday();
  const expiresAtISO = isoOf(subDays(new Date(), -expiresInDays));
  return {
    id: `note_${Math.random().toString(36).slice(2, 10)}`,
    type,
    severity,
    title: clip(title, 60),
    body: clip(body, 180),
    action,
    meta,
    createdAtISO,
    expiresAtISO,
  };
}

export function generateSapaInsights({
  transactions = [],
  subscriptions = [],
  computed = null,
  profile = { currency: "NGN", riskWindowDays: 7 },
} = {}) {
  const currency = profile.currency || "NGN";
  const riskWindowDays = profile.riskWindowDays ?? 7;

  const notes = [];
  const today = new Date();
  const curFromISO = isoOf(subDays(today, 7));
  const prevFromISO = isoOf(subDays(today, 14));
  const prevToISO = isoOf(subDays(today, 7));

  const tx = transactions.filter((t) => t && t.date);
  const exp = tx.filter((t) => t.type === "expense");

  const expCur = exp.filter((t) => t.date >= curFromISO);
  const expPrev = exp.filter((t) => t.date >= prevFromISO && t.date < prevToISO);

  const spendCur = sum(expCur, (t) => t.amount);
  const spendPrev = sum(expPrev, (t) => t.amount);

  // RULE 1: overall weekly spike
  const overallDelta = pctChange(spendCur, spendPrev);
  if (overallDelta >= 35 && spendCur > 0) {
    notes.push(
      mkNote({
        type: "warning",
        severity: overallDelta >= 70 ? "danger" : "warn",
        title: "Spending spike detected",
        body:
          overallDelta >= 999
            ? "New heavy spending appeared this week. Check expenses before it turns to pressure."
            : `Spending is +${overallDelta}% vs last week. If this continues, month-end will bite.`,
        action: { label: "View 7 days", route: "/transactions?period=7d" },
        meta: { rule: "weekly_spike", overallDelta, spendCur, spendPrev, currency },
      })
    );
  }

  // RULE 2: category dominance + spikes
  const curByCat = groupBy(expCur, (t) => t.categoryName || "Other");
  const prevByCat = groupBy(expPrev, (t) => t.categoryName || "Other");

  const catStats = Array.from(curByCat.entries()).map(([cat, items]) => {
    const curAmt = sum(items, (x) => x.amount);
    const prevAmt = sum(prevByCat.get(cat) || [], (x) => x.amount);
    return { cat, curAmt, prevAmt, delta: pctChange(curAmt, prevAmt), count: items.length };
  });

  catStats.sort((a, b) => b.curAmt - a.curAmt);

  if (catStats.length) {
    const top = catStats[0];
    const share = spendCur > 0 ? Math.round((top.curAmt / spendCur) * 100) : 0;
    if (share >= 45 && top.curAmt > 0) {
      notes.push(
        mkNote({
          type: "insight",
          severity: share >= 60 ? "warn" : "info",
          title: `${top.cat} is dominating this week`,
          body: `${top.cat} took ~${share}% of your last 7 days expenses. That category is moving like rent.`,
          action: { label: `View ${top.cat}`, route: `/transactions?category=${encodeURIComponent(top.cat)}&period=7d` },
          meta: { rule: "category_dominance", cat: top.cat, share, amount: top.curAmt, currency },
        })
      );
    }
  }

  const spiky = catStats
    .filter((c) => c.curAmt >= 3000 || c.count >= 3)
    .sort((a, b) => b.delta - a.delta)[0];

  if (spiky && spiky.delta >= 50 && spiky.curAmt > 0) {
    notes.push(
      mkNote({
        type: "warning",
        severity: spiky.delta >= 120 ? "danger" : "warn",
        title: `${spiky.cat} is up this week`,
        body:
          spiky.delta >= 999
            ? `${spiky.cat} showed up strongly this week. New patterns can wreck budgets fast.`
            : `${spiky.cat} is +${spiky.delta}% vs last week. Reduce the frequency to cool pressure.`,
        action: { label: `Open ${spiky.cat}`, route: `/transactions?category=${encodeURIComponent(spiky.cat)}&period=7d` },
        meta: { rule: "category_spike", cat: spiky.cat, delta: spiky.delta, curAmt: spiky.curAmt, prevAmt: spiky.prevAmt, currency },
      })
    );
  }

  // RULE 3: death by small spending
  const smallThreshold = 2000;
  const smallTx = expCur.filter((t) => safeNum(t.amount) > 0 && safeNum(t.amount) <= smallThreshold);
  const smallCount = smallTx.length;
  const smallSum = sum(smallTx, (t) => t.amount);

  if (smallCount >= 8 && smallSum >= 5000) {
    notes.push(
      mkNote({
        type: "warning",
        severity: smallCount >= 15 ? "danger" : "warn",
        title: "Death by small spending",
        body: `You made ${smallCount} small purchases (≤ ₦${smallThreshold.toLocaleString()}) in 7 days. Total: ₦${Math.round(smallSum).toLocaleString()}. That’s how sapa starts.`,
        action: { label: "Review small spends", route: `/transactions?period=7d&max=${smallThreshold}` },
        meta: { rule: "small_spends", smallCount, smallSum, smallThreshold, currency },
      })
    );
  }

  // RULE 4: subscription pressure (use computed if available)
  const dueSoon = (computed?.dueSoon || []).slice();
  const dueTotal = safeNum(computed?.dueTotal || sum(dueSoon, (s) => s.amount));

  if (dueSoon.length >= 2 && dueTotal > 0) {
    notes.push(
      mkNote({
        type: "alert",
        severity: dueTotal >= 15000 ? "danger" : "warn",
        title: "Subscriptions are coming",
        body: `${dueSoon.length} bills are due in the next ${riskWindowDays} days. Total: ₦${Math.round(dueTotal).toLocaleString()}. Pause what you don’t use.`,
        action: { label: "See pressure", route: "/dashboard#pressure" },
        meta: { rule: "subscription_pressure", dueCount: dueSoon.length, dueTotal, currency, riskWindowDays },
      })
    );
  }

  // RULE 5: runway warning
  const cashApprox = safeNum(computed?.cashApprox ?? 0);
  const avgDaily = safeNum(computed?.avgDailySpend7 ?? (spendCur / 7));
  if (cashApprox > 0 && avgDaily > 0) {
    const runwayDays = Math.floor(cashApprox / avgDaily);
    if (runwayDays <= 10) {
      notes.push(
        mkNote({
          type: "alert",
          severity: runwayDays <= 5 ? "danger" : "warn",
          title: "Runway is short",
          body: `At your current pace, you have ~${runwayDays} days runway. Cool spending now to avoid pressure.`,
          action: { label: "Open insights", route: "/dashboard#insights" },
          meta: { rule: "runway", runwayDays, cashApprox, avgDaily, currency },
        })
      );
    }
  }

  // prioritize + cap
  const rank = { danger: 3, warn: 2, info: 1 };
  notes.sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0));

  const seen = new Set();
  const finalNotes = [];
  for (const n of notes) {
    if (seen.has(n.title)) continue;
    seen.add(n.title);
    finalNotes.push(n);
    if (finalNotes.length >= 5) break;
  }

  if (finalNotes.length === 0) {
    finalNotes.push(
      mkNote({
        type: "tip",
        severity: "info",
        title: "Daily check-in",
        body: "Open SAPA daily. One-minute review prevents one-week pressure.",
        action: { label: "Add expense", route: "/add-transaction?type=expense" },
        meta: { rule: "default_tip" },
      })
    );
  }

  return finalNotes;
}
