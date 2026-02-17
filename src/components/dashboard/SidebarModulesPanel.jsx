import React from "react";
import { Link } from "react-router-dom";
import { monthKey } from "../../services/budgets";
import { getMonthlyBudgetLocal } from "../../utils/localBudgets";
import { getLoans } from "../../utils/localLoans";
import { getEntries } from "../../utils/localEntries";
import { getShopping } from "../../utils/localShopping";

function formatMoney(amount) {
  const n = Number(amount || 0);
  return `NGN ${Math.round(n).toLocaleString("en-NG")}`;
}

function card(route, label, stat, sub) {
  return { route, label, stat, sub };
}

export default function SidebarModulesPanel({
  uid,
  computed,
  transactions = [],
  subscriptions = [],
  aiNotesCount = 0,
}) {
  const loans = uid ? getLoans(uid) : [];
  const activeLoans = loans.filter((x) => x.status === "active");
  const loanTotal = activeLoans.reduce((sum, x) => sum + Number(x.balance || 0), 0);

  const month = monthKey();
  const budget = uid ? getMonthlyBudgetLocal(uid, month) : null;
  const dailyFloor = Number(budget?.dailyFloor || 0);
  const betBudget = Number(budget?.categoryBudgets?.bet || 0);

  const entries = uid ? getEntries(uid) : [];
  const shopping = uid ? getShopping(uid) : [];
  const shoppingTotal = shopping.reduce((sum, item) => {
    return sum + (Number(item.qty || 0) * Number(item.price || 0));
  }, 0);

  const modules = [
    card("/coach", "Coach", `${computed?.score || 0}/100 risk score`, computed?.zone || "No coach score yet"),
    card("/budgets", "Budgets", dailyFloor ? `${formatMoney(dailyFloor)}/day` : "Not set", betBudget ? `Bet budget ${formatMoney(betBudget)}` : `Month ${month}`),
    card("/loans", "Loans", activeLoans.length ? `${activeLoans.length} active` : "No active loan", activeLoans.length ? `${formatMoney(loanTotal)} owed` : "Add and track loan balances"),
    card("/add-transaction", "Add Transaction", "Quick log", "Capture income and expenses"),
    card("/transactions", "Transactions", `${transactions.length} loaded`, `MTD expense ${formatMoney(computed?.mtdExpense || 0)}`),
    card("/entries", "Entries", `${entries.length} notes`, entries.length ? "Track daily money thoughts" : "Start with one entry"),
    card("/house-shopping", "House Shopping", `${shopping.length} items`, shopping.length ? `${formatMoney(shoppingTotal)} estimated total` : "Add your home shopping list"),
    card("/subscriptions", "Subscriptions", `${subscriptions.length} active`, `${computed?.dueSoon?.length || 0} due soon`),
    card("/ai", "SAPA A.I", `${aiNotesCount} notes`, "Open analysis and actions"),
    card("/edit-profile", "Edit Profile", "Account settings", "Update business and cash context"),
  ];

  return (
    <div className="st-card">
      <div className="st-header">
        <div>
          <div className="st-kicker">Sidebar Reflection</div>
          <h3 className="st-title">All Modules On Dashboard</h3>
        </div>
      </div>

      <div className="st-module-grid">
        {modules.map((item) => (
          <Link key={item.route} to={item.route} className="st-module-card">
            <div className="st-module-top">
              <div className="st-module-name">{item.label}</div>
              <div className="st-module-open">Open</div>
            </div>
            <div className="st-module-stat">{item.stat}</div>
            <div className="st-module-sub">{item.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
