import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { DEFAULT_PROFILE, DEFAULT_BILLS_NG, mergeDefaults } from "../utils/profileSchema";

export async function ensureUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const seed = {
      ...DEFAULT_PROFILE,
      fixedBills: DEFAULT_BILLS_NG,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, seed, { merge: true });
    return seed;
  }

  // Merge defaults into existing doc without overwriting user data
  const merged = mergeDefaults(snap.data() || {});
  // Only write back if key sections are missing (gentle upgrade)
  await setDoc(
    ref,
    {
      ...merged,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return merged;
}

export async function upsertUserProfile(uid, patch) {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
