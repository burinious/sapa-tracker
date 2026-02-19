import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

function keyOf(uid, dedupeKey) {
  return `sapa_push_sent_${uid}_${dedupeKey}`;
}

function getSlot(uid, dedupeKey) {
  try {
    return localStorage.getItem(keyOf(uid, dedupeKey)) || "";
  } catch {
    return "";
  }
}

function setSlot(uid, dedupeKey, value) {
  try {
    localStorage.setItem(keyOf(uid, dedupeKey), value);
  } catch {
    // Ignore storage failures.
  }
}

export async function queuePushNotification(uid, payload, periodKey) {
  if (!uid || !payload?.dedupeKey) return false;
  if (!periodKey) return false;

  const previous = getSlot(uid, payload.dedupeKey);
  if (previous === periodKey) return false;

  await addDoc(collection(db, "users", uid, "pushQueue"), {
    area: payload.area || "general",
    title: payload.title || "SapaTracker",
    body: payload.body || "",
    route: payload.route || "/dashboard",
    dedupeKey: payload.dedupeKey,
    periodKey,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  setSlot(uid, payload.dedupeKey, periodKey);
  return true;
}
