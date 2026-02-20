import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import SapaLogo from "../components/brand/SapaLogo";
import "../styles/app.css";

export default function Login() {
  const { login, setupError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return toast.error("Enter email and password");
    try {
      setBusy(true);
      await login(email.trim(), password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.message || "Login failed");
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
          <h1 className="page-title">Welcome back</h1>
        </div>
        <p className="small page-sub">Login to continue</p>
        {setupError ? (
          <p className="note-warn">
            Firebase setup error: {setupError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="page-stack-md" style={{ marginTop: 12 }}>
          <label className="small">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="small">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div>
            <Link className="small" to="/reset-password">Forgot password?</Link>
          </div>

          <button className="btn" disabled={busy || !!setupError}>{busy ? "Logging in..." : "Login"}</button>
        </form>

        <p className="small page-sub" style={{ marginTop: 12 }}>
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
