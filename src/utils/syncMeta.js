import { read, write } from "./localStore";

export function getSyncMeta(uid) {
  return read(uid, "sync_meta", { lastSyncAtISO: "", lastError: "", lastErrorAtISO: "" });
}

export function setSyncMeta(uid, patch) {
  const current = getSyncMeta(uid);
  const next = { ...current, ...patch };
  write(uid, "sync_meta", next);
  return next;
}
