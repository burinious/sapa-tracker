import { collection, addDoc, doc, updateDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

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
  return addDoc(ref, payload);
}

export async function recordLoanPayment(uid, loanId, amount, dateStr) {
  const paymentsRef = collection(db, "users", uid, "loans", loanId, "payments");
  await addDoc(paymentsRef, {
    amount: Number(amount),
    date: dateStr || new Date().toISOString().slice(0,10),
    createdAt: serverTimestamp()
  });
  // You can also recompute balance via a cloud function later.
}

export async function getActiveLoans(uid) {
  const ref = collection(db, "users", uid, "loans");
  const q = query(ref, where("status","==","active"), orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateLoan(uid, loanId, patch) {
  const ref = doc(db, "users", uid, "loans", loanId);
  return updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}
