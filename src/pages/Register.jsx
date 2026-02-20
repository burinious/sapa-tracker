import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import SapaLogo from "../components/brand/SapaLogo";
import "../styles/app.css";

export default function Register() {
  const { register, setupError } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return toast.error("Email and password are required");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setBusy(true);
    try {
      await register(email.trim(), password, username.trim());
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      console.error("SIGNUP ERROR:", err);
      toast.error(err?.message || "Registration failed");
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
          <h1 className="page-title">Create Account</h1>
        </div>
        <p className="small page-sub">Set up your Sapa Tracker</p>
        {setupError ? (
          <p className="note-warn">
            Firebase setup error: {setupError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="page-stack-md" style={{ marginTop: 12 }}>
          <label className="small">Username</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />

          <label className="small">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="small">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <button className="btn" disabled={busy || !!setupError}>{busy ? "Creating..." : "Create account"}</button>
        </form>

        <p className="small page-sub" style={{ marginTop: 12 }}>
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}
