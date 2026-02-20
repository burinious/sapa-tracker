import { read, write } from "./localStore";

function getAll(uid) {
  return read(uid, "notifications", []);
}

function setAll(uid, list) {
  write(uid, "notifications", list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sapa-notifications"));
  }
  return list;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `notif_${Date.now()}`;
}

export function getNotifications(uid) {
  const all = getAll(uid);
  return Array.isArray(all) ? all : [];
}

export function addNotification(uid, data = {}) {
  if (!uid) return null;
  const next = {
    id: makeId(),
    title: String(data.title || "SapaTracker"),
    body: String(data.body || ""),
    route: String(data.route || "/dashboard"),
    source: String(data.source || "system"),
    read: !!data.read,
    createdAtISO: data.createdAtISO || new Date().toISOString(),
  };
  const current = getNotifications(uid);
  setAll(uid, [next, ...current].slice(0, 200));
  return next;
}

export function markNotificationRead(uid, id, read = true) {
  if (!uid || !id) return;
  const current = getNotifications(uid);
  const next = current.map((item) => (item.id === id ? { ...item, read: !!read } : item));
  setAll(uid, next);
}

export function markAllNotificationsRead(uid) {
  if (!uid) return;
  const current = getNotifications(uid);
  const next = current.map((item) => ({ ...item, read: true }));
  setAll(uid, next);
}
