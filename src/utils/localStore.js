const key = (uid, name) => sapa__;
export function read(uid, name, fallback) {
  try { const raw = localStorage.getItem(key(uid, name)); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
export function write(uid, name, value) {
  try { localStorage.setItem(key(uid, name), JSON.stringify(value)); } catch {}
}
