import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import "../styles/app.css";

const money = (n) => `â‚¦${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;

export default function Subscriptions() {
  const { user, profile, updateUserProfile } = useAuth();
  const uid = user?.uid;

  const liveBills = useMemo(() => {
    const arr = Array.isArray(profile?.fixedBills) ? profile.fixedBills : [];
    // treat "subscriptions" as bills under Entertainment/Subscriptions or provider present
    return arr;
  }, [profile?.fixedBills]);

  const [draft, setDraft] = useState(liveBills);

  // í´¥ keep page always in sync with profile
  useEffect(() => {
    setDraft(liveBills);
  }, [liveBills]);

  if (!uid) {
    return (
      <div className="st-card" style={{ maxWidth: 860 }}>
        <h3>Subscriptions</h3>
        <p className="small">Log in to view subscriptions.</p>
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
      // no manual state update needed; AuthContext snapshot will refresh `profile` and sync draft
    } catch (e) {
      toast.error(e?.message || "Failed to save subscriptions");
    }
  }

  const activeTotal = draft
    .filter((b) => (b?.status || "active") === "active")
    .reduce((sum, b) => sum + Number(b?.amount || 0), 0);

  return (
    <div className="st-card" style={{ maxWidth: 860 }}>
      <h3>Subscriptions</h3>
      <p className="small" style={{ opacity: 0.85 }}>
        These are powered by your profile (realtime). Active total: <b>{money(activeTotal)}</b>/month (approx)
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <button className="btn" type="button" onClick={addSub}>+ Add</button>
        <button className="btn" type="button" onClick={save}>Save</button>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {draft.map((b, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 12,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
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

              <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
                <button className="btn" type="button" onClick={() => setBill(idx, { status: (b.status || "active") === "active" ? "inactive" : "active" })}>
                  {(b.status || "active") === "active" ? "Pause" : "Resume"}
                </button>
                <button className="btn" type="button" onClick={() => remove(idx)}>Remove</button>
              </div>
            </div>

            <div className="small" style={{ marginTop: 8, opacity: 0.85 }}>
              Preview: <b>{b.name}</b> Â· {money(b.amount)} Â· due day {b.dueDay} Â· {b.frequency}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
