import { read, write } from "./localStore";

function toISO(v) {
  if (!v) return "";
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return "";
}

function mergeById(local = [], remote = []) {
  const byId = new Map(local.map((x) => [x.id, x]));
  for (const r of remote) {
    const l = byId.get(r.id);
    const rUpdated = Date.parse(toISO(r.updatedAt || r.updatedAtISO || r.createdAt));
    const lUpdated = Date.parse(toISO(l?.updatedAtISO || l?.createdAtISO || l?.createdAt));
    if (l && l.syncStatus === "pending" && lUpdated > rUpdated) continue;
    byId.set(r.id, {
      ...r,
      createdAtISO: toISO(r.createdAtISO || r.createdAt),
      updatedAtISO: toISO(r.updatedAtISO || r.updatedAt),
      syncStatus: "synced",
    });
  }
  return Array.from(byId.values());
}

export function getCachedTransactions(uid) {
  return read(uid, "transactions_cache", []);
}

export function setCachedTransactions(uid, list) {
  write(uid, "transactions_cache", list);
}

export function mergeTransactionsFromRemote(uid, list) {
  const local = getCachedTransactions(uid);
  const next = mergeById(local, list);
  setCachedTransactions(uid, next);
  return next;
}

export function getCachedSubscriptions(uid) {
  return read(uid, "subscriptions_cache", []);
}

export function setCachedSubscriptions(uid, list) {
  write(uid, "subscriptions_cache", list);
}

export function mergeSubscriptionsFromRemote(uid, list) {
  const local = getCachedSubscriptions(uid);
  const next = mergeById(local, list);
  setCachedSubscriptions(uid, next);
  return next;
}

export function getCachedNotes(uid) {
  return read(uid, "notes_cache", []);
}

export function setCachedNotes(uid, list) {
  write(uid, "notes_cache", list);
}

export function mergeNotesFromRemote(uid, list) {
  const local = getCachedNotes(uid);
  const next = mergeById(local, list);
  setCachedNotes(uid, next);
  return next;
}
