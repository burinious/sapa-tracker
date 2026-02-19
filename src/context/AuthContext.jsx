import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { DEFAULT_PROFILE, DEFAULT_BILLS_NG, mergeDefaults } from "../utils/profileSchema";
import { syncLocalToFirestore } from "../services/syncLocalToFirestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Realtime sync user + profile
  useEffect(() => {
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

      const ref = doc(db, "users", u.uid);

      // Seed/upgrade schema gently (merge-safe) then listen realtime
      await setDoc(
        ref,
        {
          ...DEFAULT_PROFILE,
          fixedBills: DEFAULT_BILLS_NG,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

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
  const register = async (email, password, displayName) => {
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
  };

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Update profile patch (merge) + immediate UI reflection via snapshot
  const updateUserProfile = async (patch) => {
    if (!user?.uid) throw new Error("Not logged in");
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      register,
      login,
      resetPassword,
      logout,
      updateUserProfile,
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
