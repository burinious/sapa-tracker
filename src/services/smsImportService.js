import { Capacitor } from "@capacitor/core";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db, isFirebaseReady } from "../firebase/firebase";
import { SmsImportPlugin } from "../plugins/smsImport";
import { format } from "date-fns";

const SOURCE_TAG = "sms_auto_import";
const EPHEMERAL_SEEN_MS = 45_000;

let activeUid = "";
let listenerHandle = null;
let errorListenerHandle = null;
let started = false;
const recentlySeen = new Map();

function isAndroid() {
  return Capacitor.getPlatform() === "android";
}

function nowMs() {
  return Date.now();
}

function pruneRecent() {
  const t = nowMs();
  for (const [k, expiresAt] of recentlySeen.entries()) {
    if (expiresAt <= t) recentlySeen.delete(k);
  }
}

function normalizeText(x) {
  return String(x || "").trim();
}

function fallbackFingerprint(payload) {
  const base = [
    normalizeText(payload.provider),
    normalizeText(payload.sender),
    Number(payload.amount || 0),
    normalizeText(payload.transactionType),
    normalizeText(payload.reference),
    Number(payload.dateMs || 0),
  ].join("|");
  return `fp_${base}`;
}

function txTypeForFirestore(rawType) {
  return String(rawType || "").toLowerCase() === "credit" ? "income" : "expense";
}

function normalizeParsedPayload(payload = {}) {
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const transactionType = String(payload.transactionType || "").toLowerCase();
  if (transactionType !== "credit" && transactionType !== "debit") return null;

  const dateMs = Number(payload.dateMs || nowMs());
  const safeDateMs = Number.isFinite(dateMs) && dateMs > 0 ? dateMs : nowMs();

  return {
    provider: normalizeText(payload.provider),
    sender: normalizeText(payload.sender),
    body: normalizeText(payload.body),
    amount,
    transactionType,
    dateMs: safeDateMs,
    reference: normalizeText(payload.reference) || "NO_REF",
    fingerprint: normalizeText(payload.fingerprint) || fallbackFingerprint(payload),
  };
}

async function saveImportedTransaction(uid, parsed) {
  if (!db) return false;

  const keyRef = doc(db, `users/${uid}/sms_import_keys/${parsed.fingerprint}`);
  const txRef = doc(collection(db, `users/${uid}/transactions`));

  await runTransaction(db, async (trx) => {
    const keySnap = await trx.get(keyRef);
    if (keySnap.exists()) {
      throw new Error("sms_duplicate");
    }

    trx.set(txRef, {
      type: txTypeForFirestore(parsed.transactionType),
      amount: parsed.amount,
      categoryId: "sms-import",
      categoryName: "SMS import",
      provider: parsed.provider,
      reference: parsed.reference,
      sender: parsed.sender,
      source: SOURCE_TAG,
      note: `${parsed.provider} ${parsed.reference}`.trim(),
      rawSms: parsed.body,
      date: format(new Date(parsed.dateMs), "yyyy-MM-dd"),
      dateAt: Timestamp.fromDate(new Date(parsed.dateMs)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    trx.set(keyRef, {
      fingerprint: parsed.fingerprint,
      transactionId: txRef.id,
      source: SOURCE_TAG,
      createdAt: serverTimestamp(),
    });
  });

  return true;
}

async function handleIncomingSms(payload) {
  const uid = auth?.currentUser?.uid || activeUid;
  if (!uid || uid !== activeUid) return;

  const parsed = normalizeParsedPayload(payload);
  if (!parsed) return;

  pruneRecent();
  if (recentlySeen.has(parsed.fingerprint)) return;
  recentlySeen.set(parsed.fingerprint, nowMs() + EPHEMERAL_SEEN_MS);

  try {
    await saveImportedTransaction(uid, parsed);
  } catch (err) {
    if (String(err?.message || "") !== "sms_duplicate") {
      console.error("SMS import save failed:", err);
    }
  }
}

export async function stopSmsImport() {
  if (!isAndroid()) return;

  try {
    if (listenerHandle) {
      await listenerHandle.remove();
      listenerHandle = null;
    }
  } catch (err) {
    console.warn("SMS listener cleanup failed:", err?.message || err);
  }

  try {
    if (errorListenerHandle) {
      await errorListenerHandle.remove();
      errorListenerHandle = null;
    }
  } catch (err) {
    console.warn("SMS error-listener cleanup failed:", err?.message || err);
  }

  try {
    if (started) {
      await SmsImportPlugin.stopListening();
    }
  } catch (err) {
    console.warn("SMS plugin stop failed:", err?.message || err);
  }

  started = false;
  activeUid = "";
  recentlySeen.clear();
}

export async function startSmsImport(uid) {
  const cleanUid = normalizeText(uid);
  if (!cleanUid) return { enabled: false, reason: "no_user" };
  if (!isAndroid()) return { enabled: false, reason: "not_android" };
  if (!isFirebaseReady || !db) return { enabled: false, reason: "firebase_not_ready" };

  if (started && activeUid === cleanUid) {
    return { enabled: true, reason: "already_started" };
  }

  await stopSmsImport();
  activeUid = cleanUid;

  try {
    const perm = await SmsImportPlugin.requestSmsPermissions();
    if (!perm?.granted) {
      return { enabled: false, reason: "permission_denied" };
    }

    listenerHandle = await SmsImportPlugin.addListener("smsTransaction", (event) => {
      void handleIncomingSms(event);
    });

    errorListenerHandle = await SmsImportPlugin.addListener("smsImportError", (event) => {
      console.error("Native SMS import error:", event?.message || "unknown");
    });

    const startedRes = await SmsImportPlugin.startListening();
    started = Boolean(startedRes?.started);
    return { enabled: started, reason: started ? "started" : "start_failed" };
  } catch (err) {
    console.error("Failed to start SMS import:", err);
    await stopSmsImport();
    return { enabled: false, reason: "exception" };
  }
}
