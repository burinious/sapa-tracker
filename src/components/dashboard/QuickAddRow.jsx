import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowUp, FaArrowDown, FaRegStickyNote, FaRegCreditCard } from "react-icons/fa";

function Btn({ icon, label, onClick }) {
  return (
    <button className="st-qbtn" onClick={onClick} type="button">
      <span className="st-qbtn-ic">{icon}</span>
      <span className="st-qbtn-tx">{label}</span>
    </button>
  );
}

export default function QuickAddRow() {
  const nav = useNavigate();

  return (
    <div className="st-card st-quick">
      <div className="st-kicker">Quick Add</div>
      <div className="st-qgrid">
        <Btn icon={<FaArrowDown />} label="Expense" onClick={() => nav("/add-transaction?type=expense")} />
        <Btn icon={<FaArrowUp />} label="Income" onClick={() => nav("/add-transaction?type=income")} />
        <Btn icon={<FaRegCreditCard />} label="Subscription" onClick={() => nav("/add-transaction?type=expense&tag=subscription")} />
        <Btn icon={<FaRegStickyNote />} label="Note" onClick={() => nav("/dashboard#notes")} />
      </div>
      <div className="st-hint">Tip: start from “Expense” daily — that’s where sapa hides.</div>
    </div>
  );
}
