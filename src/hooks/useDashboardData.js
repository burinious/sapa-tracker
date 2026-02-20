import { useEffect, useMemo, useState } from "react";
import { subDays, format } from "date-fns";
import { clamp } from "../utils/money";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import {
  getCachedTransactions,
  getCachedSubscriptions,
  getCachedNotes,
  mergeTransactionsFromRemote,
  mergeSubscriptionsFromRemote,
  mergeNotesFromRemote
} from "../utils/localDashboardCache";

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function sumBy(arr, fn) {
  return arr.reduce((acc, item) => acc + safeNum(fn(item)), 0);
}

function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

function isoOfDate(d) {
  return format(d, "yyyy-MM-dd");
}

export default function useDashboardData(uid, opts = {}) {
  const {
    currency = "NGN",
    riskWindowDays = 7,
    txWindowDays = 30,
    notesLimit = 8,
    cashAtHand = undefined,
  } = opts;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!uid) return;

    setLoading(true);
    setError("");
    const loadCacheIfEmpty = () => {
      const cachedTx = getCachedTransactions(uid);
      const cachedSubs = getCachedSubscriptions(uid);
      const cachedNotes = getCachedNotes(uid);
      if (cachedTx.length) setTransactions(cachedTx);
      if (cachedSubs.length) setSubscriptions(cachedSubs);
      if (cachedNotes.length) setNotes(cachedNotes);
    };
    loadCacheIfEmpty();

    // --- Transactions: realtime, by createdAt (reliable)
    const txRef = collection(db, `users/${uid}/transactions`);
    const txQ = query(txRef, orderBy("createdAt", "desc"), limit(200));

    const unsubTx = onSnapshot(
      txQ,
      (snap) => {
        const tx = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        mergeTransactionsFromRemote(uid, tx);
        setTransactions(tx);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || "Failed to load transactions");
        loadCacheIfEmpty();
        setLoading(false);
      }
    );

    // --- Subscriptions: realtime active
    const subRef = collection(db, `users/${uid}/subscriptions`);
    const subQ = query(subRef, where("status", "==", "active"));
    const unsubSubs = onSnapshot(
      subQ,
      (snap) => {
        const subs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        mergeSubscriptionsFromRemote(uid, subs);
        setSubscriptions(subs);
      },
      (e) => setError(e?.message || "Failed to load subscriptions")
    );

    // --- Notes: realtime recent
    const notesRef = collection(db, `users/${uid}/notes`);
    const notesQ = query(notesRef, orderBy("createdAt", "desc"), limit(notesLimit));
    const unsubNotes = onSnapshot(
      notesQ,
      (snap) => {
        const nts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        mergeNotesFromRemote(uid, nts);
        setNotes(nts);
      },
      (e) => setError(e?.message || "Failed to load notes")
    );

    return () => {
      unsubTx();
      unsubSubs();
      unsubNotes();
    };
  }, [uid, notesLimit]);

  const computed = useMemo(() => {
    // ----- MTD using `date` if it exists as string, otherwise fallback to createdAt ordering
    const now = new Date();
    const monthStartISO = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");

    const txHasDate = transactions.some((t) => typeof t.date === "string");
    const txMTD = txHasDate
      ? transactions.filter((t) => (t.date || "") >= monthStartISO)
      : transactions; // fallback: treat loaded set as "recent"

    const mtdIncome = sumBy(txMTD.filter((t) => t.type === "income"), (t) => t.amount);
    const mtdExpense = sumBy(txMTD.filter((t) => t.type === "expense"), (t) => t.amount);

    const lastRiskISO = isoOfDate(subDays(new Date(), riskWindowDays));
    const txRiskWindow = txHasDate
      ? transactions.filter((t) => (t.date || "") >= lastRiskISO)
      : transactions.slice(0, 50);

    const spendRiskWindow = sumBy(txRiskWindow.filter((t) => t.type === "expense"), (t) => t.amount);
    const avgDailySpend7 = spendRiskWindow / Math.max(riskWindowDays, 1);

    // subscriptions due soon uses nextDueDate string
    const dueCutISO = isoOfDate(subDays(new Date(), -riskWindowDays));
    const dueSoon = subscriptions
      .filter((s) => {
        const due = typeof s?.nextDueDate === "string" ? s.nextDueDate : "";
        return !!due && due <= dueCutISO;
      })
      .sort((a, b) => (a.nextDueDate || "").localeCompare(b.nextDueDate || ""));

    const dueTotal = sumBy(dueSoon, (s) => s.amount);

    // cash approximation:
    // prefer profile/app cash baseline when available, otherwise fallback to MTD net flow.
    const hasCashBaseline = cashAtHand != null && Number.isFinite(Number(cashAtHand));
    const cashApprox = hasCashBaseline ? safeNum(cashAtHand) : (mtdIncome - mtdExpense);

    // risk score
    const need = dueTotal + (avgDailySpend7 * riskWindowDays);
    let score = 50;
    if (need <= 0) score = 80;
    else score = clamp(Math.round((cashApprox / need) * 100), 0, 100);

    let zone = "YELLOW ZONE";
    if (score >= 75) zone = "STABLE";
    if (score < 45) zone = "RED ZONE";

    // Top categories (selected tx window)
    const lastTxWindowISO = isoOfDate(subDays(new Date(), txWindowDays));
    const txTopWindow = txHasDate
      ? transactions.filter((t) => (t.date || "") >= lastTxWindowISO)
      : transactions.slice(0, 120);
    const exp7 = txTopWindow.filter((t) => t.type === "expense");
    const byCat = groupBy(exp7, (t) => t.categoryName || "Other");
    const topCats = Array.from(byCat.entries())
      .map(([name, items]) => ({
        name,
        amount: sumBy(items, (x) => x.amount),
        count: items.length,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const recent = transactions.slice(0, 5);

    return {
      currency,
      mtdIncome,
      mtdExpense,
      cashApprox,
      score,
      zone,
      dueSoon,
      dueTotal,
      avgDailySpend7,
      topCats,
      recent,
    };
  }, [transactions, subscriptions, currency, riskWindowDays, txWindowDays, cashAtHand]);

  return {
    loading,
    error,
    transactions,
    subscriptions,
    notes,
    computed,
  };
}
