import { read, write } from "./localStore";
export function getSubscriptions(uid) { return read(uid, "subscriptions", []); }
export function addSubscription(uid, sub) {
  const list = getSubscriptions(uid);
  const next = [{
    id: (globalThis.crypto?.randomUUID?.() || String(Date.now())),
    name: (sub.name || "").trim(),
    amount: Number(sub.amount || 0),
    dueDay: Number(sub.dueDay || 1),
    status: "active",
    lastActionISO: null,
    createdAtISO: new Date().toISOString(),
  }, ...list];
  write(uid, "subscriptions", next);
  return next;
}
export function updateSubscription(uid, id, patch) {
  const list = getSubscriptions(uid);
  const next = list.map(s => s.id === id ? { ...s, ...patch, lastActionISO: new Date().toISOString() } : s);
  write(uid, "subscriptions", next);
  return next;
}
