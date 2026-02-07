import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}

export async function upsertMonthlyBudget(uid, month, data) {
  const ref = doc(db, "users", uid, "budgets", month);
  return setDoc(ref, data, { merge: true });
}

export async function getMonthlyBudget(uid, month) {
  const ref = doc(db, "users", uid, "budgets", month);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
