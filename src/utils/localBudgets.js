import { read, write } from "./localStore";

function getAll(uid) {
  return read(uid, "budgets", {});
}

function toISO(v) {
  if (!v) return "";
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return "";
}

function setAll(uid, all) {
  write(uid, "budgets", all);
  return all;
}

export function upsertMonthlyBudgetLocal(uid, month, data) {
  const all = getAll(uid);
  const prev = all[month] || {};
  const next = {
    ...all,
    [month]: {
      ...prev,
      ...data,
      createdAtISO: prev.createdAtISO || new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
      syncStatus: "pending",
    }
  };
  setAll(uid, next);
  return next[month];
}

export function getMonthlyBudgetLocal(uid, month) {
  const all = getAll(uid);
  return all[month] || null;
}

export function markBudgetSynced(uid, month) {
  const all = getAll(uid);
  if (!all[month]) return;
  const next = { ...all, [month]: { ...all[month], syncStatus: "synced" } };
  setAll(uid, next);
}

export function upsertMonthlyBudgetSynced(uid, month, data) {
  const all = getAll(uid);
  const next = {
    ...all,
    [month]: {
      ...(all[month] || {}),
      ...data,
      createdAtISO: toISO(data.createdAtISO || data.createdAt) || (all[month]?.createdAtISO || new Date().toISOString()),
      updatedAtISO: toISO(data.updatedAtISO || data.updatedAt) || new Date().toISOString(),
      syncStatus: "synced",
    }
  };
  setAll(uid, next);
  return next[month];
}

export function mergeBudgetFromRemote(uid, month, remote) {
  const all = getAll(uid);
  const local = all[month];
  if (local && local.syncStatus === "pending") {
    const localUpdated = Date.parse(local.updatedAtISO || local.createdAtISO || "");
    const remoteUpdated = Date.parse(toISO(remote.updatedAtISO || remote.updatedAt || remote.createdAt));
    if (localUpdated > remoteUpdated) return;
  }
  upsertMonthlyBudgetSynced(uid, month, remote);
}
