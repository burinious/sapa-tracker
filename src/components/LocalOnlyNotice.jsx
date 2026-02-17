import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LocalOnlyNotice({ pendingCount = 0 }) {
  const { profile } = useAuth();
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const cloudDisabled = profile?.cloudEnabled === false;
  const localOnly = !online || cloudDisabled || pendingCount > 0;

  if (!localOnly) return null;

  const headline = !online
    ? "Offline mode"
    : pendingCount > 0
      ? `Pending sync (${pendingCount})`
      : "Local-only mode";

  const body = !online
    ? "You are offline. Changes will save locally and sync when you reconnect."
    : pendingCount > 0
      ? "Some items were saved locally. They will sync to the cloud once online."
      : "Cloud sync is unavailable right now. You are in local-only mode.";

  return (
    <div
      style={{
        padding: "10px 12px",
        background: "rgba(255,165,0,0.15)",
        border: "1px solid rgba(255,165,0,0.40)",
        color: "#ffd28a",
        borderRadius: 12,
        marginBottom: 12,
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{headline}</div>
      <div>{body}</div>
    </div>
  );
}
