import { useAuth } from "../context/AuthContext";
export default function BillingNotice() {
  const { profile } = useAuth();
  if (profile?.cloudEnabled) return null;
  return (
    <div style={{
      padding:"10px 12px", background:"rgba(255,165,0,0.15)",
      border:"1px solid rgba(255,165,0,0.40)", color:"#ffd28a",
      borderRadius:12, marginBottom:12, fontSize:13
    }}>
       Cloud sync disabled (Firestore needs billing). Youre in local-only mode for now.
    </div>
  );
}
