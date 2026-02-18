import { useAuth } from "../context/AuthContext";
export default function BillingNotice() {
  const { profile } = useAuth();
  if (profile?.cloudEnabled) return null;
  return <div className="note-warn">Cloud sync disabled (Firestore needs billing). Youre in local-only mode for now.</div>;
}
