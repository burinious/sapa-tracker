import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { DEFAULT_PROFILE } from "../utils/profileSchema";

const CHUNK_SIZE = 400;

async function clearCollection(uid, name) {
  const ref = collection(db, "users", uid, name);
  let deleted = 0;

  while (true) {
    const snap = await getDocs(query(ref, limit(CHUNK_SIZE)));
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach((row) => batch.delete(row.ref));
    await batch.commit();
    deleted += snap.size;

    if (snap.size < CHUNK_SIZE) break;
  }

  return deleted;
}

async function clearLoansWithPayments(uid) {
  const loansRef = collection(db, "users", uid, "loans");
  let deleted = 0;

  while (true) {
    const snap = await getDocs(query(loansRef, limit(CHUNK_SIZE)));
    if (snap.empty) break;

    for (const loanDoc of snap.docs) {
      const paymentsRef = collection(db, "users", uid, "loans", loanDoc.id, "payments");
      while (true) {
        const paymentSnap = await getDocs(query(paymentsRef, limit(CHUNK_SIZE)));
        if (paymentSnap.empty) break;

        const paymentBatch = writeBatch(db);
        paymentSnap.docs.forEach((row) => paymentBatch.delete(row.ref));
        await paymentBatch.commit();
        deleted += paymentSnap.size;

        if (paymentSnap.size < CHUNK_SIZE) break;
      }
    }

    const loanBatch = writeBatch(db);
    snap.docs.forEach((row) => loanBatch.delete(row.ref));
    await loanBatch.commit();
    deleted += snap.size;

    if (snap.size < CHUNK_SIZE) break;
  }

  return deleted;
}

function clearLocalUserData(uid) {
  if (!uid || typeof localStorage === "undefined") return 0;

  const prefixes = [
    `sapa_${uid}_`,
    `sapa-${uid}-`,
    `sapa:${uid}:`,
    `sapa_push_sent_${uid}_`,
  ];
  const exact = new Set(["sapa-dashboard-settings"]);

  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }

  let removed = 0;
  for (const key of keys) {
    const isPrefixed = prefixes.some((prefix) => key.startsWith(prefix));
    if (!isPrefixed && !exact.has(key)) continue;
    localStorage.removeItem(key);
    removed += 1;
  }

  return removed;
}

export async function clearAllAppDataKeepProfile(uid) {
  if (!uid) return { deletedCloudDocs: 0, clearedLocalKeys: 0 };

  let deletedCloudDocs = 0;
  const collections = [
    "transactions",
    "entries",
    "budgets",
    "shoppingItems",
    "notes",
    "subscriptions",
    "pushQueue",
  ];

  for (const name of collections) {
    deletedCloudDocs += await clearCollection(uid, name);
  }
  deletedCloudDocs += await clearLoansWithPayments(uid);

  const clearedLocalKeys = clearLocalUserData(uid);
  return { deletedCloudDocs, clearedLocalKeys };
}

function clearGlobalAppKeys() {
  if (typeof localStorage === "undefined") return 0;
  const keys = ["sapa-app-theme", "sapa-dashboard-settings"];
  let removed = 0;
  for (const key of keys) {
    if (localStorage.getItem(key) != null) {
      localStorage.removeItem(key);
      removed += 1;
    }
  }
  return removed;
}

export async function clearAllAppDataIncludingProfile(uid, profile = {}) {
  if (!uid) return { deletedCloudDocs: 0, clearedLocalKeys: 0, profileReset: false };

  const base = await clearAllAppDataKeepProfile(uid);
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      ...DEFAULT_PROFILE,
      fullName: "",
      username: "",
      email: profile?.email || "",
      fixedBills: [],
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: false }
  );

  const clearedGlobal = clearGlobalAppKeys();
  return {
    deletedCloudDocs: base.deletedCloudDocs,
    clearedLocalKeys: base.clearedLocalKeys + clearedGlobal,
    profileReset: true,
  };
}
