import { db } from "./firebase";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

/**
 * Adds a transaction and atomically updates user's cashAtHand.
 * - income increases cashAtHand
 * - expense decreases cashAtHand
 */
export async function addTransactionAndUpdateCash(uid, payload) {
  const userRef = doc(db, "users", uid);
  const txRef = doc(collection(db, "users", uid, "transactions"));

  const amount = Number(payload.amount || 0);
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  const type = payload.type;
  if (type !== "income" && type !== "expense") {
    throw new Error("Type must be income or expense");
  }

  const delta = type === "income" ? amount : -amount;

  await runTransaction(db, async (t) => {
    const userSnap = await t.get(userRef);
    if (!userSnap.exists()) throw new Error("User profile not found");

    const currentCash = Number(userSnap.data()?.cashAtHand || 0);
    const nextCash = currentCash + delta;

    // optional safety: prevent going below 0 (comment out if you allow negative)
    // if (nextCash < 0) throw new Error("Insufficient cash at hand");

    t.update(userRef, {
      cashAtHand: nextCash,
      updatedAt: serverTimestamp(),
    });

    t.set(txRef, {
      type,
      amount,
      categoryId: payload.categoryId || "",
      categoryName: payload.categoryName || "",
      note: payload.note || "",
      date: payload.date instanceof Date ? Timestamp.fromDate(payload.date) : Timestamp.now(),
      createdAt: serverTimestamp(),
    });
  });
}
