import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaBook,
  FaCog,
  FaPlusCircle,
  FaReceipt,
  FaSearch,
  FaShieldAlt,
  FaShoppingBasket,
  FaSignOutAlt,
  FaSlidersH,
  FaThLarge,
  FaTachometerAlt,
  FaUserCircle,
  FaUserTie,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import BillingNotice from "./BillingNotice";
import SapaLogo from "./brand/SapaLogo";
import "../styles/app.css";

const SEARCH_LINKS = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/dashboard",
    section: "Overview",
    description: "Risk bar, summary cards, quick links.",
    keywords: "home overview cards risk sapa",
    featured: 100,
    icon: FaTachometerAlt,
  },
  {
    id: "add-transaction",
    label: "Add Transaction",
    to: "/add-transaction",
    section: "Money",
    description: "Quickly add expense or income.",
    keywords: "expense income add money transaction",
    featured: 95,
    icon: FaPlusCircle,
  },
  {
    id: "transactions",
    label: "Transactions",
    to: "/transactions",
    section: "Money",
    description: "Review and search spending history.",
    keywords: "spending history review records",
    featured: 92,
    icon: FaReceipt,
  },
  {
    id: "coach",
    label: "Coach",
    to: "/coach",
    section: "Insights",
    description: "See current Sapa risk and actions.",
    keywords: "advisor sapa risk ai suggestions",
    featured: 88,
    icon: FaUserTie,
  },
  {
    id: "budgets",
    label: "Budgets",
    to: "/budgets",
    section: "Planning",
    description: "Set monthly and category targets.",
    keywords: "budget daily target monthly limit",
    featured: 85,
    icon: FaSlidersH,
  },
  {
    id: "house-shopping",
    label: "House Shopping",
    to: "/house-shopping",
    section: "Planning",
    description: "Shopping list, presets, export PDF/image.",
    keywords: "shopping list house groceries export",
    featured: 84,
    icon: FaShoppingBasket,
  },
  {
    id: "loans",
    label: "Loans",
    to: "/loans",
    section: "Money",
    description: "Track debts and repayment progress.",
    keywords: "debt repayment loan balances",
    featured: 82,
    icon: FaReceipt,
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    to: "/subscriptions",
    section: "Money",
    description: "Manage recurring bills and dues.",
    keywords: "bills due recurring subscriptions",
    featured: 80,
    icon: FaReceipt,
  },
  {
    id: "entries",
    label: "Entries",
    to: "/entries",
    section: "Journal",
    description: "Daily notes and reflection entries.",
    keywords: "journal notes habits writing",
    featured: 72,
    icon: FaBook,
  },
  {
    id: "ai",
    label: "SAPA A.I",
    to: "/ai",
    section: "Insights",
    description: "AI analysis and financial assistant.",
    keywords: "analysis assistant ai sapa",
    featured: 74,
    icon: FaUserTie,
  },
  {
    id: "menu",
    label: "Menu",
    to: "/menu",
    section: "Navigation",
    description: "Open all feature cards from one page.",
    keywords: "all features links cards",
    featured: 70,
    icon: FaThLarge,
  },
  {
    id: "notifications-page",
    label: "Notifications Inbox",
    to: "/notifications",
    section: "Account",
    description: "Read/unread notifications feed.",
    keywords: "read unread inbox alerts updates",
    featured: 70,
    icon: FaBell,
  },
  {
    id: "profile",
    label: "Profile Hub",
    to: "/profile",
    section: "Account",
    description: "Profile summary and preferences.",
    keywords: "profile account security settings",
    featured: 68,
    icon: FaUserCircle,
  },
  {
    id: "edit-profile",
    label: "Edit Profile",
    to: "/edit-profile",
    section: "Account",
    description: "Update salary, cash at hand, and gigs.",
    keywords: "income salary cash gigs profile details",
    featured: 66,
    icon: FaUserCircle,
  },
  {
    id: "settings",
    label: "Settings",
    to: "/settings",
    section: "Account",
    description: "Theme, dashboard and app settings.",
    keywords: "preferences theme display settings",
    featured: 64,
    icon: FaCog,
  },
  {
    id: "settings-display",
    label: "Display Preferences",
    to: "/settings#display",
    section: "Account",
    description: "Change look, display and themes.",
    keywords: "display preferences widgets theme",
    featured: 63,
    icon: FaSlidersH,
  },
  {
    id: "settings-notifications",
    label: "Notification Settings",
    to: "/settings#notifications",
    section: "Account",
    description: "Control push alerts and reminders.",
    keywords: "push notifications alerts reminders",
    featured: 62,
    icon: FaBell,
  },
  {
    id: "security",
    label: "Change Password",
    to: "/security",
    section: "Security",
    description: "Update your password and account security.",
    keywords: "password security reset account",
    featured: 60,
    icon: FaShieldAlt,
  },
];

function scoreSearch(item, query) {
  if (!query) return item.featured || 0;
  const q = query.trim().toLowerCase();
  if (!q) return item.featured || 0;

  const label = item.label.toLowerCase();
  const section = item.section.toLowerCase();
  const desc = item.description.toLowerCase();
  const keywords = item.keywords.toLowerCase();
  const route = item.to.toLowerCase();
  const labelWords = label.split(/\s+/).filter(Boolean);
  const tokens = q.split(/\s+/).filter(Boolean);

  let score = 0;
  if (label === q) score += 140;
  if (label.startsWith(q)) score += 95;
  if (label.includes(q)) score += 70;
  if (keywords.includes(q)) score += 44;
  if (desc.includes(q)) score += 32;
  if (section.includes(q)) score += 20;
  if (route.includes(q)) score += 12;

  for (const token of tokens) {
    if (label.includes(token)) score += 24;
    if (desc.includes(token)) score += 14;
    if (keywords.includes(token)) score += 12;
    if (section.includes(token)) score += 9;
    if (route.includes(token)) score += 7;
    if (labelWords.some((w) => w.startsWith(token))) score += 8;
  }

  return score;
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, profile, user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchInputRef = useRef(null);
  const profileMenuRef = useRef(null);

  const username =
    profile?.fullName ||
    user?.displayName ||
    profile?.username ||
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
    const ranked = SEARCH_LINKS
      .map((item) => ({ ...item, score: scoreSearch(item, q) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.label.localeCompare(b.label);
      });

    if (!q) return ranked.slice(0, 10);
    return ranked.filter((item) => item.score > 0).slice(0, 12);
  }, [searchQuery]);

  useEffect(() => {
    setProfileOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchActiveIndex(0);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    setSearchActiveIndex(0);
  }, [searchQuery, searchResults.length, searchOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 40);
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        return;
      }
      if (!searchResults.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSearchActiveIndex((idx) => (idx + 1) % searchResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSearchActiveIndex((idx) => (idx - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const next = searchResults[searchActiveIndex] || searchResults[0];
        if (!next) return;
        navigate(next.to);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchOpen, searchResults, searchActiveIndex, navigate]);

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
                <div className="small">Smart Search</div>
                <h3>Find any feature quickly</h3>
              </div>
              <button type="button" className="icon-btn topbar-icon-btn" onClick={() => setSearchOpen(false)} aria-label="Close search">X</button>
            </div>

            <div className="search-input-wrap">
              <input
                ref={searchInputRef}
                className="input"
                placeholder="Search budget reset, shopping export, profile salary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="small muted">
                {searchResults.length} result{searchResults.length === 1 ? "" : "s"} • Enter to open • ↑↓ to move • Ctrl/Cmd+K
              </div>
            </div>

            <div className="search-results">
              {searchResults.length ? (
                searchResults.map((item, idx) => {
                  const Icon = item.icon || FaSearch;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`search-result-item ${idx === searchActiveIndex ? "is-active" : ""}`}
                      onMouseEnter={() => setSearchActiveIndex(idx)}
                      onClick={() => openRoute(item.to)}
                    >
                      <span className="search-result-main">
                        <span className="search-result-icon"><Icon /></span>
                        <span className="search-result-copy">
                          <span className="search-result-title">{item.label}</span>
                          <span className="search-result-desc">{item.description}</span>
                        </span>
                      </span>
                      <span className="search-result-meta">
                        <span className="search-section-chip">{item.section}</span>
                        <span className="small search-route">{item.to}</span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="small muted">No match yet. Try keywords like budget, shopping, coach, profile, or notifications.</div>
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
