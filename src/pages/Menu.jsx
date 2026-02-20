import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaBook,
  FaCog,
  FaHandHoldingUsd,
  FaHome,
  FaPlusCircle,
  FaReceipt,
  FaRegCreditCard,
  FaRobot,
  FaShoppingBasket,
  FaSignOutAlt,
  FaUserCircle,
  FaUserTie,
  FaWallet,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const MENU_SECTIONS = [
  {
    title: "Core",
    items: [
      { to: "/dashboard", label: "Dashboard", sub: "Main money overview", icon: <FaHome /> },
      { to: "/add-transaction", label: "Add Transaction", sub: "Log income or expense", icon: <FaPlusCircle /> },
      { to: "/transactions", label: "Transactions", sub: "Review all spending", icon: <FaReceipt /> },
    ],
  },
  {
    title: "Money Tools",
    items: [
      { to: "/coach", label: "Coach", sub: "See your sapa risk", icon: <FaUserTie /> },
      { to: "/budgets", label: "Budgets", sub: "Set monthly limits", icon: <FaWallet /> },
      { to: "/loans", label: "Loans", sub: "Track debt and repayment", icon: <FaHandHoldingUsd /> },
      { to: "/subscriptions", label: "Subscriptions", sub: "Manage recurring bills", icon: <FaRegCreditCard /> },
    ],
  },
  {
    title: "More Tools",
    items: [
      { to: "/entries", label: "Entries", sub: "Daily notes and check-ins", icon: <FaBook /> },
      { to: "/house-shopping", label: "House Shopping", sub: "Shopping and inventory list", icon: <FaShoppingBasket /> },
      { to: "/ai", label: "SAPA A.I", sub: "AI analysis and support", icon: <FaRobot /> },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/profile", label: "Profile Hub", sub: "Profile and security center", icon: <FaUserCircle /> },
      { to: "/edit-profile", label: "Edit Profile", sub: "Update your account details", icon: <FaUserCircle /> },
      { to: "/notifications", label: "Notifications", sub: "Read and unread alerts", icon: <FaBell /> },
      { to: "/settings", label: "Settings", sub: "Display and notifications", icon: <FaCog /> },
    ],
  },
];

export default function MenuPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="page-shell">
      <div className="page-card menu-page-card">
        <div className="page-title-row">
          <h2 className="page-title">Menu</h2>
        </div>
        <p className="page-sub">Everything from the old sidebar is here as quick cards.</p>

        <div className="menu-section-stack">
          {MENU_SECTIONS.map((section) => (
            <section key={section.title} className="section-card">
              <h3 className="section-title">{section.title}</h3>
              <div className="menu-card-grid">
                {section.items.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    className="menu-link-card"
                    onClick={() => navigate(item.to)}
                  >
                    <span className="menu-link-icon">{item.icon}</span>
                    <span className="menu-link-copy">
                      <b>{item.label}</b>
                      <span>{item.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="section-card" style={{ marginTop: 12 }}>
          <h3 className="section-title">Session</h3>
          <button type="button" className="menu-link-card menu-link-danger" onClick={handleLogout}>
            <span className="menu-link-icon"><FaSignOutAlt /></span>
            <span className="menu-link-copy">
              <b>Logout</b>
              <span>Sign out from your account</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
