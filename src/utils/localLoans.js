import { read, write } from "./localStore";

function nowISO() {
  return new Date().toISOString();
}

function toISO(v) {
  if (!v) return "";
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return "";
}

function setLoans(uid, list) {
  write(uid, "loans", list);
  return list;
}

export function getLoans(uid) {
  return read(uid, "loans", []);
}

export function addLoanLocal(uid, loan) {
  const list = getLoans(uid);
  const item = {
    id: loan.id || crypto?.randomUUID?.() || String(Date.now()),
    lender: loan.lender || "Co-op",
    principal: Number(loan.principal || 0),
    balance: Number(loan.balance ?? loan.principal ?? 0),
    startDate: loan.startDate || new Date().toISOString().slice(0, 10),
    dueDay: Number(loan.dueDay || 28),
    termMonths: Number(loan.termMonths || 18),
    status: loan.status || "active",
    payments: [],
    createdAtISO: loan.createdAtISO || nowISO(),
    updatedAtISO: loan.updatedAtISO || nowISO(),
    syncStatus: loan.syncStatus || "pending",
  };
  const next = [item, ...list];
  setLoans(uid, next);
  return item;
}

export function updateLoanLocal(uid, loanId, patch) {
  const list = getLoans(uid);
  const next = list.map((l) =>
    l.id === loanId
      ? {
          ...l,
          ...patch,
          updatedAtISO: nowISO(),
          syncStatus: patch?.syncStatus || "pending",
        }
      : l
  );
  setLoans(uid, next);
  return next.find((l) => l.id === loanId) || null;
}

export function recordLoanPaymentLocal(uid, loanId, amount, dateStr) {
  const list = getLoans(uid);
  const next = list.map((l) => {
    if (l.id !== loanId) return l;
    const payment = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      amount: Number(amount || 0),
      date: dateStr || new Date().toISOString().slice(0, 10),
      createdAtISO: nowISO(),
    };
    const payments = [payment, ...(l.payments || [])];
    return { ...l, payments, updatedAtISO: nowISO(), syncStatus: "pending" };
  });
  setLoans(uid, next);
  return true;
}

export function getActiveLoansLocal(uid) {
  const list = getLoans(uid);
  return list.filter((l) => l.status === "active");
}

export function markLoanSynced(uid, loanId) {
  const list = getLoans(uid);
  const next = list.map((l) =>
    l.id === loanId ? { ...l, syncStatus: "synced" } : l
  );
  setLoans(uid, next);
}

export function upsertLoanSynced(uid, loan) {
  const list = getLoans(uid);
  const next = list.filter((l) => l.id !== loan.id);
  next.unshift({
    ...loan,
    createdAtISO: toISO(loan.createdAtISO || loan.createdAt),
    updatedAtISO: toISO(loan.updatedAtISO || loan.updatedAt) || nowISO(),
    syncStatus: "synced",
  });
  setLoans(uid, next);
  return loan;
}

export function mergeLoansFromRemote(uid, remoteLoans = []) {
  const local = getLoans(uid);
  const byId = new Map(local.map((l) => [l.id, l]));

  for (const r of remoteLoans) {
    const localItem = byId.get(r.id);
    const remoteUpdated = Date.parse(toISO(r.updatedAtISO || r.updatedAt || r.createdAt));
    const localUpdated = Date.parse(localItem?.updatedAtISO || localItem?.createdAtISO || "");

    if (localItem && localItem.syncStatus === "pending" && localUpdated > remoteUpdated) {
      continue;
    }

    byId.set(r.id, {
      ...r,
      createdAtISO: toISO(r.createdAtISO || r.createdAt),
      updatedAtISO: toISO(r.updatedAtISO || r.updatedAt) || nowISO(),
      syncStatus: "synced",
    });
  }

  setLoans(uid, Array.from(byId.values()));
}
