import { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addTransaction, getFinance } from "../utils/localFinance";
import "../styles/app.css";

import { db } from "../firebase/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";

export default function AddTransaction() {
  const { user, profile, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const uid = user?.uid; // ✅ prevent blank-screen crashes

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

      // Local finance update (keeps cashAtHand working)
      const next = addTransaction(uid, {
        type,
        amount: amt,
        categoryName: (categoryName || "").trim(),
        note: (note || "").trim(),
      });

      // Firestore write (powers dashboard + SAPA A.I)
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
    <div style={{ maxWidth: 520 }}>
      <h2>Add Transaction</h2>

      {!uid ? (
        <p className="small" style={{ color: "#ffb3b3" }}>
          Loading session… If this stays, go back and login again.
        </p>
      ) : (
        <p className="small">
          Current cash at hand:{" "}
          <b>{Number(currentCash).toLocaleString("en-NG")}</b>
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <label className="small">Type</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <label className="small">Amount (₦)</label>
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
  );
}
