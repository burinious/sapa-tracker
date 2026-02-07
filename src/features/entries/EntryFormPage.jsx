import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addEntry, updateEntry } from "../../services/entries";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function EntryFormPage({ uid }) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const nav = useNavigate();

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
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
          date: d.date || new Date().toISOString().slice(0,10),
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
    tags: form.tags.split(",").map(s => s.trim()).filter(Boolean)
  }), [form]);

  async function onSave(e) {
    e.preventDefault();
    if (!uid) return;
    if (isEdit) await updateEntry(uid, id, payload);
    else await addEntry(uid, payload);
    nav("/entries");
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>{isEdit ? "Edit Entry" : "New Entry"}</h2>
      <form onSubmit={onSave} style={{ display: "grid", gap: 10, maxWidth: 640 }}>
        <label>
          Date
          <input value={form.date} onChange={e=>setForm(f=>({ ...f, date: e.target.value }))} type="date" />
        </label>
        <label>
          Title
          <input value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} placeholder="e.g. Saturday gist" />
        </label>
        <label>
          Tags (comma separated)
          <input value={form.tags} onChange={e=>setForm(f=>({ ...f, tags: e.target.value }))} placeholder="work, sapa, gym" />
        </label>
        <label>
          Entry
          <textarea value={form.text} onChange={e=>setForm(f=>({ ...f, text: e.target.value }))} rows={8} placeholder="drop the gist..." />
        </label>
        <button type="submit">{isEdit ? "Update" : "Save"}</button>
        <a href="/entries">Back</a>
      </form>
    </div>
  );
}
