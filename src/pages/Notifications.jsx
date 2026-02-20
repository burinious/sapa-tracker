import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaCheckCircle, FaRegCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../utils/localNotifications";

function whenLabel(iso) {
  const d = new Date(iso || "");
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [filter, setFilter] = useState("unread");
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const refresh = () => setItems(getNotifications(uid));
    refresh();
    window.addEventListener("sapa-notifications", refresh);
    return () => window.removeEventListener("sapa-notifications", refresh);
  }, [uid]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const shown = useMemo(() => {
    if (filter === "read") return items.filter((n) => n.read);
    return items.filter((n) => !n.read);
  }, [items, filter]);

  function openNotification(item) {
    if (!uid || !item) return;
    markNotificationRead(uid, item.id, true);
    if (item.route) navigate(item.route);
  }

  function toggleRead(item) {
    if (!uid || !item) return;
    markNotificationRead(uid, item.id, !item.read);
  }

  return (
    <div className="page-shell">
      <div className="page-card notifications-page-card">
        <div className="page-title-row">
          <span className="page-title-icon"><FaBell /></span>
          <h2 className="page-title">Notifications</h2>
        </div>
        <p className="page-sub">Track updates and switch between unread and read alerts.</p>

        <div className="toolbar" style={{ marginTop: 10 }}>
          <button
            type="button"
            className={`btn settings-chip-btn`}
            data-active={filter === "unread" ? "1" : "0"}
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`btn settings-chip-btn`}
            data-active={filter === "read" ? "1" : "0"}
            onClick={() => setFilter("read")}
          >
            Read ({Math.max(0, items.length - unreadCount)})
          </button>
          <button
            type="button"
            className="btn settings-secondary-btn"
            onClick={() => uid && markAllNotificationsRead(uid)}
            disabled={!uid || unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>

        <div className="list-stack" style={{ marginTop: 12 }}>
          {shown.length ? (
            shown.map((item) => (
              <div key={item.id} className="list-card notifications-item-card">
                <div className="list-top">
                  <div className="list-title">{item.title || "Notification"}</div>
                  <div className="small">{whenLabel(item.createdAtISO)}</div>
                </div>
                <div className="small muted" style={{ marginTop: 6 }}>{item.body || "No details."}</div>
                <div className="toolbar" style={{ marginTop: 8 }}>
                  <button type="button" className="btn" onClick={() => openNotification(item)}>
                    Open
                  </button>
                  <button type="button" className="btn settings-secondary-btn" onClick={() => toggleRead(item)}>
                    {item.read ? <><FaRegCircle /> Mark unread</> : <><FaCheckCircle /> Mark read</>}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="list-card">
              <div className="list-title">No {filter} notifications</div>
              <div className="small muted" style={{ marginTop: 6 }}>
                New coach and push updates will appear here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
