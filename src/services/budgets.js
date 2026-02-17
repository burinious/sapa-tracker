import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  upsertMonthlyBudgetLocal,
  getMonthlyBudgetLocal,
  upsertMonthlyBudgetSynced,
  mergeBudgetFromRemote
} from "../utils/localBudgets";

async function tryFirestore(fn) {
  try {
    return await fn();
  } catch (err) {
    return null;
  }
}

export function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}

export async function upsertMonthlyBudget(uid, month, data) {
  const ref = doc(db, "users", uid, "budgets", month);
  const ok = await tryFirestore(() => setDoc(ref, data, { merge: true }));
  if (ok !== null) {
    upsertMonthlyBudgetSynced(uid, month, { ...data, updatedAtISO: new Date().toISOString() });
    return ok;
  }
  return upsertMonthlyBudgetLocal(uid, month, data);
}

export async function getMonthlyBudget(uid, month) {
  const ref = doc(db, "users", uid, "budgets", month);
  const snap = await tryFirestore(() => getDoc(ref));
  if (snap) {
    const data = snap.exists() ? snap.data() : null;
    if (data) mergeBudgetFromRemote(uid, month, data);
    return data;
  }
  return getMonthlyBudgetLocal(uid, month);
}
