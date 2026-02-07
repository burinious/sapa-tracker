import { read, write } from "./localStore";
export function getFinance(uid) { return read(uid, "finance", { cashAtHand: 0, transactions: [] }); }
export function setCash(uid, cashAtHand) {
  const state = getFinance(uid);
  const next = { ...state, cashAtHand: Number(cashAtHand || 0) };
  write(uid, "finance", next);
  return next;
}
export function addTransaction(uid, tx) {
  const state = getFinance(uid);
  const amount = Number(tx.amount || 0);
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");
  if (tx.type !== "income" && tx.type !== "expense") throw new Error("Type must be income or expense");
  const delta = tx.type === "income" ? amount : -amount;
  const nextCash = Number(state.cashAtHand || 0) + delta;

  const id = (globalThis.crypto?.randomUUID?.() || String(Date.now()));
  const nextTx = {
    id, type: tx.type, amount,
    categoryName: (tx.categoryName || "").trim(),
    note: (tx.note || "").trim(),
    dateISO: new Date().toISOString(),
    createdAtISO: new Date().toISOString(),
  };

  const next = { cashAtHand: nextCash, transactions: [nextTx, ...(state.transactions || [])] };
  write(uid, "finance", next);
  return next;
}
