import { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaPlusCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { addTransaction, getFinance } from "../utils/localFinance";
import "../styles/app.css";

import { db } from "../firebase/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";

export default function AddTransaction() {
  const { user, profile, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const uid = user?.uid;

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!uid) {
      toast.error("Session not ready. Please re-login.");
      return;
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    try {
      setBusy(true);

      const next = addTransaction(uid, {
        type,
        amount: amt,
        categoryName: (categoryName || "").trim(),
        note: (note || "").trim(),
      });

      await addDoc(collection(db, "users", uid, "transactions"), {
        type,
        amount: amt,
        categoryName: (categoryName || "Other").trim() || "Other",
        title: ((categoryName || "").trim() || "Transaction"),
        note: (note || "").trim(),
        paymentMethod: "cash",
        date: format(new Date(), "yyyy-MM-dd"),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateUserProfile?.({ cashAtHand: next.cashAtHand });

      toast.success("Saved. Dashboard updated.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const currentCash =
    profile?.cashAtHand ??
    (uid ? (getFinance(uid)?.cashAtHand ?? 0) : 0);

  return (
    <div className="page-shell">
      <div className="page-card" style={{ maxWidth: 560 }}>
        <div className="page-title-row">
          <span className="page-title-icon"><FaPlusCircle /></span>
          <h2 className="page-title">Add Transaction</h2>
        </div>

        {!uid ? (
          <p className="note-warn">Loading session... If this stays, go back and login again.</p>
        ) : (
          <p className="page-sub">
            Current cash at hand: <b>{Number(currentCash).toLocaleString("en-NG")}</b>
          </p>
        )}

        <form onSubmit={handleSubmit} className="page-stack-md" style={{ marginTop: 12 }}>
          <label className="small">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <label className="small">Amount (NGN)</label>
          <input
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 5000"
            inputMode="numeric"
          />

          <label className="small">Category (optional)</label>
          <input
            className="input"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Food, Transport, Data..."
          />

          <label className="small">Note (optional)</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was it for?"
          />

          <button className="btn" disabled={busy || !uid}>
            {busy ? "Saving..." : "Save Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}
