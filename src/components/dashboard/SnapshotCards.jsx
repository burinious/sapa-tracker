import React from "react";
import { fmtMoney } from "../../utils/money";
import { FaWallet, FaArrowUp, FaArrowDown, FaChartLine } from "react-icons/fa";

function Card({ icon, label, value }) {
  return (
    <div className="st-stat">
      <div className="st-stat-ic">{icon}</div>
      <div className="st-stat-meta">
        <div className="st-stat-lbl">{label}</div>
        <div className="st-stat-val">{value}</div>
      </div>
    </div>
  );
}

export default function SnapshotCards({ cashApprox = 0, mtdIncome = 0, mtdExpense = 0, currency = "NGN" }) {
  const net = mtdIncome - mtdExpense;

  return (
    <div className="st-grid-2">
      <Card icon={<FaWallet />} label="Cash outlook" value={fmtMoney(cashApprox, currency)} />
      <Card icon={<FaArrowUp />} label="Income (MTD)" value={fmtMoney(mtdIncome, currency)} />
      <Card icon={<FaArrowDown />} label="Expenses (MTD)" value={fmtMoney(mtdExpense, currency)} />
      <Card icon={<FaChartLine />} label="Net (MTD)" value={fmtMoney(net, currency)} />
    </div>
  );
}
