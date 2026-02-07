import { read, write } from "./localStore";
export function getShopping(uid) { return read(uid, "shopping", []); }
export function addShoppingItem(uid, item) {
  const list = getShopping(uid);
  const next = [{
    id: (globalThis.crypto?.randomUUID?.() || String(Date.now())),
    name: (item.name || "").trim(),
    qty: Number(item.qty || 1),
    price: Number(item.price || 0),
    category: (item.category || "General").trim(),
    createdAtISO: new Date().toISOString(),
  }, ...list];
  write(uid, "shopping", next);
  return next;
}
export function removeShoppingItem(uid, id) {
  const list = getShopping(uid);
  const next = list.filter(x => x.id !== id);
  write(uid, "shopping", next);
  return next;
}
