import React, { useEffect, useState } from "react";
import { getMonthlyBudget, monthKey, upsertMonthlyBudget } from "../../services/budgets";

export default function BudgetsPage({ uid }) {
  const month = monthKey();
  const [dailyFloor, setDailyFloor] = useState(12000);
  const [betBudget, setBetBudget] = useState(50000);
  const [salaryExpected, setSalaryExpected] = useState(200000);

  useEffect(() => {
    if (!uid) return;
    getMonthlyBudget(uid, month).then(d => {
      if (!d) return;
      setDailyFloor(Number(d.dailyFloor ?? 12000));
      setBetBudget(Number(d.categoryBudgets?.bet ?? 50000));
      setSalaryExpected(Number(d.salaryExpected ?? 200000));
    }).catch(console.error);
  }, [uid, month]);

  async function save() {
    if (!uid) return;
    await upsertMonthlyBudget(uid, month, {
      month,
      payday: 28,
      dailyFloor: Number(dailyFloor),
      salaryExpected: Number(salaryExpected),
      categoryBudgets: { bet: Number(betBudget) }
    });
    alert("Saved ✅");
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Budgets ({month})</h2>
      <div style={{ display:"grid", gap: 10, maxWidth: 520 }}>
        <label>Daily Floor (₦/day)
          <input type="number" value={dailyFloor} onChange={e=>setDailyFloor(e.target.value)} />
        </label>
        <label>Bet Budget (₦/month)
          <input type="number" value={betBudget} onChange={e=>setBetBudget(e.target.value)} />
        </label>
        <label>Salary Expected (₦)
          <input type="number" value={salaryExpected} onChange={e=>setSalaryExpected(e.target.value)} />
        </label>
        <button onClick={save}>Save</button>
      </div>
    </div>
  );
}
