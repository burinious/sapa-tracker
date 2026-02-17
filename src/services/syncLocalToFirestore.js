import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { getEntries, markEntrySynced } from "../utils/localEntries";
import { getLoans, markLoanSynced } from "../utils/localLoans";
import { getMonthlyBudgetLocal, markBudgetSynced } from "../utils/localBudgets";
import { read } from "../utils/localStore";
import { setSyncMeta } from "../utils/syncMeta";

function toMillis(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof v.toMillis === "function") return v.toMillis();
  return 0;
}

function tsFromISO(iso) {
  if (!iso) return serverTimestamp();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return serverTimestamp();
  return Timestamp.fromDate(d);
}

async function syncEntry(uid, entry) {
  if (!entry || entry.syncStatus === "synced") return false;
  const ref = doc(db, "users", uid, "entries", entry.id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const remote = snap.data() || {};
    const remoteUpdated = toMillis(remote.updatedAt || remote.updatedAtISO || remote.createdAt);
    const localUpdated = toMillis(entry.updatedAtISO || entry.createdAtISO);
    if (remoteUpdated > localUpdated) {
      markEntrySynced(uid, entry.id);
      return false;
    }
  }

  await setDoc(
    ref,
    {
      date: entry.date || new Date().toISOString().slice(0, 10),
      title: entry.title || "",
      text: entry.text || "",
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      createdAt: tsFromISO(entry.createdAtISO),
      updatedAt: serverTimestamp(),
      updatedAtISO: entry.updatedAtISO || new Date().toISOString(),
    },
    { merge: true }
  );

  markEntrySynced(uid, entry.id);
  return true;
}

async function syncLoan(uid, loan) {
  if (!loan || loan.syncStatus === "synced") return false;
  const ref = doc(db, "users", uid, "loans", loan.id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const remote = snap.data() || {};
    const remoteUpdated = toMillis(remote.updatedAt || remote.updatedAtISO || remote.createdAt);
    const localUpdated = toMillis(loan.updatedAtISO || loan.createdAtISO);
    if (remoteUpdated > localUpdated) {
      markLoanSynced(uid, loan.id);
      return false;
    }
  }

  await setDoc(
    ref,
    {
      lender: loan.lender || "Co-op",
      principal: Number(loan.principal || 0),
      balance: Number(loan.balance ?? loan.principal ?? 0),
      startDate: loan.startDate || new Date().toISOString().slice(0, 10),
      dueDay: Number(loan.dueDay || 28),
      termMonths: Number(loan.termMonths || 18),
      status: loan.status || "active",
      payments: Array.isArray(loan.payments) ? loan.payments : [],
      createdAt: tsFromISO(loan.createdAtISO),
      updatedAt: serverTimestamp(),
      updatedAtISO: loan.updatedAtISO || new Date().toISOString(),
    },
    { merge: true }
  );

  markLoanSynced(uid, loan.id);
  return true;
}

async function syncBudget(uid, month) {
  const local = getMonthlyBudgetLocal(uid, month);
  if (!local || local.syncStatus === "synced") return false;
  const ref = doc(db, "users", uid, "budgets", month);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const remote = snap.data() || {};
    const remoteUpdated = toMillis(remote.updatedAt || remote.updatedAtISO || remote.createdAt);
    const localUpdated = toMillis(local.updatedAtISO || local.createdAtISO);
    if (remoteUpdated > localUpdated) {
      markBudgetSynced(uid, month);
      return false;
    }
  }

  await setDoc(
    ref,
    {
      ...local,
      updatedAt: serverTimestamp(),
      updatedAtISO: local.updatedAtISO || new Date().toISOString(),
    },
    { merge: true }
  );

  markBudgetSynced(uid, month);
  return true;
}

export async function syncLocalToFirestore(uid) {
  if (!uid) return { synced: 0, skipped: 0 };
  const entries = getEntries(uid);
  const loans = getLoans(uid);
  const budgets = read(uid, "budgets", {});

  let synced = 0;
  let skipped = 0;

  try {
    for (const entry of entries) {
      const did = await syncEntry(uid, entry);
      if (did) synced += 1;
      else skipped += 1;
    }

    for (const loan of loans) {
      const did = await syncLoan(uid, loan);
      if (did) synced += 1;
      else skipped += 1;
    }

    for (const month of Object.keys(budgets || {})) {
      const did = await syncBudget(uid, month);
      if (did) synced += 1;
      else skipped += 1;
    }

    setSyncMeta(uid, { lastSyncAtISO: new Date().toISOString(), lastError: "", lastErrorAtISO: "" });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sapa-sync"));
    }
    return { synced, skipped };
  } catch (err) {
    setSyncMeta(uid, {
      lastError: err?.message || String(err),
      lastErrorAtISO: new Date().toISOString(),
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sapa-sync"));
    }
    throw err;
  }
}
