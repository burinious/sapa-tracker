import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBookOpen, FaPlus } from "react-icons/fa";
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
    <div className="page-shell">
      <div className="page-card entries-page-card">
        <div className="page-title-row">
          <span className="page-title-icon"><FaBookOpen /></span>
          <h2 className="page-title">Entries Journal</h2>
        </div>
        <p className="page-sub">Recent entries, newest first.</p>
        <LocalOnlyNotice pendingCount={pendingCount} />

        <div className="toolbar entries-topbar">
          <span className="stat-pill">Total notes: <b>{items.length}</b></span>
          <Link className="btn" to="/entries/new"><FaPlus /> New Entry</Link>
        </div>

        <div className="list-stack entries-list-stack">
          {items.length === 0 ? (
            <div className="list-card">
              <div className="list-title">No entries yet</div>
              <p className="small muted">Start with your first money gist to build your journal timeline.</p>
            </div>
          ) : items.map((e) => (
            <article key={e.id} className="list-card entry-item-card">
              <div className="entry-item-head">
                <div className="small muted">{e.date || "No date"}</div>
                <Link to={`/entries/${e.id}/edit`} className="entry-edit-link">Edit</Link>
              </div>

              <h4 className="entry-item-title">{e.title || "Untitled"}</h4>

              <div className="entry-item-preview">
                {(e.text || "").slice(0, 180)}{(e.text || "").length > 180 ? "..." : ""}
              </div>

              {Array.isArray(e.tags) && e.tags.length ? (
                <div className="entry-tag-row">
                  {e.tags.slice(0, 6).map((tag) => (
                    <span key={tag} className="entry-tag-chip">#{tag}</span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
