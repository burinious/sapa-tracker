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

function setEntries(uid, list) {
  write(uid, "entries", list);
  return list;
}

export function getEntries(uid) {
  return read(uid, "entries", []);
}

export function addEntryLocal(uid, data) {
  const list = getEntries(uid);
  const entry = {
    id: data.id || crypto?.randomUUID?.() || String(Date.now()),
    date: data.date || new Date().toISOString().slice(0, 10),
    title: (data.title || "").trim(),
    text: (data.text || "").trim(),
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAtISO: data.createdAtISO || nowISO(),
    updatedAtISO: data.updatedAtISO || nowISO(),
    syncStatus: data.syncStatus || "pending",
  };
  const next = [entry, ...list];
  setEntries(uid, next);
  return entry;
}

export function updateEntryLocal(uid, entryId, data) {
  const list = getEntries(uid);
  const next = list.map((e) =>
    e.id === entryId
      ? {
          ...e,
          date: data.date || e.date,
          title: ((data.title ?? e.title) ?? "").trim(),
          text: ((data.text ?? e.text) ?? "").trim(),
          tags: Array.isArray(data.tags) ? data.tags : (e.tags || []),
          updatedAtISO: nowISO(),
          syncStatus: data.syncStatus || "pending",
        }
      : e
  );
  setEntries(uid, next);
  return next.find((e) => e.id === entryId) || null;
}

export function deleteEntryLocal(uid, entryId) {
  const list = getEntries(uid);
  const next = list.filter((e) => e.id !== entryId);
  setEntries(uid, next);
  return true;
}

export function getRecentEntriesLocal(uid, n = 5) {
  const list = getEntries(uid);
  const sorted = [...list].sort((a, b) => {
    const ad = a.createdAtISO || a.date || "";
    const bd = b.createdAtISO || b.date || "";
    return bd.localeCompare(ad);
  });
  return sorted.slice(0, n);
}

export function markEntrySynced(uid, entryId) {
  const list = getEntries(uid);
  const next = list.map((e) =>
    e.id === entryId ? { ...e, syncStatus: "synced" } : e
  );
  setEntries(uid, next);
}

export function upsertEntrySynced(uid, entry) {
  const list = getEntries(uid);
  const next = list.filter((e) => e.id !== entry.id);
  next.unshift({
    ...entry,
    createdAtISO: toISO(entry.createdAtISO || entry.createdAt),
    updatedAtISO: toISO(entry.updatedAtISO || entry.updatedAt) || nowISO(),
    syncStatus: "synced",
  });
  setEntries(uid, next);
  return entry;
}

export function mergeEntriesFromRemote(uid, remoteEntries = []) {
  const local = getEntries(uid);
  const byId = new Map(local.map((e) => [e.id, e]));

  for (const r of remoteEntries) {
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

  setEntries(uid, Array.from(byId.values()));
}
