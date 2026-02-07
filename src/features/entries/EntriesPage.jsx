import React, { useEffect, useState } from "react";
import { getRecentEntries } from "../../services/entries";

export default function EntriesPage({ uid }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!uid) return;
    getRecentEntries(uid, 25).then(setItems).catch(console.error);
  }, [uid]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Entries</h2>
      <p>Recent entries (newest first)</p>
      <a href="/entries/new">+ New Entry</a>
      <div style={{ marginTop: 12 }}>
        {items.map(e => (
          <div key={e.id} style={{ border: "1px solid #2a3550", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>{e.date || ""}</div>
            <div style={{ fontWeight: 700 }}>{e.title || "Untitled"}</div>
            <div style={{ opacity: 0.9, marginTop: 6 }}>{(e.text || "").slice(0, 120)}{(e.text || "").length > 120 ? "..." : ""}</div>
            <div style={{ marginTop: 8 }}>
              <a href={`/entries/${e.id}/edit`}>Edit</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
