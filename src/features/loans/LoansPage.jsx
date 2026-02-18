import React, { useCallback, useMemo, useState, useEffect } from "react";
import { FaHandHoldingUsd } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { addLoan, getActiveLoans, recordLoanPayment, updateLoan } from "../../services/loans";
import { getLoans } from "../../utils/localLoans";
import { fmtMoney } from "../../utils/money";
import LocalOnlyNotice from "../../components/LocalOnlyNotice";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function daySuffix(day) {
  const n = Number(day);
  if (!Number.isFinite(n)) return "";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "st";
  if (mod10 === 2 && mod100 !== 12) return "nd";
  if (mod10 === 3 && mod100 !== 13) return "rd";
  return "th";
}

export default function LoansPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [lender, setLender] = useState("Co-op");
  const [principal, setPrincipal] = useState(500000);
  const [dueDay, setDueDay] = useState(28);
  const [termMonths, setTermMonths] = useState(18);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [actioningLoanId, setActioningLoanId] = useState("");
  const [editingLoanId, setEditingLoanId] = useState("");
  const [editDraft, setEditDraft] = useState({
    lender: "",
    principal: "",
    balance: "",
    dueDay: "",
    termMonths: "",
    startDate: "",
  });
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(() => {
    if (!uid) {
      setPendingCount(0);
      return;
    }
    const local = getLoans(uid);
    setPendingCount(local.filter((l) => l.syncStatus !== "synced").length);
  }, [uid]);

  const refresh = useCallback(async () => {
    if (!uid) {
      setLoans([]);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getActiveLoans(uid);
      setLoans(Array.isArray(data) ? data : []);
      refreshPending();
    } catch (err) {
      setError(err?.message || "Failed to load loans");
      refreshPending();
    } finally {
      setLoading(false);
    }
  }, [uid, refreshPending]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  async function onAddLoan() {
    if (!uid) return;

    const normalizedLender = (lender || "").trim();
    const normalizedPrincipal = toNumber(principal, 0);
    const normalizedDueDay = Math.max(1, Math.min(31, toNumber(dueDay, 28)));
    const normalizedTerm = Math.max(1, toNumber(termMonths, 18));

    if (!normalizedLender) {
      toast.error("Enter lender name");
      return;
    }
    if (normalizedPrincipal <= 0) {
      toast.error("Principal must be greater than zero");
      return;
    }

    setSaving(true);
    try {
      await addLoan(uid, {
        lender: normalizedLender,
        principal: normalizedPrincipal,
        balance: normalizedPrincipal,
        dueDay: normalizedDueDay,
        termMonths: normalizedTerm,
        startDate: startDate || new Date().toISOString().slice(0, 10),
      });
      toast.success("Loan added");
      await refresh();
    } catch (err) {
      toast.error(err?.message || "Failed to add loan");
    } finally {
      setSaving(false);
    }
  }

  async function onRecordPayment(loan) {
    if (!uid || !loan?.id) return;
    const raw = paymentDrafts[loan.id];
    const amount = toNumber(raw, 0);
    const currentBalance = Math.max(0, toNumber(loan.balance, 0));

    if (amount <= 0) {
      toast.error("Enter payment amount");
      return;
    }
    if (currentBalance <= 0) {
      toast.error("This loan is already settled");
      return;
    }

    const payAmount = Math.min(amount, currentBalance);
    const nextBalance = Math.max(0, currentBalance - payAmount);

    setActioningLoanId(loan.id);
    try {
      await recordLoanPayment(uid, loan.id, payAmount, new Date().toISOString().slice(0, 10));
      await updateLoan(uid, loan.id, {
        balance: nextBalance,
        status: nextBalance <= 0 ? "closed" : "active",
      });

      setPaymentDrafts((prev) => ({ ...prev, [loan.id]: "" }));
      toast.success(nextBalance <= 0 ? "Loan cleared" : "Payment recorded");
      await refresh();
    } catch (err) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setActioningLoanId("");
    }
  }

  async function onCloseLoan(loanId) {
    if (!uid || !loanId) return;
    setActioningLoanId(loanId);
    try {
      await updateLoan(uid, loanId, { status: "closed", balance: 0 });
      toast.success("Loan closed");
      await refresh();
    } catch (err) {
      toast.error(err?.message || "Failed to close loan");
    } finally {
      setActioningLoanId("");
    }
  }

  function startEditingLoan(loan) {
    if (!loan?.id) return;
    setEditingLoanId(loan.id);
    setEditDraft({
      lender: loan.lender || "",
      principal: String(toNumber(loan.principal, 0)),
      balance: String(toNumber(loan.balance, 0)),
      dueDay: String(toNumber(loan.dueDay, 28)),
      termMonths: String(toNumber(loan.termMonths, 18)),
      startDate: loan.startDate || new Date().toISOString().slice(0, 10),
    });
  }

  function cancelEditingLoan() {
    setEditingLoanId("");
    setEditDraft({
      lender: "",
      principal: "",
      balance: "",
      dueDay: "",
      termMonths: "",
      startDate: "",
    });
  }

  async function saveLoanEdits(loanId) {
    if (!uid || !loanId) return;

    const normalizedLender = (editDraft.lender || "").trim();
    const normalizedPrincipal = toNumber(editDraft.principal, 0);
    const normalizedBalance = Math.max(0, toNumber(editDraft.balance, 0));
    const normalizedDueDay = Math.max(1, Math.min(31, toNumber(editDraft.dueDay, 28)));
    const normalizedTerm = Math.max(1, toNumber(editDraft.termMonths, 18));

    if (!normalizedLender) {
      toast.error("Lender name is required");
      return;
    }
    if (normalizedPrincipal <= 0) {
      toast.error("Principal must be greater than zero");
      return;
    }

    setActioningLoanId(loanId);
    try {
      await updateLoan(uid, loanId, {
        lender: normalizedLender,
        principal: normalizedPrincipal,
        balance: normalizedBalance,
        dueDay: normalizedDueDay,
        termMonths: normalizedTerm,
        startDate: editDraft.startDate || new Date().toISOString().slice(0, 10),
        status: normalizedBalance <= 0 ? "closed" : "active",
      });
      toast.success("Loan updated");
      cancelEditingLoan();
      await refresh();
    } catch (err) {
      toast.error(err?.message || "Failed to update loan");
    } finally {
      setActioningLoanId("");
    }
  }

  const totals = useMemo(() => {
    const totalOwed = loans.reduce((sum, item) => sum + toNumber(item.balance, 0), 0);
    const avgBalance = loans.length ? totalOwed / loans.length : 0;
    return { totalOwed, avgBalance };
  }, [loans]);

  return (
    <div className="page-shell">
      <div className="page-card loans-page-card">
        <div className="page-title-row">
          <span className="page-title-icon"><FaHandHoldingUsd /></span>
          <h2 className="page-title">Loans</h2>
        </div>
        <p className="page-sub">Track active loans and payment pressure.</p>
        <LocalOnlyNotice pendingCount={pendingCount} />
        {error ? <div className="note-warn">{error}</div> : null}

        <div className="stats-row">
          <div className="stat-pill">Total owed: <b>{fmtMoney(totals.totalOwed, "NGN")}</b></div>
          <div className="stat-pill">Active loans: <b>{loans.length}</b></div>
          <div className="stat-pill">Avg balance: <b>{fmtMoney(totals.avgBalance, "NGN")}</b></div>
        </div>

        <div className="section-card" style={{ marginTop: 12 }}>
          <h3 className="section-title">Add Loan</h3>
          <div className="split-4 loans-form-grid">
            <label className="small">
              Lender
              <input className="input" value={lender} onChange={(e) => setLender(e.target.value)} placeholder="Co-op" />
            </label>
            <label className="small">
              Principal (NGN)
              <input className="input" type="number" min="0" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
            </label>
            <label className="small">
              Due day
              <input className="input" type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </label>
            <label className="small">
              Term (months)
              <input className="input" type="number" min="1" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
            </label>
          </div>
          <div className="toolbar">
            <label className="small toolbar-grow">
              Start date
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <button className="btn" onClick={onAddLoan} disabled={saving || !uid}>
              {saving ? "Adding..." : "+ Add Loan"}
            </button>
          </div>
        </div>

        <div className="list-stack loans-list-stack">
          {loading ? (
            <div className="list-card">
              <div className="list-title">Loading loans...</div>
            </div>
          ) : null}

          {!loading && loans.length === 0 ? (
            <div className="list-card">
              <div className="list-title">No active loans</div>
              <p className="small muted">Add your first loan above to track payment pressure.</p>
            </div>
          ) : null}

          {!loading && loans.map((loan) => {
            const balance = Math.max(0, toNumber(loan.balance, 0));
            const principalValue = Math.max(0, toNumber(loan.principal, 0));
            const paid = Math.max(0, principalValue - balance);
            const progress = principalValue > 0 ? Math.min(100, Math.round((paid / principalValue) * 100)) : 0;
            const isBusy = actioningLoanId === loan.id;
            const draftValue = paymentDrafts[loan.id] ?? "";
            const isEditing = editingLoanId === loan.id;

            return (
              <article key={loan.id} className="list-card loan-item-card">
                <div className="list-top">
                  <div>
                    <div className="list-title">{loan.lender || "Loan"}</div>
                    <div className="small muted">
                      Start: {loan.startDate || "-"} | Due day: {loan.dueDay}{daySuffix(loan.dueDay)} | Term: {loan.termMonths} months
                    </div>
                  </div>
                  <div className="loans-item-actions">
                    <div className="stat-pill">Progress: <b>{progress}%</b></div>
                    {!isEditing ? (
                      <button className="btn settings-secondary-btn" onClick={() => startEditingLoan(loan)} disabled={isBusy || !uid}>
                        Modify Loan
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="split-3 loans-summary-grid">
                  <div className="section-card">
                    <div className="small muted">Principal</div>
                    <div className="list-amount">{fmtMoney(principalValue, "NGN")}</div>
                  </div>
                  <div className="section-card">
                    <div className="small muted">Paid</div>
                    <div className="list-amount">{fmtMoney(paid, "NGN")}</div>
                  </div>
                  <div className="section-card">
                    <div className="small muted">Balance</div>
                    <div className="list-amount">{fmtMoney(balance, "NGN")}</div>
                  </div>
                </div>

                <div className="loans-progress-track">
                  <span className="loans-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                {isEditing ? (
                  <div className="section-card loans-edit-card">
                    <div className="split-3 loans-edit-grid">
                      <label className="small">
                        Lender
                        <input
                          className="input"
                          value={editDraft.lender}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, lender: e.target.value }))}
                        />
                      </label>
                      <label className="small">
                        Principal (NGN)
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={editDraft.principal}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, principal: e.target.value }))}
                        />
                      </label>
                      <label className="small">
                        Balance (NGN)
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={editDraft.balance}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, balance: e.target.value }))}
                        />
                      </label>
                      <label className="small">
                        Due day
                        <input
                          className="input"
                          type="number"
                          min="1"
                          max="31"
                          value={editDraft.dueDay}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, dueDay: e.target.value }))}
                        />
                      </label>
                      <label className="small">
                        Term (months)
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={editDraft.termMonths}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, termMonths: e.target.value }))}
                        />
                      </label>
                      <label className="small">
                        Start date
                        <input
                          className="input"
                          type="date"
                          value={editDraft.startDate}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="toolbar">
                      <button className="btn" onClick={() => saveLoanEdits(loan.id)} disabled={isBusy || !uid}>
                        {isBusy ? "Saving..." : "Save Changes"}
                      </button>
                      <button className="btn settings-secondary-btn" onClick={cancelEditingLoan} disabled={isBusy}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="toolbar loans-actions-row">
                    <input
                      className="input toolbar-grow"
                      type="number"
                      min="0"
                      value={draftValue}
                      onChange={(e) => setPaymentDrafts((prev) => ({ ...prev, [loan.id]: e.target.value }))}
                      placeholder="Payment amount (NGN)"
                    />
                    <button className="btn" onClick={() => onRecordPayment(loan)} disabled={isBusy || !uid}>
                      {isBusy ? "Saving..." : "Record Payment"}
                    </button>
                    <button className="btn settings-secondary-btn" onClick={() => onCloseLoan(loan.id)} disabled={isBusy || !uid}>
                      Mark Closed
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
