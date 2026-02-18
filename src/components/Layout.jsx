import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaBars,
  FaTimes,
  FaTachometerAlt,
  FaPlusCircle,
  FaReceipt,
  FaUserTie,
  FaWallet,
  FaHandHoldingUsd,
  FaRegCreditCard,
  FaBook,
  FaShoppingBasket,
  FaRobot,
  FaCog,
  FaUserCog,
  FaChevronDown,
  FaChevronUp,
  FaSignOutAlt,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import BillingNotice from "./BillingNotice";
import SapaLogo from "./brand/SapaLogo";
import "../styles/app.css";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { logout, profile, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const username =
    profile?.fullName ||
    profile?.username ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User";

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="icon-btn"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <FaBars />
        </button>

        <div className="topbar-title">
          <div className="topbar-brand-row">
            <SapaLogo size={24} className="topbar-logo" />
            <div className="app-name">{username}</div>
          </div>
          <div className="app-sub">SapaTracker | Finance | Inventory | Habits</div>
        </div>

      </header>

      <div
        className={`backdrop ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <div className="brand brand-stack">
            <SapaLogo size={20} showWordmark className="sidebar-logo" />
            <div className="brand-user">{username}</div>
          </div>
          <button
            className="icon-btn"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="nav">
          <div className="nav-section-title">Core</div>
          <NavItem to="/dashboard" label="Dashboard" icon={<FaTachometerAlt />} onClick={() => setOpen(false)} />
          <NavItem to="/add-transaction" label="Add Transaction" icon={<FaPlusCircle />} onClick={() => setOpen(false)} />
          <NavItem to="/transactions" label="Transactions" icon={<FaReceipt />} onClick={() => setOpen(false)} />

          <div className="nav-section-title">Money Tools</div>
          <NavItem to="/coach" label="Coach" icon={<FaUserTie />} onClick={() => setOpen(false)} />
          <NavItem to="/budgets" label="Budgets" icon={<FaWallet />} onClick={() => setOpen(false)} />
          <NavItem to="/loans" label="Loans" icon={<FaHandHoldingUsd />} onClick={() => setOpen(false)} />
          <NavItem to="/subscriptions" label="Subscriptions" icon={<FaRegCreditCard />} onClick={() => setOpen(false)} />

          <button
            type="button"
            className="nav-toggle"
            onClick={() => setShowMore((v) => !v)}
          >
            {showMore ? <FaChevronUp className="nav-icon" /> : <FaChevronDown className="nav-icon" />}
            {showMore ? "Hide" : "Show"} more tools
          </button>

          <div className="nav-section-title">Account</div>
          <NavItem to="/settings" label="Settings" icon={<FaCog />} onClick={() => setOpen(false)} />
          <NavItem to="/edit-profile" label="Edit Profile" icon={<FaUserCog />} onClick={() => setOpen(false)} />
          <button
            type="button"
            className="nav-link nav-link-button danger-link"
            onClick={handleLogout}
          >
            <span className="nav-icon">
              <FaSignOutAlt />
            </span>
            Logout
          </button>

          {showMore ? (
            <>
              <div className="nav-section-title">More Tools</div>
              <NavItem to="/entries" label="Entries" icon={<FaBook />} onClick={() => setOpen(false)} />
              <NavItem to="/house-shopping" label="House Shopping" icon={<FaShoppingBasket />} onClick={() => setOpen(false)} />
              <NavItem to="/ai" label="SAPA A.I" icon={<FaRobot />} onClick={() => setOpen(false)} />
            </>
          ) : null}
        </nav>

      </aside>

      <main className="content">
        <BillingNotice />
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, label, icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `nav-link ${isActive ? "active" : ""}`
      }
    >
      {icon ? <span className="nav-icon">{icon}</span> : null}
      {label}
    </NavLink>
  );
}
