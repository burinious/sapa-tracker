set -e

mkdir -p src/{context,components,pages,utils,styles,constants}

# ---------------------------
# AuthContext (Firestore-safe fallback: local-only when billing off)
# ---------------------------
cat > src/context/AuthContext.jsx <<'EOF'
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const AuthContext = createContext(null);

const localKey = (uid) => `sapa_profile_${uid}`;

function getLocalProfile(uid) {
  try {
    const raw = localStorage.getItem(localKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalProfile(uid, profile) {
  try {
    localStorage.setItem(localKey(uid), JSON.stringify(profile));
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function tryFirestore(fn) {
    try {
      return await fn();
    } catch (err) {
      console.warn("Firestore unavailable (local-only mode):", err?.message || err);
      return null;
    }
  }

  async function signup(email, password, extra = {}) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    if (extra?.name) {
      await updateProfile(cred.user, { displayName: extra.name });
    }

    const baseProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      name: extra?.name || cred.user.displayName || "",
      storeName: extra?.storeName || "My Sapa Tracker",
      logoUrl: extra?.logoUrl || "",
      cashAtHand: 0,
      createdAtISO: new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
      cloudEnabled: false,
    };

    const userRef = doc(db, "users", cred.user.uid);

    const ok = await tryFirestore(() =>
      setDoc(userRef, {
        uid: baseProfile.uid,
        email: baseProfile.email,
        name: baseProfile.name,
        storeName: baseProfile.storeName,
        logoUrl: baseProfile.logoUrl,
        cashAtHand: baseProfile.cashAtHand,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    if (ok === null) {
      setLocalProfile(cred.user.uid, baseProfile);
      setProfile(baseProfile);
    }

    return cred.user;
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
  }

  async function updateUserProfile(updates = {}) {
    if (!auth.currentUser) throw new Error("Not authenticated");

    if (typeof updates.name === "string") {
      await updateProfile(auth.currentUser, { displayName: updates.name });
    }

    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);

    const ok = await tryFirestore(() =>
      updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() })
    );

    if (ok !== null) {
      const snap = await tryFirestore(() => getDoc(userRef));
      if (snap && snap.exists()) {
        setProfile({ ...snap.data(), cloudEnabled: true });
        return;
      }
    }

    const current = getLocalProfile(uid) || {
      uid,
      email: auth.currentUser.email || "",
      name: auth.currentUser.displayName || "",
      storeName: "My Sapa Tracker",
      logoUrl: "",
      cashAtHand: 0,
      createdAtISO: new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
      cloudEnabled: false,
    };

    const next = { ...current, ...updates, updatedAtISO: new Date().toISOString() };
    setLocalProfile(uid, next);
    setProfile(next);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      try {
        if (u) {
          const uid = u.uid;
          const userRef = doc(db, "users", uid);
          const snap = await tryFirestore(() => getDoc(userRef));

          if (snap && snap.exists()) {
            setProfile({ ...snap.data(), cloudEnabled: true });
          } else {
            const local = getLocalProfile(uid);
            if (local) setProfile(local);
            else {
              const minimal = {
                uid,
                email: u.email || "",
                name: u.displayName || "",
                storeName: "My Sapa Tracker",
                logoUrl: "",
                cashAtHand: 0,
                createdAtISO: new Date().toISOString(),
                updatedAtISO: new Date().toISOString(),
                cloudEnabled: false,
              };
              setLocalProfile(uid, minimal);
              setProfile(minimal);
            }

            await tryFirestore(() =>
              setDoc(userRef, {
                uid,
                email: u.email || "",
                name: u.displayName || "",
                storeName: "My Sapa Tracker",
                logoUrl: "",
                cashAtHand: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            );
          }
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, signup, login, logout, updateUserProfile, setProfile }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
EOF

# ---------------------------
# Local finance + subscriptions + shopping (per-user)
# ---------------------------
cat > src/utils/localStore.js <<'EOF'
const key = (uid, name) => `sapa_${uid}_${name}`;

export function read(uid, name, fallback) {
  try {
    const raw = localStorage.getItem(key(uid, name));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function write(uid, name, value) {
  try {
    localStorage.setItem(key(uid, name), JSON.stringify(value));
  } catch {}
}
EOF

cat > src/utils/localFinance.js <<'EOF'
import { read, write } from "./localStore";

export function getFinance(uid) {
  return read(uid, "finance", { cashAtHand: 0, transactions: [] });
}

export function setCash(uid, cashAtHand) {
  const state = getFinance(uid);
  const next = { ...state, cashAtHand: Number(cashAtHand || 0) };
  write(uid, "finance", next);
  return next;
}

export function addTransaction(uid, tx) {
  const state = getFinance(uid);
  const amount = Number(tx.amount || 0);
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");
  if (tx.type !== "income" && tx.type !== "expense") throw new Error("Type must be income or expense");

  const delta = tx.type === "income" ? amount : -amount;
  const nextCash = Number(state.cashAtHand || 0) + delta;

  const nextTx = {
    id: crypto?.randomUUID?.() || String(Date.now()),
    type: tx.type,
    amount,
    categoryName: (tx.categoryName || "").trim(),
    note: (tx.note || "").trim(),
    dateISO: new Date().toISOString(),
    createdAtISO: new Date().toISOString(),
  };

  const next = {
    cashAtHand: nextCash,
    transactions: [nextTx, ...(state.transactions || [])],
  };

  write(uid, "finance", next);
  return next;
}
EOF

cat > src/utils/localSubscriptions.js <<'EOF'
import { read, write } from "./localStore";

export function getSubscriptions(uid) {
  return read(uid, "subscriptions", []);
}

export function addSubscription(uid, sub) {
  const list = getSubscriptions(uid);
  const next = [{
    id: crypto?.randomUUID?.() || String(Date.now()),
    name: (sub.name || "").trim(),
    amount: Number(sub.amount || 0),
    dueDay: Number(sub.dueDay || 1), // day of month
    status: "active", // active | postponed | paid
    lastActionISO: null,
    createdAtISO: new Date().toISOString(),
  }, ...list];
  write(uid, "subscriptions", next);
  return next;
}

export function updateSubscription(uid, id, patch) {
  const list = getSubscriptions(uid);
  const next = list.map((s) => s.id === id ? { ...s, ...patch, lastActionISO: new Date().toISOString() } : s);
  write(uid, "subscriptions", next);
  return next;
}
EOF

cat > src/utils/localShopping.js <<'EOF'
import { read, write } from "./localStore";

export function getShopping(uid) {
  return read(uid, "shopping", []);
}

export function addShoppingItem(uid, item) {
  const list = getShopping(uid);
  const next = [{
    id: crypto?.randomUUID?.() || String(Date.now()),
    name: (item.name || "").trim(),
    qty: Number(item.qty || 1),
    price: Number(item.price || 0),
    category: (item.category || "General").trim(),
    createdAtISO: new Date().toISOString(),
  }, ...list];
  write(uid, "shopping", next);
  return next;
}

export function removeShoppingItem(uid, id) {
  const list = getShopping(uid);
  const next = list.filter((x) => x.id !== id);
  write(uid, "shopping", next);
  return next;
}
EOF

# ---------------------------
# Billing reminder banner
# ---------------------------
cat > src/components/BillingNotice.jsx <<'EOF'
import { useAuth } from "../context/AuthContext";

export default function BillingNotice() {
  const { profile } = useAuth();
  const cloudEnabled = Boolean(profile?.cloudEnabled);

  if (cloudEnabled) return null;

  return (
    <div style={{
      padding: "10px 12px",
      background: "rgba(255,165,0,0.15)",
      border: "1px solid rgba(255,165,0,0.40)",
      color: "#ffd28a",
      borderRadius: 12,
      marginBottom: 12,
      fontSize: 13
    }}>
      ⚠️ Cloud sync disabled (Firestore needs billing). You’re in local-only mode for now.
    </div>
  );
}
EOF

# ---------------------------
# Minimal app styling (nice enough)
# ---------------------------
cat > src/styles/app.css <<'EOF'
:root{
  --bg:#0b0f17; --card:#121a27; --text:#e9eef7; --muted:#9aa6b2;
  --line:rgba(255,255,255,0.08); --primary:#4f8cff; --danger:#ff4d4d;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
a{color:var(--primary);text-decoration:none}
a:hover{text-decoration:underline}
.app-shell{min-height:100vh}
.topbar{
  position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;
  padding:12px 14px;background:rgba(11,15,23,.9);backdrop-filter:blur(10px);
  border-bottom:1px solid var(--line)
}
.icon-btn{border:1px solid var(--line);background:transparent;color:var(--text);border-radius:10px;padding:10px 12px;cursor:pointer}
.logout-btn{margin-left:auto;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:12px;padding:10px 14px;cursor:pointer}
.topbar-title{display:flex;flex-direction:column;line-height:1.1}
.app-name{font-weight:800}
.app-sub{font-size:12px;color:var(--muted)}
.backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:9}
.backdrop.show{opacity:1;pointer-events:auto}
.sidebar{
  position:fixed;top:0;left:0;height:100vh;width:290px;background:var(--card);
  border-right:1px solid var(--line);transform:translateX(-105%);transition:transform .22s ease;
  z-index:10;display:flex;flex-direction:column
}
.sidebar.open{transform:translateX(0)}
.sidebar-head{display:flex;align-items:center;justify-content:space-between;padding:14px;border-bottom:1px solid var(--line)}
.brand{font-weight:900}
.nav{padding:10px;display:grid;gap:8px}
.nav-link{
  display:block;padding:12px;border-radius:14px;color:var(--text);border:1px solid transparent;
  background:rgba(255,255,255,.03)
}
.nav-link.active{border-color:rgba(79,140,255,.35);background:rgba(79,140,255,.12)}
.sidebar-foot{margin-top:auto;padding:14px;border-top:1px solid var(--line)}
.danger-btn{width:100%;border:1px solid rgba(255,77,77,.35);background:rgba(255,77,77,.12);color:var(--text);padding:12px;border-radius:14px;cursor:pointer}
.content{padding:16px;max-width:1100px;margin:0 auto}
.card{
  border:1px solid var(--line);background:rgba(255,255,255,.03);border-radius:16px;padding:14px
}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.input{
  padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);
  background:transparent;color:inherit;outline:none;width:100%
}
.btn{
  padding:12px 14px;border-radius:12px;border:1px solid rgba(79,140,255,.35);
  background:rgba(79,140,255,.12);color:inherit;cursor:pointer
}
.btn:disabled{opacity:.6;cursor:not-allowed}
.small{font-size:12px;color:var(--muted)}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
EOF

# ---------------------------
# Layout + Sidebar routes (includes House Shopping, Subscriptions, AI Chat)
# ---------------------------
cat > src/components/Layout.jsx <<'EOF'
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import BillingNotice from "./BillingNotice";
import "../styles/app.css";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { logout, profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const storeName = profile?.storeName || "Sapa Tracker";

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
        <div className="topbar-title">
          <div className="app-name">{storeName}</div>
          <div className="app-sub">Finance • Inventory • Habits</div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <div className={`backdrop ${open ? "show" : ""}`} onClick={() => setOpen(false)} />

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <div className="brand">{storeName}</div>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
        </div>

        <nav className="nav">
          <NavItem to="/dashboard" label="Dashboard" onClick={() => setOpen(false)} />
          <NavItem to="/add-transaction" label="Add Transaction" onClick={() => setOpen(false)} />
          <NavItem to="/transactions" label="Transactions" onClick={() => setOpen(false)} />
          <NavItem to="/house-shopping" label="House Shopping" onClick={() => setOpen(false)} />
          <NavItem to="/subscriptions" label="Subscriptions" onClick={() => setOpen(false)} />
          <NavItem to="/ai" label="Sapa Tracker AI" onClick={() => setOpen(false)} />
          <NavItem to="/edit-profile" label="Edit Profile" onClick={() => setOpen(false)} />
        </nav>

        <div className="sidebar-foot">
          <button className="danger-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="content">
        <BillingNotice />
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
    >
      {label}
    </NavLink>
  );
}
EOF

# ---------------------------
# ProtectedRoute
# ---------------------------
cat > src/components/ProtectedRoute.jsx <<'EOF'
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><p>Loading...</p></div>;
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
}
EOF

# ---------------------------
# App routing
# ---------------------------
cat > src/App.jsx <<'EOF'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import AddTransaction from "./pages/AddTransaction";
import HouseShopping from "./pages/HouseShopping";
import Subscriptions from "./pages/Subscriptions";
import EditProfile from "./pages/EditProfile";
import SapaAI from "./pages/SapaAI";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={2500} />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/add-transaction" element={<AddTransaction />} />
            <Route path="/house-shopping" element={<HouseShopping />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/ai" element={<SapaAI />} />
            <Route path="/edit-profile" element={<EditProfile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
EOF

# ---------------------------
# Pages: Login/Register (auth works even without Firestore)
# ---------------------------
cat > src/pages/Login.jsx <<'EOF'
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
EOF

cat > src/pages/Register.jsx <<'EOF'
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
EOF

# ---------------------------
# Dashboard (local summary)
# ---------------------------
cat > src/pages/Dashboard.jsx <<'EOF'
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getFinance } from "../utils/localFinance";
import "../styles/app.css";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const finance = getFinance(user.uid);

  const startOfMonthISO = useMemo(() => {
    const d = new Date();
    d.setDate(1); d.setHours(0,0,0,0);
    return d.toISOString();
  }, []);

  const monthTx = (finance.transactions || []).filter((t) => (t.dateISO || "") >= startOfMonthISO);

  let income = 0, expense = 0;
  const cat = new Map();

  for (const t of monthTx) {
    const amt = Number(t.amount || 0);
    if (t.type === "income") income += amt;
    if (t.type === "expense") {
      expense += amt;
      const name = (t.categoryName || "Uncategorized").trim() || "Uncategorized";
      cat.set(name, (cat.get(name) || 0) + amt);
    }
  }

  let top = null;
  for (const [name, amount] of cat.entries()) if (!top || amount > top.amount) top = { name, amount };

  const cashAtHand = Number(profile?.cashAtHand ?? finance.cashAtHand ?? 0);
  const net = income - expense;

  return (
    <div style={{ display:"grid", gap:14 }}>
      <h2 style={{ margin:0 }}>Dashboard</h2>

      <div className="grid">
        <Stat title="Cash at hand" value={formatMoney(cashAtHand)} sub="Your current reality" />
        <Stat title="Income (this month)" value={formatMoney(income)} sub="Inflows this month" />
        <Stat title="Expenses (this month)" value={formatMoney(expense)} sub="Outflows this month" />
        <Stat title="Net (this month)" value={formatMoney(net)} sub={net >= 0 ? "Positive" : "Negative"} />
      </div>

      <div className="card">
        <div style={{ fontWeight:800, marginBottom:6 }}>Top drainer (this month)</div>
        {top ? (
          <div><b>{top.name}</b> — {formatMoney(top.amount)}</div>
        ) : (
          <div className="small">No expenses yet. Add a transaction to begin.</div>
        )}
      </div>

      <div className="card">
        <div style={{ fontWeight:800, marginBottom:6 }}>What Sapa Tracker AI will do later</div>
        <div className="small">
          Explain spending patterns, predict “sapa days”, recommend what to reduce, and help plan purchases & subscriptions.
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value, sub }) {
  return (
    <div className="card">
      <div className="small">{title}</div>
      <div style={{ fontSize:22, fontWeight:900, marginTop:6 }}>{value}</div>
      <div className="small" style={{ marginTop:6 }}>{sub}</div>
    </div>
  );
}

function formatMoney(n) {
  const num = Number(n || 0);
  return `₦${num.toLocaleString("en-NG")}`;
}
EOF

# ---------------------------
# Add Transaction (local)
# ---------------------------
cat > src/pages/AddTransaction.jsx <<'EOF'
import { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addTransaction, getFinance } from "../utils/localFinance";
import "../styles/app.css";

export default function AddTransaction() {
  const { user, profile, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setBusy(true);
      const next = addTransaction(user.uid, { type, amount, categoryName, note });

      // keep profile.cashAtHand in sync even in local-only mode
      if (profile && typeof updateUserProfile === "function") {
        await updateUserProfile({ cashAtHand: next.cashAtHand });
      }

      toast.success("Saved. Cash updated.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const currentCash = profile?.cashAtHand ?? getFinance(user.uid).cashAtHand ?? 0;

  return (
    <div style={{ maxWidth:520 }}>
      <h2>Add Transaction</h2>
      <p className="small">Current cash at hand: <b>₦{Number(currentCash).toLocaleString("en-NG")}</b></p>

      <form onSubmit={handleSubmit} style={{ display:"grid", gap:10 }}>
        <label className="small">Type</label>
        <select className="input" value={type} onChange={(e)=>setType(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <label className="small">Amount (₦)</label>
        <input className="input" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="e.g. 5000" inputMode="numeric" />

        <label className="small">Category (optional)</label>
        <input className="input" value={categoryName} onChange={(e)=>setCategoryName(e.target.value)} placeholder="Food, Transport, Data..." />

        <label className="small">Note (optional)</label>
        <input className="input" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="What was it for?" />

        <button className="btn" disabled={busy}>{busy ? "Saving..." : "Save Transaction"}</button>
      </form>
    </div>
  );
}
EOF

# ---------------------------
# Transactions list (local)
# ---------------------------
cat > src/pages/Transactions.jsx <<'EOF'
import { useAuth } from "../context/AuthContext";
import { getFinance } from "../utils/localFinance";
import "../styles/app.css";

export default function Transactions() {
  const { user } = useAuth();
  const finance = getFinance(user.uid);
  const tx = finance.transactions || [];

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div className="row" style={{ justifyContent:"space-between" }}>
        <h2 style={{ margin:0 }}>Transactions</h2>
        <div className="small">{tx.length} total</div>
      </div>

      {tx.length === 0 ? (
        <div className="card"><div className="small">No transactions yet. Add your first one.</div></div>
      ) : (
        tx.map((t) => (
          <div key={t.id} className="card">
            <div className="row" style={{ justifyContent:"space-between" }}>
              <b>{t.type === "income" ? "Income" : "Expense"}</b>
              <b>₦{Number(t.amount).toLocaleString("en-NG")}</b>
            </div>
            <div className="small" style={{ marginTop:6 }}>
              {(t.categoryName || "Uncategorized")} • {new Date(t.dateISO).toLocaleString()}
            </div>
            {t.note ? <div style={{ marginTop:8 }}>{t.note}</div> : null}
          </div>
        ))
      )}
    </div>
  );
}
EOF

# ---------------------------
# House Shopping (local) - PDF later (we'll integrate when you choose library)
# ---------------------------
cat > src/pages/HouseShopping.jsx <<'EOF'
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { addShoppingItem, getShopping, removeShoppingItem } from "../utils/localShopping";
import "../styles/app.css";

export default function HouseShopping() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Household");
  const [tick, setTick] = useState(0);

  const items = getShopping(user.uid);

  const total = items.reduce((s, x) => s + (Number(x.price||0) * Number(x.qty||1)), 0);

  function add(e) {
    e.preventDefault();
    addShoppingItem(user.uid, { name, qty, price, category });
    setName(""); setQty(1); setPrice("");
    setTick((t)=>t+1);
  }

  function del(id) {
    removeShoppingItem(user.uid, id);
    setTick((t)=>t+1);
  }

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div className="row" style={{ justifyContent:"space-between" }}>
        <h2 style={{ margin:0 }}>House Shopping</h2>
        <div className="small">Total: <b>₦{total.toLocaleString("en-NG")}</b></div>
      </div>

      <div className="card">
        <div style={{ fontWeight:800, marginBottom:6 }}>Add item</div>
        <form onSubmit={add} style={{ display:"grid", gap:10 }}>
          <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. Detergent, Air freshener..." />
          <div className="row">
            <input className="input" value={qty} onChange={(e)=>setQty(e.target.value)} placeholder="Qty" inputMode="numeric" />
            <input className="input" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="Price (₦)" inputMode="numeric" />
          </div>
          <input className="input" value={category} onChange={(e)=>setCategory(e.target.value)} placeholder="Category e.g. Kitchen, Bathroom" />
          <button className="btn">Add to list</button>
          <div className="small">PDF export: coming next (beautiful shopping PDF with totals & categories).</div>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="card"><div className="small">No shopping items yet. Add your first one.</div></div>
      ) : (
        items.map((x) => (
          <div key={x.id} className="card">
            <div className="row" style={{ justifyContent:"space-between" }}>
              <b>{x.name}</b>
              <b>₦{(Number(x.price||0)*Number(x.qty||1)).toLocaleString("en-NG")}</b>
            </div>
            <div className="small" style={{ marginTop:6 }}>
              {x.category} • Qty: {x.qty} • Unit: ₦{Number(x.price||0).toLocaleString("en-NG")}
            </div>
            <button className="btn" type="button" style={{ marginTop:10 }} onClick={() => del(x.id)}>
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}
EOF

# ---------------------------
# Subscriptions (local) - pay/postpone
# ---------------------------
cat > src/pages/Subscriptions.jsx <<'EOF'
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { addSubscription, getSubscriptions, updateSubscription } from "../utils/localSubscriptions";
import "../styles/app.css";

export default function Subscriptions() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState(1);
  const [tick, setTick] = useState(0);

  const list = getSubscriptions(user.uid);

  function add(e) {
    e.preventDefault();
    addSubscription(user.uid, { name, amount, dueDay });
    setName(""); setAmount(""); setDueDay(1);
    setTick((t)=>t+1);
  }

  function pay(id) {
    updateSubscription(user.uid, id, { status: "paid" });
    setTick((t)=>t+1);
  }

  function postpone(id) {
    updateSubscription(user.uid, id, { status: "postponed" });
    setTick((t)=>t+1);
  }

  return (
    <div style={{ display:"grid", gap:12 }}>
      <h2 style={{ margin:0 }}>Month-end Subscriptions</h2>

      <div className="card">
        <div style={{ fontWeight:800, marginBottom:6 }}>Add subscription</div>
        <form onSubmit={add} style={{ display:"grid", gap:10 }}>
          <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Netflix, Spotify, Data plan..." />
          <div className="row">
            <input className="input" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount (₦)" inputMode="numeric" />
            <input className="input" value={dueDay} onChange={(e)=>setDueDay(e.target.value)} placeholder="Due day (1-31)" inputMode="numeric" />
          </div>
          <button className="btn">Add</button>
          <div className="small">Soon: AI will suggest “Pay now vs postpone” based on cash & spending patterns.</div>
        </form>
      </div>

      {list.length === 0 ? (
        <div className="card"><div className="small">No subscriptions yet.</div></div>
      ) : (
        list.map((s) => (
          <div key={s.id} className="card">
            <div className="row" style={{ justifyContent:"space-between" }}>
              <b>{s.name}</b>
              <b>₦{Number(s.amount||0).toLocaleString("en-NG")}</b>
            </div>
            <div className="small" style={{ marginTop:6 }}>
              Due day: {s.dueDay} • Status: <b>{s.status}</b>
            </div>
            <div className="row" style={{ marginTop:10 }}>
              <button className="btn" type="button" onClick={() => pay(s.id)}>Mark Paid</button>
              <button className="btn" type="button" onClick={() => postpone(s.id)}>Postpone</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
EOF

# ---------------------------
# Edit Profile (set store name + set cash baseline)
# ---------------------------
cat > src/pages/EditProfile.jsx <<'EOF'
import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { setCash, getFinance } from "../utils/localFinance";
import "../styles/app.css";

export default function EditProfile() {
  const { user, profile, updateUserProfile } = useAuth();
  const [storeName, setStoreName] = useState(profile?.storeName || "");
  const [name, setName] = useState(profile?.name || "");
  const [cashAtHand, setCashAtHand] = useState(profile?.cashAtHand ?? getFinance(user.uid).cashAtHand ?? 0);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      // Always store locally so cash model works without Firestore
      const next = setCash(user.uid, cashAtHand);

      await updateUserProfile({
        storeName: storeName.trim() || "My Sapa Tracker",
        name: name.trim(),
        cashAtHand: next.cashAtHand,
      });

      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth:520 }}>
      <h2>Edit Profile</h2>
      <form onSubmit={save} style={{ display:"grid", gap:10 }}>
        <label className="small">Display name</label>
        <input className="input" value={name} onChange={(e)=>setName(e.target.value)} />

        <label className="small">Store/Profile name</label>
        <input className="input" value={storeName} onChange={(e)=>setStoreName(e.target.value)} />

        <label className="small">Cash at hand (baseline)</label>
        <input className="input" value={cashAtHand} onChange={(e)=>setCashAtHand(e.target.value)} inputMode="numeric" />

        <button className="btn" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
        <div className="small">Tip: set your real cash here anytime to “reset reality”.</div>
      </form>
    </div>
  );
}
EOF

# ---------------------------
# AI page (stub) - will later call ChatGPT/OpenAI or a local rules engine
# ---------------------------
cat > src/pages/SapaAI.jsx <<'EOF'
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getFinance } from "../utils/localFinance";
import "../styles/app.css";

export default function SapaAI() {
  const { user } = useAuth();
  const finance = getFinance(user.uid);

  const [q, setQ] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "I’m Sapa Tracker AI. Ask me about spending habits, subscriptions, or your shopping list." }
  ]);

  function respond() {
    // Stub response (offline). Later this becomes a real ChatGPT-style response via API.
    const txCount = (finance.transactions || []).length;
    const cash = Number(finance.cashAtHand || 0);

    const reply =
      `Here’s what I see (local mode):\n` +
      `• Cash at hand: ₦${cash.toLocaleString("en-NG")}\n` +
      `• Transactions recorded: ${txCount}\n\n` +
      `Suggestion: If you’re hitting “sapa” often, reduce your top drainer category and postpone non-essential subscriptions.`;

    setMessages((m) => [
      ...m,
      { role: "user", content: q || "(no question)" },
      { role: "assistant", content: reply },
    ]);
    setQ("");
  }

  return (
    <div style={{ display:"grid", gap:12 }}>
      <h2 style={{ margin:0 }}>Sapa Tracker AI</h2>
      <div className="card">
        <div className="small">This is a ChatGPT-style UI. Next: connect to real AI responses (OpenAI/Claude) + your finance data.</div>
      </div>

      <div style={{ display:"grid", gap:10 }}>
        {messages.map((m, i) => (
          <div key={i} className="card" style={{ opacity: 0.98 }}>
            <div className="small"><b>{m.role === "user" ? "You" : "AI"}</b></div>
            <div style={{ whiteSpace:"pre-wrap", marginTop:6 }}>{m.content}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row">
          <input className="input" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Ask: why am I broke? should I postpone Netflix?" />
          <button className="btn" type="button" onClick={respond}>Send</button>
        </div>
      </div>
    </div>
  );
}
EOF

# ---------------------------
# Product ideas/roadmap notes (saved in code)
# ---------------------------
cat > src/constants/ideas.js <<'EOF'
export const SAPA_IDEAS = [
  "House Shopping: categorized list + totals + beautiful PDF export + share",
  "Subscriptions: month-end reminders + pay/postpone + AI suggestions based on cash reality",
  "Daily Spend Leak Detector: identify recurring small drains (snacks, data, transport)",
  "Sapa Forecast: estimate days until cash runs low based on last 30 days spending",
  "Soft Limits: set category soft limits; warn without shaming",
  "Goals: savings goals + 'safe-to-spend' number",
  "Bills Calendar: rent, power, internet, tuition — due dates & postponement logic",
  "Receipt Capture (later): photo to text + auto-category (mobile permission via Capacitor)",
  "Offline-first: everything works without network; sync when cloud enabled",
  "AI Chat: ChatGPT-style responses summarizing spending, suggesting adjustments, and generating shopping PDFs"
];
EOF

echo ""
echo "✅ Sapa Tracker bootstrap complete."
echo "➡️ Now run: npm run dev"
echo "➡️ Login/Register works. Firestore is optional for now. Local mode enabled with reminder banner."
