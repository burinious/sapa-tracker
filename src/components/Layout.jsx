import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import BillingNotice from "./BillingNotice";
import "../styles/app.css";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { logout, profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const storeName = profile?.storeName || "Sapa Tracker";

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="icon-btn"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>

        <div className="topbar-title">
          <div className="app-name">{storeName}</div>
          <div className="app-sub">Finance • Inventory • Habits</div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* Backdrop */}
      <div
        className={`backdrop ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <div className="brand">{storeName}</div>
          <button
            className="icon-btn"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="nav">
          <NavItem to="/dashboard" label="Dashboard" onClick={() => setOpen(false)} />
          <NavItem to="/coach" label="Coach" onClick={() => setOpen(false)} />
          <NavItem to="/add-transaction" label="Add Transaction" onClick={() => setOpen(false)} />
          <NavItem to="/transactions" label="Transactions" onClick={() => setOpen(false)} />
          <NavItem to="/entries" label="Entries" onClick={() => setOpen(false)} />
          <NavItem to="/loans" label="Loans" onClick={() => setOpen(false)} />
          <NavItem to="/budgets" label="Budgets" onClick={() => setOpen(false)} />
          <NavItem to="/house-shopping" label="House Shopping" onClick={() => setOpen(false)} />
          <NavItem to="/subscriptions" label="Subscriptions" onClick={() => setOpen(false)} />
          <NavItem to="/ai" label="SAPA A.I" onClick={() => setOpen(false)} />
          <NavItem to="/edit-profile" label="Edit Profile" onClick={() => setOpen(false)} />
        </nav>

        <div className="sidebar-foot">
          <button className="danger-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="content">
        <BillingNotice />
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `nav-link ${isActive ? "active" : ""}`
      }
    >
      {label}
    </NavLink>
  );
}
