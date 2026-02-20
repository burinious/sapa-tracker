import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth, db, firebaseInitError, isFirebaseReady } from "../firebase/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { mergeDefaults } from "../utils/profileSchema";
import { syncLocalToFirestore } from "../services/syncLocalToFirestore";
import { ensureUserProfile } from "../services/profileService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const setupError = firebaseInitError || "";

  const requireFirebase = useCallback(() => {
    if (isFirebaseReady && auth && db) return;
    throw new Error(setupError || "Firebase is not configured.");
  }, [setupError]);

  // Realtime sync user + profile
  useEffect(() => {
    if (!auth || !db || !isFirebaseReady) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);

      // cleanup previous profile listener
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const ref = doc(db, "users", u.uid);

      // Seed/upgrade schema without overwriting existing user values.
      try {
        await ensureUserProfile(u.uid);
      } catch (seedErr) {
        console.error("Profile seed/upgrade failed:", seedErr);
      }

      unsubProfile = onSnapshot(
        ref,
        (snap) => {
          const data = snap.exists() ? snap.data() : {};
          setProfile(mergeDefaults(data));
          setLoading(false);
        },
        (err) => {
          console.error("Profile snapshot error:", err);
          setProfile(mergeDefaults({}));
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubProfile) unsubProfile();
      unsubAuth();
    };
  }, []);

  // Background sync: local -> Firestore when online
  useEffect(() => {
    if (!user?.uid) return;
    let running = false;

    const runSync = async () => {
      if (running) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      try {
        running = true;
        await syncLocalToFirestore(user.uid);
      } catch (err) {
        console.warn("Local sync failed:", err?.message || err);
      } finally {
        running = false;
      }
    };

    runSync();
    const onOnline = () => runSync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [user?.uid]);

  // Auth actions (keep simple)
  const register = useCallback(async (email, password, displayName) => {
    requireFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    if (cred?.user?.uid) {
      const ref = doc(db, "users", cred.user.uid);
      await setDoc(
        ref,
        {
          email: cred.user.email || email,
          fullName: displayName || "",
          username: displayName || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    return cred.user;
  }, [requireFirebase]);

  const login = useCallback(async (email, password) => {
    requireFirebase();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }, [requireFirebase]);

  const logout = useCallback(async () => {
    requireFirebase();
    await signOut(auth);
  }, [requireFirebase]);

  const resetPassword = useCallback(async (email) => {
    requireFirebase();
    await sendPasswordResetEmail(auth, email);
  }, [requireFirebase]);

  // Update profile patch (merge) + immediate UI reflection via snapshot
  const updateUserProfile = useCallback(async (patch) => {
    requireFirebase();
    if (!user?.uid) throw new Error("Not logged in");

    const prevProfile = profile;
    const nextProfile = mergeDefaults({
      ...(profile || {}),
      ...patch,
      primaryIncome: {
        ...(profile?.primaryIncome || {}),
        ...(patch?.primaryIncome || {}),
      },
      salary: {
        ...(profile?.salary || {}),
        ...(patch?.salary || {}),
      },
      rent: {
        ...(profile?.rent || {}),
        ...(patch?.rent || {}),
      },
      spendingPrefs: {
        ...(profile?.spendingPrefs || {}),
        ...(patch?.spendingPrefs || {}),
      },
      notificationPrefs: {
        ...(profile?.notificationPrefs || {}),
        ...(patch?.notificationPrefs || {}),
      },
    });

    setProfile(nextProfile);
    const ref = doc(db, "users", user.uid);
    try {
      await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      setProfile(prevProfile);
      throw err;
    }
  }, [user?.uid, profile, requireFirebase]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      setupError,
      register,
      login,
      resetPassword,
      logout,
      updateUserProfile,
    }),
    [user, profile, loading, setupError, register, login, resetPassword, logout, updateUserProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
