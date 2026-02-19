import { collection, addDoc, doc, updateDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  addLoanLocal,
  updateLoanLocal,
  recordLoanPaymentLocal,
  getActiveLoansLocal,
  upsertLoanSynced,
  mergeLoansFromRemote
} from "../utils/localLoans";

async function tryFirestore(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function addLoan(uid, loan) {
  const ref = collection(db, "users", uid, "loans");
  const payload = {
    lender: loan.lender || "Co-op",
    principal: Number(loan.principal || 0),
    balance: Number(loan.balance ?? loan.principal ?? 0),
    startDate: loan.startDate || new Date().toISOString().slice(0,10),
    dueDay: Number(loan.dueDay || 28),
    termMonths: Number(loan.termMonths || 18),
    status: loan.status || "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ok = await tryFirestore(() => addDoc(ref, payload));
  if (ok) {
    upsertLoanSynced(uid, {
      id: ok.id,
      ...payload,
      createdAtISO: new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
    });
    return ok;
  }
  return addLoanLocal(uid, loan);
}

export async function recordLoanPayment(uid, loanId, amount, dateStr) {
  const paymentsRef = collection(db, "users", uid, "loans", loanId, "payments");
  const ok = await tryFirestore(() => addDoc(paymentsRef, {
    amount: Number(amount),
    date: dateStr || new Date().toISOString().slice(0,10),
    createdAt: serverTimestamp()
  }));
  if (ok !== null) {
    updateLoanLocal(uid, loanId, {
      updatedAtISO: new Date().toISOString(),
      syncStatus: "synced",
    });
    return ok;
  }
  return recordLoanPaymentLocal(uid, loanId, amount, dateStr);
  // You can also recompute balance via a cloud function later.
}

export async function getActiveLoans(uid) {
  const ref = collection(db, "users", uid, "loans");
  const q = query(ref, where("status","==","active"), orderBy("createdAt","desc"));
  const snap = await tryFirestore(() => getDocs(q));
  if (snap) {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    mergeLoansFromRemote(uid, docs);
    return docs;
  }
  return getActiveLoansLocal(uid);
}

export async function updateLoan(uid, loanId, patch) {
  const ref = doc(db, "users", uid, "loans", loanId);
  const ok = await tryFirestore(() => updateDoc(ref, { ...patch, updatedAt: serverTimestamp() }));
  if (ok !== null) {
    updateLoanLocal(uid, loanId, { ...patch, updatedAtISO: new Date().toISOString(), syncStatus: "synced" });
    return ok;
  }
  return updateLoanLocal(uid, loanId, patch);
}
