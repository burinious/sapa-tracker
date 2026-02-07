import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import "../styles/app.css";

export default function Register() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return toast.error("Email and password are required");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setBusy(true);
    try {
      await signup(email.trim(), password, {
        name: name.trim(),
        storeName: storeName.trim() || "My Sapa Tracker",
      });
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
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:16 }}>
      <div className="card" style={{ width:"100%", maxWidth:460 }}>
        <h1 style={{ margin:0 }}>Create Account</h1>
        <p className="small" style={{ marginTop:6 }}>Set up your Sapa Tracker</p>

        <form onSubmit={handleSubmit} style={{ display:"grid", gap:10, marginTop:12 }}>
          <label className="small">Your Name</label>
          <input className="input" value={name} onChange={(e)=>setName(e.target.value)} />

          <label className="small">Store / Profile Name</label>
          <input className="input" value={storeName} onChange={(e)=>setStoreName(e.target.value)} />

          <label className="small">Email</label>
          <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />

          <label className="small">Password</label>
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />

          <button className="btn" disabled={busy}>{busy ? "Creating..." : "Create account"}</button>
        </form>

        <p className="small" style={{ marginTop:12 }}>
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}
