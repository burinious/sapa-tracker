import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRecentEntries } from "../../services/entries";
import { getEntries } from "../../utils/localEntries";
import LocalOnlyNotice from "../../components/LocalOnlyNotice";

export default function EntriesPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [items, setItems] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!uid) return;
    getRecentEntries(uid, 25).then(setItems).catch(console.error);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const local = getEntries(uid);
    setPendingCount(local.filter((e) => e.syncStatus !== "synced").length);
  }, [uid, items]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Entries</h2>
      <LocalOnlyNotice pendingCount={pendingCount} />
      <p>Recent entries (newest first)</p>
      <Link to="/entries/new">+ New Entry</Link>
      <div style={{ marginTop: 12 }}>
        {items.map(e => (
          <div key={e.id} style={{ border: "1px solid #2a3550", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>{e.date || ""}</div>
            <div style={{ fontWeight: 700 }}>{e.title || "Untitled"}</div>
            <div style={{ opacity: 0.9, marginTop: 6 }}>{(e.text || "").slice(0, 120)}{(e.text || "").length > 120 ? "..." : ""}</div>
            <div style={{ marginTop: 8 }}>
              <Link to={`/entries/${e.id}/edit`}>Edit</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
