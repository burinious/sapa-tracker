import { useState } from "react";
import { toast } from "react-toastify";
import { FaLock } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

export default function SecurityPage() {
  const { user, resetPassword } = useAuth();
  const [busy, setBusy] = useState(false);
  const email = user?.email || "";

  async function sendResetLink() {
    if (!email) {
      toast.error("No account email found.");
      return;
    }
    try {
      setBusy(true);
      await resetPassword(email);
      toast.success("Password reset link sent to your email.");
    } catch (err) {
      toast.error(err?.message || "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="page-card security-page-card">
        <div className="page-title-row">
          <span className="page-title-icon"><FaLock /></span>
          <h2 className="page-title">Security</h2>
        </div>
        <p className="page-sub">Manage password and account protection options.</p>

        <div className="section-card" style={{ marginTop: 12 }}>
          <h3 className="section-title">Change Password</h3>
          <p className="small muted">
            For security, we send a reset link to your account email.
          </p>
          <label className="small" style={{ marginTop: 8, display: "block" }}>Account Email</label>
          <input className="input" value={email} disabled />
          <div className="toolbar">
            <button className="btn" type="button" onClick={sendResetLink} disabled={busy || !email}>
              {busy ? "Sending..." : "Send Password Reset Link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
