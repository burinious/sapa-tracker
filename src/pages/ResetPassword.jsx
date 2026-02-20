import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import SapaLogo from "../components/brand/SapaLogo";
import "../styles/app.css";

export default function ResetPassword() {
  const { resetPassword, setupError } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your email");
    try {
      setBusy(true);
      await resetPassword(email.trim());
      setSent(true);
      toast.success("Password reset email sent");
    } catch (err) {
      toast.error(err?.message || "Could not send reset email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-brand-row">
          <SapaLogo size={30} showWordmark className="auth-logo" />
        </div>
        <div className="page-title-row">
          <h1 className="page-title">Reset Password</h1>
        </div>
        <p className="small page-sub">Enter your account email to receive a reset link.</p>
        {setupError ? (
          <p className="note-warn">
            Firebase setup error: {setupError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="page-stack-md" style={{ marginTop: 12 }}>
          <label className="small">Email</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn" disabled={busy || !!setupError}>
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {sent ? (
          <p className="small page-sub" style={{ marginTop: 12 }}>
            Check your inbox and spam folder for the reset email.
          </p>
        ) : null}

        <p className="small page-sub" style={{ marginTop: 12 }}>
          Remembered your password? <Link to="/">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
