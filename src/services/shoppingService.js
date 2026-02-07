import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

export function listenShoppingItems(uid, cb, onErr) {
  const ref = collection(db, "users", uid, "shoppingItems");
  const qy = query(ref);
  return onSnapshot(
    qy,
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a,b) => {
        if (!!a.bought !== !!b.bought) return a.bought ? 1 : -1;
        return (a.name||"").localeCompare(b.name||"");
      });
      cb(items);
    },
    onErr
  );
}

export async function addShoppingItem(uid, item) {
  return addDoc(
    collection(db, "users", uid, "shoppingItems"),
    { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
  );
}

export async function updateShoppingItem(uid, id, patch) {
  return setDoc(
    doc(db, "users", uid, "shoppingItems", id),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteShoppingItem(uid, id) {
  return deleteDoc(doc(db, "users", uid, "shoppingItems", id));
}
