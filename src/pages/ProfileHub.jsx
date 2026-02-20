import { useNavigate } from "react-router-dom";
import { FaBell, FaCog, FaLock, FaPalette, FaSignOutAlt, FaUserEdit } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const PROFILE_LINKS = [
  {
    to: "/edit-profile",
    title: "Edit Profile",
    sub: "Update your name, income and personal setup",
    icon: <FaUserEdit />,
  },
  {
    to: "/settings#display",
    title: "Display Preferences",
    sub: "Theme, dashboard mode and layout controls",
    icon: <FaPalette />,
  },
  {
    to: "/notifications",
    title: "Notifications",
    sub: "View read and unread alerts",
    icon: <FaBell />,
  },
  {
    to: "/security",
    title: "Change Password",
    sub: "Send a secure password reset link",
    icon: <FaLock />,
  },
  {
    to: "/settings",
    title: "General Settings",
    sub: "App behavior and dashboard preferences",
    icon: <FaCog />,
  },
];

export default function ProfileHub() {
  const navigate = useNavigate();
  const { profile, user, logout } = useAuth();
  const username =
    profile?.fullName ||
    profile?.username ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User";

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="page-shell">
      <div className="page-card profile-page-card">
        <div className="page-title-row">
          <h2 className="page-title">Profile Hub</h2>
        </div>
        <p className="page-sub">{username} | {user?.email || "Account"}</p>

        <div className="menu-card-grid" style={{ marginTop: 12 }}>
          {PROFILE_LINKS.map((item) => (
            <button key={item.title} type="button" className="menu-link-card" onClick={() => navigate(item.to)}>
              <span className="menu-link-icon">{item.icon}</span>
              <span className="menu-link-copy">
                <b>{item.title}</b>
                <span>{item.sub}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="section-card" style={{ marginTop: 12 }}>
          <h3 className="section-title">Account Session</h3>
          <button type="button" className="menu-link-card menu-link-danger" onClick={handleLogout}>
            <span className="menu-link-icon"><FaSignOutAlt /></span>
            <span className="menu-link-copy">
              <b>Logout</b>
              <span>End your current session safely</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
