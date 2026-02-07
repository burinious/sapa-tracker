import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import "../styles/app.css";

export default function Login() {
  const { login } = useAuth();
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
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:16 }}>
      <div className="card" style={{ width:"100%", maxWidth:420 }}>
        <h1 style={{ margin:0 }}>Sapa Tracker</h1>
        <p className="small" style={{ marginTop:6 }}>Login to continue</p>

        <form onSubmit={handleSubmit} style={{ display:"grid", gap:10, marginTop:12 }}>
          <label className="small">Email</label>
          <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />

          <label className="small">Password</label>
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />

          <button className="btn" disabled={busy}>{busy ? "Logging in..." : "Login"}</button>
        </form>

        <p className="small" style={{ marginTop:12 }}>
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
