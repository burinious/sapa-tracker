import React, { useEffect, useState } from "react";
import { FaWallet } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getMonthlyBudget, monthKey, upsertMonthlyBudget } from "../../services/budgets";
import { getMonthlyBudgetLocal } from "../../utils/localBudgets";
import LocalOnlyNotice from "../../components/LocalOnlyNotice";

export default function BudgetsPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const month = monthKey();
  const [dailyFloor, setDailyFloor] = useState(12000);
  const [betBudget, setBetBudget] = useState(50000);
  const [salaryExpected, setSalaryExpected] = useState(200000);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    getMonthlyBudget(uid, month).then((d) => {
      if (!d) return;
      setDailyFloor(Number(d.dailyFloor ?? 12000));
      setBetBudget(Number(d.categoryBudgets?.bet ?? 50000));
      setSalaryExpected(Number(d.salaryExpected ?? 200000));
    }).catch(console.error);
  }, [uid, month]);

  useEffect(() => {
    if (!uid) return;
    const local = getMonthlyBudgetLocal(uid, month);
    setPendingCount(local && local.syncStatus !== "synced" ? 1 : 0);
  }, [uid, month, dailyFloor, betBudget, salaryExpected]);

  async function save() {
    if (!uid) return;
    await upsertMonthlyBudget(uid, month, {
      month,
      payday: 28,
      dailyFloor: Number(dailyFloor),
      salaryExpected: Number(salaryExpected),
      categoryBudgets: { bet: Number(betBudget) }
    });
    alert("Saved");
  }

  return (
    <div className="page-shell">
      <div className="page-card" style={{ maxWidth: 620 }}>
        <div className="page-title-row">
          <span className="page-title-icon"><FaWallet /></span>
          <h2 className="page-title">Budgets ({month})</h2>
        </div>
        <p className="page-sub">Tune your daily floor and monthly pressure limits.</p>
        <LocalOnlyNotice pendingCount={pendingCount} />

        <div className="page-stack-md" style={{ marginTop: 10 }}>
          <label className="small">Daily Floor (NGN/day)
            <input type="number" value={dailyFloor} onChange={(e) => setDailyFloor(e.target.value)} />
          </label>
          <label className="small">Bet Budget (NGN/month)
            <input type="number" value={betBudget} onChange={(e) => setBetBudget(e.target.value)} />
          </label>
          <label className="small">Salary Expected (NGN)
            <input type="number" value={salaryExpected} onChange={(e) => setSalaryExpected(e.target.value)} />
          </label>
          <button className="btn" onClick={save}>Save Budget</button>
        </div>
      </div>
    </div>
  );
}
