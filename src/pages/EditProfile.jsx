import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import SyncStatusPanel from "../components/SyncStatusPanel";
import "../styles/app.css";

import { ensureUserProfile, upsertUserProfile } from "../services/profileService";
import {
  DEFAULT_BILLS_NG,
  mergeDefaults,
  normalizeDay,
  normalizeNumber,
  safeDateStr
} from "../utils/profileSchema";

function money(n) {
  return `₦${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;
}

export default function EditProfile() {
  const { user, profile } = useAuth();
  const uid = user?.uid;

  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const base = useMemo(() => mergeDefaults(profile || {}), [profile]);

  const [form, setForm] = useState(base);

  useEffect(() => {
    setForm(base);
  }, [base]);

  useEffect(() => {
    (async () => {
      if (!uid) return;
      if (seeded) return;
      try {
        setBusy(true);
        const merged = await ensureUserProfile(uid);
        setForm(mergeDefaults(merged));
        setSeeded(true);
      } catch (e) {
        // don't hard fail UI
        console.error(e);
      } finally {
        setBusy(false);
      }
    })();
  }, [uid, seeded]);

  if (!uid) {
    return (
      <div className="st-card" style={{ maxWidth: 860 }}>
        <h3>Edit Profile</h3>
        <p className="small">Log in to update your profile.</p>
      </div>
    );
  }

  const update = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...(cur[keys[i]] || {}) };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const setBill = (idx, patch) => {
    setForm((prev) => {
      const bills = Array.isArray(prev.fixedBills) ? [...prev.fixedBills] : [];
      bills[idx] = { ...(bills[idx] || {}), ...patch };
      return { ...prev, fixedBills: bills };
    });
  };

  const addBill = () => {
    setForm((prev) => {
      const bills = Array.isArray(prev.fixedBills) ? [...prev.fixedBills] : [];
      bills.push({
        name: "New Bill",
        amount: 0,
        frequency: "monthly",
        dueDay: 1,
        category: "Utilities",
        provider: "",
        status: "active",
        autopay: false,
      });
      return { ...prev, fixedBills: bills };
    });
  };

  const seedDefaultBills = () => {
    setForm((prev) => ({ ...prev, fixedBills: DEFAULT_BILLS_NG }));
    toast.info("Default bills loaded. Update amounts + due days.");
  };

  const removeBill = (idx) => {
    setForm((prev) => {
      const bills = Array.isArray(prev.fixedBills) ? [...prev.fixedBills] : [];
      bills.splice(idx, 1);
      return { ...prev, fixedBills: bills };
    });
  };

  async function save() {
    try {
      setBusy(true);

      // sanitize numbers/dates
      const patch = {
        fullName: (form.fullName || "").trim(),
        gender: (form.gender || "").trim(),
        pronouns: (form.pronouns || "").trim(),
        dateOfBirth: safeDateStr(form.dateOfBirth),
        currency: (form.currency || "NGN").trim() || "NGN",
        timezone: (form.timezone || "Africa/Lagos").trim() || "Africa/Lagos",

        cashAtHand: normalizeNumber(form.cashAtHand, 0),

        primaryIncome: {
          amount: normalizeNumber(form.primaryIncome?.amount, 0),
          frequency: form.primaryIncome?.frequency || "monthly",
          payday: normalizeDay(form.primaryIncome?.payday ?? 25, 25),
          nextPayDate: safeDateStr(form.primaryIncome?.nextPayDate),
        },

        rent: {
          amount: normalizeNumber(form.rent?.amount, 0),
          frequency: form.rent?.frequency || "yearly",
          nextDueDate: safeDateStr(form.rent?.nextDueDate),
          reminderDays: Array.isArray(form.rent?.reminderDays) ? form.rent.reminderDays : [60, 30, 14],
        },

        fixedBills: (Array.isArray(form.fixedBills) ? form.fixedBills : []).map((b) => ({
          name: (b?.name || "").trim() || "Bill",
          amount: normalizeNumber(b?.amount, 0),
          frequency: b?.frequency || "monthly",
          dueDay: normalizeDay(b?.dueDay ?? 1, 1),
          category: (b?.category || "Utilities").trim() || "Utilities",
          provider: (b?.provider || "").trim(),
          status: b?.status || "active", // active | inactive
          autopay: !!b?.autopay,
        })),

        spendingPrefs: {
          foodStyle: form.spendingPrefs?.foodStyle || "mix",
          transportStyle: form.spendingPrefs?.transportStyle || "mixed",
          dailySpendCap: normalizeNumber(form.spendingPrefs?.dailySpendCap, 0),
          savingsGoalMonthly: normalizeNumber(form.spendingPrefs?.savingsGoalMonthly, 0),
        },

        aiTone: form.aiTone || "street",
        sensitiveMode: !!form.sensitiveMode,
      };

      await upsertUserProfile(uid, patch);
      toast.success("Profile saved. SAPA A.I is now smarter.");
    } catch (e) {
      toast.error(e?.message || "Failed to save profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="st-card" style={{ maxWidth: 860 }}>
      <h3>Edit Profile</h3>
      <p className="small" style={{ opacity: 0.85 }}>
        This profile powers SAPA A.I context (income, rent, bills, preferences).
      </p>

      <div style={{ display: "grid", gap: 18, marginTop: 14 }}>
        {/* Identity */}
        <section>
          <h4>Identity</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="small">Full name</label>
              <input className="input" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
            </div>

            <div>
              <label className="small">Pronouns (optional)</label>
              <input className="input" value={form.pronouns} onChange={(e) => update("pronouns", e.target.value)} placeholder="he/him" />
            </div>

            <div>
              <label className="small">Gender (optional)</label>
              <input className="input" value={form.gender} onChange={(e) => update("gender", e.target.value)} placeholder="male/female/..." />
            </div>

            <div>
              <label className="small">Date of birth (optional)</label>
              <input className="input" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Locale */}
        <section>
          <h4>Locale</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="small">Currency</label>
              <input className="input" value={form.currency} onChange={(e) => update("currency", e.target.value)} placeholder="NGN" />
            </div>
            <div>
              <label className="small">Timezone</label>
              <input className="input" value={form.timezone} onChange={(e) => update("timezone", e.target.value)} placeholder="Africa/Lagos" />
            </div>
          </div>
        </section>

        {/* Cash baseline */}
        <section>
          <h4>Cash Baseline</h4>
          <p className="small" style={{ opacity: 0.85 }}>
            This is your current “cash at hand”. If it goes negative, SAPA A.I will call it “shortfall”.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div>
              <label className="small">Cash at hand</label>
              <input
                className="input"
                value={form.cashAtHand}
                onChange={(e) => update("cashAtHand", e.target.value)}
                placeholder="e.g. 50000"
                inputMode="numeric"
              />
            </div>
          </div>
        </section>

        {/* Income */}
        <section>
          <h4>Primary Income</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label className="small">Amount</label>
              <input className="input" value={form.primaryIncome?.amount ?? 0} onChange={(e) => update("primaryIncome.amount", e.target.value)} inputMode="numeric" />
            </div>

            <div>
              <label className="small">Frequency</label>
              <select className="input" value={form.primaryIncome?.frequency || "monthly"} onChange={(e) => update("primaryIncome.frequency", e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="small">Payday (day of month)</label>
              <input className="input" value={form.primaryIncome?.payday ?? 25} onChange={(e) => update("primaryIncome.payday", e.target.value)} inputMode="numeric" />
            </div>

            <div style={{ gridColumn: "1 / span 3" }}>
              <label className="small">Next pay date (optional)</label>
              <input className="input" type="date" value={form.primaryIncome?.nextPayDate || ""} onChange={(e) => update("primaryIncome.nextPayDate", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Rent */}
        <section>
          <h4>House Rent</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label className="small">Rent amount</label>
              <input className="input" value={form.rent?.amount ?? 0} onChange={(e) => update("rent.amount", e.target.value)} inputMode="numeric" />
            </div>

            <div>
              <label className="small">Frequency</label>
              <select className="input" value={form.rent?.frequency || "yearly"} onChange={(e) => update("rent.frequency", e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="small">Next due date</label>
              <input className="input" type="date" value={form.rent?.nextDueDate || ""} onChange={(e) => update("rent.nextDueDate", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Bills */}
        <section>
          <h4>Bills & Subscriptions</h4>
          <p className="small" style={{ opacity: 0.85 }}>
            Add your fixed bills so SAPA A.I can protect them and warn you early.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <button className="btn" type="button" onClick={addBill}>+ Add Bill</button>
            <button className="btn" type="button" onClick={seedDefaultBills}>Load Default Bills</button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {(form.fixedBills || []).map((b, idx) => (
              <div key={idx} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label className="small">Name</label>
                    <input className="input" value={b.name} onChange={(e) => setBill(idx, { name: e.target.value })} />
                  </div>

                  <div>
                    <label className="small">Amount</label>
                    <input className="input" value={b.amount} onChange={(e) => setBill(idx, { amount: e.target.value })} inputMode="numeric" />
                  </div>

                  <div>
                    <label className="small">Due day</label>
                    <input className="input" value={b.dueDay} onChange={(e) => setBill(idx, { dueDay: e.target.value })} inputMode="numeric" />
                  </div>

                  <div>
                    <label className="small">Status</label>
                    <select className="input" value={b.status || "active"} onChange={(e) => setBill(idx, { status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="small">Frequency</label>
                    <select className="input" value={b.frequency || "monthly"} onChange={(e) => setBill(idx, { frequency: e.target.value })}>
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label className="small">Category</label>
                    <input className="input" value={b.category || ""} onChange={(e) => setBill(idx, { category: e.target.value })} placeholder="Utilities, Entertainment..." />
                  </div>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <label className="small">Provider (optional)</label>
                    <input className="input" value={b.provider || ""} onChange={(e) => setBill(idx, { provider: e.target.value })} placeholder="Netflix, Disco, ISP..." />
                  </div>

                  <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
                    <button className="btn" type="button" onClick={() => removeBill(idx)}>Remove</button>
                  </div>
                </div>

                <div className="small" style={{ marginTop: 10, opacity: 0.85 }}>
                  Preview: <b>{b.name}</b> · {money(b.amount)} · due day {b.dueDay} · {b.frequency}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h4>Preferences</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="small">Food style</label>
              <select className="input" value={form.spendingPrefs?.foodStyle || "mix"} onChange={(e) => update("spendingPrefs.foodStyle", e.target.value)}>
                <option value="cookMostly">Cook mostly</option>
                <option value="mix">Mix</option>
                <option value="buyMostly">Buy mostly</option>
              </select>
            </div>

            <div>
              <label className="small">Transport style</label>
              <select className="input" value={form.spendingPrefs?.transportStyle || "mixed"} onChange={(e) => update("spendingPrefs.transportStyle", e.target.value)}>
                <option value="public">Public transport</option>
                <option value="rideHail">Ride hailing</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="small">Daily spend cap (optional)</label>
              <input className="input" value={form.spendingPrefs?.dailySpendCap ?? 0} onChange={(e) => update("spendingPrefs.dailySpendCap", e.target.value)} inputMode="numeric" />
            </div>

            <div>
              <label className="small">Savings goal monthly (optional)</label>
              <input className="input" value={form.spendingPrefs?.savingsGoalMonthly ?? 0} onChange={(e) => update("spendingPrefs.savingsGoalMonthly", e.target.value)} inputMode="numeric" />
            </div>
          </div>
        </section>

        {/* SAPA A.I config */}
        <section>
          <h4>SAPA A.I</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="small">AI tone</label>
              <select className="input" value={form.aiTone || "street"} onChange={(e) => update("aiTone", e.target.value)}>
                <option value="street">Street</option>
                <option value="coach">Coach</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
              <label className="small">
                <input
                  type="checkbox"
                  checked={!!form.sensitiveMode}
                  onChange={(e) => update("sensitiveMode", e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Sensitive mode (less harsh)
              </label>
            </div>
          </div>
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <button className="btn" onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save Profile"}
          </button>
        </div>

        <SyncStatusPanel />
      </div>
    </div>
  );
}
