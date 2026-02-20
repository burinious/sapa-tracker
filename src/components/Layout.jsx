import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaPlusCircle,
  FaReceipt,
  FaSearch,
  FaSignOutAlt,
  FaThLarge,
  FaTachometerAlt,
  FaUserTie,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import BillingNotice from "./BillingNotice";
import SapaLogo from "./brand/SapaLogo";
import "../styles/app.css";

const SEARCH_LINKS = [
  { id: "dashboard", label: "Dashboard", to: "/dashboard", keywords: "home overview cards" },
  { id: "add-transaction", label: "Add Transaction", to: "/add-transaction", keywords: "expense income add money" },
  { id: "transactions", label: "Transactions", to: "/transactions", keywords: "spending history review" },
  { id: "coach", label: "Coach", to: "/coach", keywords: "sapa risk advisor" },
  { id: "budgets", label: "Budgets", to: "/budgets", keywords: "daily target monthly limit" },
  { id: "loans", label: "Loans", to: "/loans", keywords: "debt repayment balances" },
  { id: "subscriptions", label: "Subscriptions", to: "/subscriptions", keywords: "bills due recurring" },
  { id: "entries", label: "Entries", to: "/entries", keywords: "journal notes habits" },
  { id: "house-shopping", label: "House Shopping", to: "/house-shopping", keywords: "shopping list inventory" },
  { id: "ai", label: "SAPA A.I", to: "/ai", keywords: "analysis assistant ai" },
  { id: "settings", label: "Settings", to: "/settings", keywords: "preferences theme display" },
  { id: "notifications", label: "Notifications", to: "/notifications", keywords: "read unread inbox alerts updates" },
  { id: "settings-display", label: "Display Preferences", to: "/settings#display", keywords: "display preferences widgets theme" },
  { id: "settings-notifications", label: "Notifications", to: "/settings#notifications", keywords: "push alerts reminders" },
  { id: "edit-profile", label: "Edit Profile", to: "/edit-profile", keywords: "account profile details" },
  { id: "profile", label: "Profile Hub", to: "/profile", keywords: "profile account security" },
  { id: "security", label: "Change Password", to: "/security", keywords: "password security reset" },
  { id: "menu", label: "Menu", to: "/menu", keywords: "all features links cards" },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, profile, user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const searchInputRef = useRef(null);
  const profileMenuRef = useRef(null);

  const username =
    profile?.fullName ||
    profile?.username ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User";

  const initials = useMemo(() => {
    const source = (profile?.fullName || username || "User").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }, [profile?.fullName, username]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SEARCH_LINKS.slice(0, 8);
    return SEARCH_LINKS.filter((item) => {
      const hay = `${item.label} ${item.keywords}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 12);
  }, [searchQuery]);

  useEffect(() => {
    setProfileOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 40);
    const onKey = (e) => {
      if (e.key === "Escape") setSearchOpen(false);
      if (e.key === "Enter" && searchResults.length) {
        navigate(searchResults[0].to);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchOpen, searchResults, navigate]);

  useEffect(() => {
    const onClickAway = (e) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function openRoute(path) {
    navigate(path);
    setSearchOpen(false);
    setProfileOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar app-topbar">
        <div className="topbar-brand-wrap">
          <SapaLogo size={24} className="topbar-logo" />
          <div className="topbar-title">
            <div className="app-name">SapaTracker</div>
            <div className="app-sub">Stay ahead of sapa</div>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="icon-btn topbar-icon-btn" type="button" aria-label="Search features" onClick={() => setSearchOpen(true)}>
            <FaSearch />
          </button>
            <button
              className="icon-btn topbar-icon-btn"
              type="button"
              aria-label="Notifications"
              onClick={() => openRoute("/notifications")}
            >
              <FaBell />
            </button>

          <div className="profile-menu-anchor" ref={profileMenuRef}>
            <button
              className="profile-avatar-btn"
              type="button"
              aria-label="Open profile menu"
              onClick={() => setProfileOpen((v) => !v)}
            >
              {initials}
            </button>
            {profileOpen ? (
              <div className="profile-menu-popover">
                <div className="profile-menu-head">
                  <b>{username}</b>
                  <span>{user?.email || "Account"}</span>
                </div>
                <button type="button" className="profile-menu-item" onClick={() => openRoute("/profile")}>Profile Hub</button>
                <button type="button" className="profile-menu-item" onClick={() => openRoute("/edit-profile")}>Edit Profile</button>
                <button type="button" className="profile-menu-item" onClick={() => openRoute("/settings#display")}>Display Preferences</button>
                <button type="button" className="profile-menu-item" onClick={() => openRoute("/notifications")}>Notifications</button>
                <button type="button" className="profile-menu-item" onClick={() => openRoute("/security")}>Change Password</button>
                <button type="button" className="profile-menu-item is-danger" onClick={handleLogout}>
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="content">
        <BillingNotice />
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <BottomNavItem to="/dashboard" label="Home" icon={<FaTachometerAlt />} />
        <BottomNavItem to="/transactions" label="Spend" icon={<FaReceipt />} />
        <BottomNavItem to="/add-transaction" label="Add" icon={<FaPlusCircle />} center />
        <BottomNavItem to="/coach" label="Coach" icon={<FaUserTie />} />
        <BottomNavItem to="/menu" label="Menu" icon={<FaThLarge />} />
      </nav>

      {searchOpen ? (
        <div className="search-modal-backdrop" onClick={() => setSearchOpen(false)}>
          <div className="search-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-head">
              <div>
                <div className="small">Search</div>
                <h3>Find any feature quickly</h3>
              </div>
              <button type="button" className="icon-btn topbar-icon-btn" onClick={() => setSearchOpen(false)} aria-label="Close search">X</button>
            </div>
            <input
              ref={searchInputRef}
              className="input"
              placeholder="Search budgets, coach, loans, settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="search-results">
              {searchResults.length ? (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="search-result-item"
                    onClick={() => openRoute(item.to)}
                  >
                    <span>{item.label}</span>
                    <span className="small">{item.to}</span>
                  </button>
                ))
              ) : (
                <div className="small muted">No match yet. Try another keyword.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BottomNavItem({ to, label, icon, center = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `bottom-nav-item ${center ? "is-center" : ""} ${isActive ? "active" : ""}`}
    >
      <span className="bottom-nav-icon">{icon}</span>
      <span className="bottom-nav-label">{label}</span>
    </NavLink>
  );
}
