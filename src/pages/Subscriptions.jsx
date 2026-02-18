import { useEffect, useMemo, useState } from "react";
import { FaRegCreditCard } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import "../styles/app.css";

const money = (n) => `NGN ${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;

export default function Subscriptions() {
  const { user, profile, updateUserProfile } = useAuth();
  const uid = user?.uid;

  const liveBills = useMemo(() => {
    const arr = Array.isArray(profile?.fixedBills) ? profile.fixedBills : [];
    return arr;
  }, [profile?.fixedBills]);

  const [draft, setDraft] = useState(liveBills);

  useEffect(() => {
    setDraft(liveBills);
  }, [liveBills]);

  if (!uid) {
    return (
      <div className="page-shell">
        <div className="page-card" style={{ maxWidth: 860 }}>
          <div className="page-title-row">
            <span className="page-title-icon"><FaRegCreditCard /></span>
            <h3 className="page-title">Subscriptions</h3>
          </div>
          <p className="small">Log in to view subscriptions.</p>
        </div>
      </div>
    );
  }

  const setBill = (idx, patch) => {
    setDraft((prev) => {
      const next = [...prev];
      next[idx] = { ...(next[idx] || {}), ...patch };
      return next;
    });
  };

  const addSub = () => {
    setDraft((prev) => [
      ...(prev || []),
      {
        name: "New Subscription",
        amount: 0,
        frequency: "monthly",
        dueDay: 1,
        category: "Entertainment",
        provider: "",
        status: "active",
        autopay: false,
      },
    ]);
  };

  const remove = (idx) => {
    setDraft((prev) => {
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  async function save() {
    try {
      const cleaned = (draft || []).map((b) => ({
        name: String(b?.name || "Bill").trim(),
        amount: Number(b?.amount || 0),
        frequency: b?.frequency || "monthly",
        dueDay: Math.max(1, Math.min(31, Number(b?.dueDay || 1))),
        category: String(b?.category || "Entertainment").trim(),
        provider: String(b?.provider || "").trim(),
        status: b?.status || "active",
        autopay: !!b?.autopay,
      }));

      await updateUserProfile({ fixedBills: cleaned });
      toast.success("Subscriptions updated.");
    } catch (e) {
      toast.error(e?.message || "Failed to save subscriptions");
    }
  }

  const activeTotal = draft
    .filter((b) => (b?.status || "active") === "active")
    .reduce((sum, b) => sum + Number(b?.amount || 0), 0);

  return (
    <div className="page-shell">
      <div className="page-card" style={{ maxWidth: 960 }}>
        <div className="page-title-row">
          <span className="page-title-icon"><FaRegCreditCard /></span>
          <h3 className="page-title">Subscriptions</h3>
        </div>
        <p className="page-sub">
          Profile-driven subscriptions. Active total: <b>{money(activeTotal)}</b>/month (approx)
        </p>

        <div className="toolbar">
          <button className="btn" type="button" onClick={addSub}>+ Add</button>
          <button className="btn" type="button" onClick={save}>Save</button>
        </div>

        <div className="list-stack" style={{ marginTop: 14 }}>
          {draft.map((b, idx) => (
            <div key={idx} className="list-card">
              <div className="split-4">
                <div>
                  <label className="small">Name</label>
                  <input className="input" value={b.name || ""} onChange={(e) => setBill(idx, { name: e.target.value })} />
                </div>

                <div>
                  <label className="small">Amount</label>
                  <input className="input" value={b.amount ?? 0} onChange={(e) => setBill(idx, { amount: e.target.value })} inputMode="numeric" />
                </div>

                <div>
                  <label className="small">Due day</label>
                  <input className="input" value={b.dueDay ?? 1} onChange={(e) => setBill(idx, { dueDay: e.target.value })} inputMode="numeric" />
                </div>

                <div>
                  <label className="small">Status</label>
                  <select className="input" value={b.status || "active"} onChange={(e) => setBill(idx, { status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Paused</option>
                  </select>
                </div>
              </div>

              <div className="split-3" style={{ marginTop: 10 }}>
                <div>
                  <label className="small">Provider (optional)</label>
                  <input className="input" value={b.provider || ""} onChange={(e) => setBill(idx, { provider: e.target.value })} placeholder="Netflix, Spotify..." />
                </div>

                <div>
                  <label className="small">Frequency</label>
                  <select className="input" value={b.frequency || "monthly"} onChange={(e) => setBill(idx, { frequency: e.target.value })}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn" type="button" onClick={() => setBill(idx, { status: (b.status || "active") === "active" ? "inactive" : "active" })}>
                    {(b.status || "active") === "active" ? "Pause" : "Resume"}
                  </button>
                  <button className="btn" type="button" onClick={() => remove(idx)}>Remove</button>
                </div>
              </div>

              <div className="small muted" style={{ marginTop: 8 }}>
                Preview: <b>{b.name}</b> | {money(b.amount)} | due day {b.dueDay} | {b.frequency}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
