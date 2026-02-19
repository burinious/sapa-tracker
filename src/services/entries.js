import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  addEntryLocal,
  updateEntryLocal,
  deleteEntryLocal,
  getRecentEntriesLocal,
  upsertEntrySynced,
  mergeEntriesFromRemote
} from "../utils/localEntries";

async function tryFirestore(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function addEntry(uid, data) {
  const ref = collection(db, "users", uid, "entries");
  const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const ok = await tryFirestore(() => addDoc(ref, payload));
  if (ok) {
    upsertEntrySynced(uid, {
      id: ok.id,
      ...data,
      createdAtISO: new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
    });
    return ok;
  }
  return addEntryLocal(uid, data);
}

export async function updateEntry(uid, entryId, data) {
  const ref = doc(db, "users", uid, "entries", entryId);
  const ok = await tryFirestore(() => updateDoc(ref, { ...data, updatedAt: serverTimestamp() }));
  if (ok !== null) {
    upsertEntrySynced(uid, {
      id: entryId,
      ...data,
      updatedAtISO: new Date().toISOString(),
    });
    return ok;
  }
  return updateEntryLocal(uid, entryId, data);
}

export async function deleteEntry(uid, entryId) {
  const ref = doc(db, "users", uid, "entries", entryId);
  const ok = await tryFirestore(() => deleteDoc(ref));
  if (ok !== null) {
    deleteEntryLocal(uid, entryId);
    return ok;
  }
  return deleteEntryLocal(uid, entryId);
}

export async function getRecentEntries(uid, n = 5) {
  const ref = collection(db, "users", uid, "entries");
  const q = query(ref, orderBy("createdAt", "desc"), limit(n));
  const snap = await tryFirestore(() => getDocs(q));
  if (snap) {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    mergeEntriesFromRemote(uid, docs);
    return docs;
  }
  return getRecentEntriesLocal(uid, n);
}
