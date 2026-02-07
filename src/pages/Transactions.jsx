import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import "../styles/app.css";

const money = (n) => `₦${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;

function toDateValue(tx) {
  // Supports: tx.date (YYYY-MM-DD), tx.createdAt (Firestore Timestamp), tx.timestamp, etc.
  const d = tx?.date;
  if (d && typeof d === "string") return new Date(d).getTime();

  const ts = tx?.createdAt || tx?.timestamp;
  if (ts?.toDate) return ts.toDate().getTime(); // Firestore Timestamp
  if (typeof ts === "number") return ts;

  return 0; // unknown date goes bottom
}

export default function Transactions() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Optional UI filters (default shows ALL)
  const [type, setType] = useState("all"); // all | income | expense
  const [category, setCategory] = useState("all");
  const [qText, setQText] = useState("");

  useEffect(() => {
    if (!uid) return;

    setLoading(true);

    // If your docs have createdAt, orderBy will work.
    // If not, we still sort locally below.
    const ref = collection(db, "users", uid, "transactions");
    const qy = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Local sort fallback (covers docs without createdAt or mixed fields)
        list.sort((a, b) => toDateValue(b) - toDateValue(a));
        setRows(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        // fallback: try without orderBy if index/field missing
        const unsub2 = onSnapshot(
          ref,
          (snap2) => {
            const list2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
            list2.sort((a, b) => toDateValue(b) - toDateValue(a));
            setRows(list2);
            setLoading(false);
          },
          (err2) => {
            console.error(err2);
            setRows([]);
            setLoading(false);
          }
        );
        return () => unsub2();
      }
    );

    return () => unsub();
  }, [uid]);

  const categories = useMemo(() => {
    const set = new Set();
    for (const r of rows) {
      const c = (r.categoryName || r.category || "").trim();
      if (c) set.add(c);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const t = type;
    const cat = category;
    const q = qText.trim().toLowerCase();

    return rows.filter((r) => {
      const rType = (r.type || "").toLowerCase();
      const rCat = ((r.categoryName || r.category || "") + "").trim();

      if (t !== "all" && rType !== t) return false;
      if (cat !== "all" && rCat !== cat) return false;

      if (q) {
        const note = (r.note || "").toLowerCase();
        const name = (rCat || "").toLowerCase();
        const amt = String(r.amount || "").toLowerCase();
        if (!note.includes(q) && !name.includes(q) && !amt.includes(q)) return false;
      }
      return true;
    });
  }, [rows, type, category, qText]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of filtered) {
      const amt = Number(r.amount || 0);
      if ((r.type || "").toLowerCase() === "income") income += amt;
      if ((r.type || "").toLowerCase() === "expense") expense += amt;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  if (!uid) {
    return (
      <div className="st-card" style={{ maxWidth: 980 }}>
        <h3>Transactions</h3>
        <p className="small">Log in to view transactions.</p>
      </div>
    );
  }

  return (
    <div className="st-card" style={{ maxWidth: 980 }}>
      <h3>Transactions</h3>
      <p className="small" style={{ opacity: 0.85 }}>
        Showing <b>{filtered.length}</b> of <b>{rows.length}</b> transactions.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <div>
          <label className="small">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div>
          <label className="small">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All" : c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label className="small">Search</label>
          <input
            className="input"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Search note, category, amount…"
          />
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="small">Income: <b>{money(totals.income)}</b></div>
        <div className="small">Expense: <b>{money(totals.expense)}</b></div>
        <div className="small">Net: <b>{money(totals.net)}</b></div>
      </div>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <p className="small">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="small">No transactions yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((t) => {
              const when =
                (t.date && typeof t.date === "string" && t.date) ||
                (t.createdAt?.toDate ? t.createdAt.toDate().toISOString().slice(0, 10) : "");
              const cat = (t.categoryName || t.category || "Uncategorized").trim();
              const isIncome = (t.type || "").toLowerCase() === "income";
              const amt = Number(t.amount || 0);

              return (
                <div
                  key={t.id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800 }}>
                      {isIncome ? "Income" : "Expense"} · {cat}
                    </div>
                    <div style={{ fontWeight: 900 }}>
                      {isIncome ? "+" : "-"}{money(amt)}
                    </div>
                  </div>

                  <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
                    {when ? `Date: ${when}` : "Date: —"} · Note: {t.note ? t.note : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
