import React, { useEffect, useState } from "react";
import { addLoan, getActiveLoans } from "../../services/loans";

export default function LoansPage({ uid }) {
  const [loans, setLoans] = useState([]);
  const [principal, setPrincipal] = useState(500000);

  async function refresh() {
    if (!uid) return;
    const data = await getActiveLoans(uid);
    setLoans(data);
  }

  useEffect(() => { refresh().catch(console.error); }, [uid]);

  async function onAdd() {
    if (!uid) return;
    await addLoan(uid, { lender: "Co-op", principal, balance: principal, dueDay: 28, termMonths: 18 });
    await refresh();
  }

  const totalOwed = loans.reduce((s,l)=>s + Number(l.balance || 0), 0);

  return (
    <div style={{ padding: 16 }}>
      <h2>Loans</h2>
      <p>Total owed: <b>₦{Math.round(totalOwed).toLocaleString()}</b></p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input type="number" value={principal} onChange={e=>setPrincipal(Number(e.target.value))} />
        <button onClick={onAdd}>+ Add Co-op Loan</button>
      </div>

      {loans.map(l => (
        <div key={l.id} style={{ border: "1px solid #2a3550", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>{l.lender}</div>
          <div>Balance: ₦{Math.round(Number(l.balance||0)).toLocaleString()}</div>
          <div>Due day: {l.dueDay}th | Term: {l.termMonths} months</div>
        </div>
      ))}
    </div>
  );
}
