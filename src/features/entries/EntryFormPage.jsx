import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPenNib, FaSave } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { addEntry, updateEntry } from "../../services/entries";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function EntryFormPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { id } = useParams();
  const isEdit = Boolean(id);
  const nav = useNavigate();

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: "",
    text: "",
    tags: ""
  });

  useEffect(() => {
    if (!uid || !isEdit) return;
    (async () => {
      const ref = doc(db, "users", uid, "entries", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          date: d.date || new Date().toISOString().slice(0, 10),
          title: d.title || "",
          text: d.text || "",
          tags: Array.isArray(d.tags) ? d.tags.join(", ") : (d.tags || "")
        });
      }
    })().catch(console.error);
  }, [uid, isEdit, id]);

  const payload = useMemo(() => ({
    date: form.date,
    title: form.title.trim(),
    text: form.text.trim(),
    tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean)
  }), [form]);
  const tagPreview = payload.tags.slice(0, 8);

  async function onSave(e) {
    e.preventDefault();
    if (!uid) return;
    if (isEdit) await updateEntry(uid, id, payload);
    else await addEntry(uid, payload);
    nav("/entries");
  }

  return (
    <div className="page-shell">
      <div className="page-card entry-form-card">
        <div className="page-title-row">
          <span className="page-title-icon"><FaPenNib /></span>
          <h2 className="page-title">{isEdit ? "Edit Entry" : "New Entry"}</h2>
        </div>
        <p className="page-sub">{isEdit ? "Update your note and tags." : "Capture the real money gist for today."}</p>

        <form onSubmit={onSave} className="page-stack-md entry-form-body" style={{ marginTop: 12 }}>
          <div className="split-2">
            <label className="small">
              Date
              <input value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} type="date" />
            </label>
            <label className="small">
              Title
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Saturday gist" />
            </label>
          </div>

          <label className="small">
            Tags (comma separated)
            <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="work, sapa, gym" />
          </label>

          {tagPreview.length ? (
            <div className="entry-tag-row">
              {tagPreview.map((tag) => (
                <span key={tag} className="entry-tag-chip">#{tag}</span>
              ))}
            </div>
          ) : null}

          <label className="small">
            Entry
            <textarea className="entry-textarea" value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={10} placeholder="Drop the gist..." />
          </label>

          <div className="entry-form-actions">
            <button className="btn" type="submit"><FaSave /> {isEdit ? "Update Entry" : "Save Entry"}</button>
            <Link to="/entries" className="entry-back-link"><FaArrowLeft /> Back</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
