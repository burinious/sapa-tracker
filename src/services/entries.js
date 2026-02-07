import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function addEntry(uid, data) {
  const ref = collection(db, "users", uid, "entries");
  const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  return addDoc(ref, payload);
}

export async function updateEntry(uid, entryId, data) {
  const ref = doc(db, "users", uid, "entries", entryId);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteEntry(uid, entryId) {
  const ref = doc(db, "users", uid, "entries", entryId);
  return deleteDoc(ref);
}

export async function getRecentEntries(uid, n = 5) {
  const ref = collection(db, "users", uid, "entries");
  const q = query(ref, orderBy("createdAt", "desc"), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
