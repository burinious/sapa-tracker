#!/usr/bin/env bash
set -euo pipefail

# =========================================
# SapaTracker Thunder Setup (Vite + PWA + Coach/Entries/Loans/Budgets)
# Run inside your Vite React project root.
# =========================================

echo "⚡ SapaTracker Thunder Setup starting..."

# ---- sanity checks ----
if [ ! -f package.json ]; then
  echo "❌ package.json not found. Run this at the root of your Vite React project."
  exit 1
fi

# detect vite config
VITE_CFG=""
if [ -f vite.config.js ]; then VITE_CFG="vite.config.js"; fi
if [ -f vite.config.mjs ]; then VITE_CFG="vite.config.mjs"; fi
if [ -f vite.config.ts ]; then VITE_CFG="vite.config.ts"; fi

if [ -z "${VITE_CFG}" ]; then
  echo "❌ No vite.config.(js|mjs|ts) found. This script expects a Vite project."
  exit 1
fi

# detect entry file
MAIN_FILE=""
if [ -f src/main.jsx ]; then MAIN_FILE="src/main.jsx"; fi
if [ -f src/main.tsx ]; then MAIN_FILE="src/main.tsx"; fi

if [ -z "${MAIN_FILE}" ]; then
  echo "❌ No src/main.jsx or src/main.tsx found."
  exit 1
fi

# ensure git
if [ ! -d .git ]; then
  echo "🧰 Initializing git..."
  git init
  git add -A || true
  git commit -m "chore: init repo checkpoint" || true
fi

# ---- install deps ----
echo "📦 Installing deps..."
npm i react-router-dom vite-plugin-pwa date-fns

# Optional (only if you already use Firebase, keep it; otherwise it won't hurt)
npm i firebase || true

# ---- create directories ----
echo "📁 Creating feature folders..."
mkdir -p src/features/entries
mkdir -p src/features/loans
mkdir -p src/features/budgets
mkdir -p src/features/coach
mkdir -p src/services
mkdir -p src/hooks

# ---- public assets (PWA icons placeholders) ----
echo "🖼️ Adding minimal PWA icons (placeholders)..."
mkdir -p public

# tiny 1x1 PNG (works as placeholder; replace later with real icons)
TINY_PNG_B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/aw3k0sAAAAASUVORK5CYII="

printf "%s" "$TINY_PNG_B64" | base64 -d > public/pwa-192.png
printf "%s" "$TINY_PNG_B64" | base64 -d > public/pwa-512.png
printf "%s" "$TINY_PNG_B64" | base64 -d > public/apple-touch-icon.png

# ---- Add/Update PWA config in vite.config.* ----
echo "🧩 Patching ${VITE_CFG} for PWA..."

cp -n "${VITE_CFG}" "${VITE_CFG}.bak" || true

node - <<'NODE'
const fs = require("fs");
const path = require("path");

const cfg = ["vite.config.js","vite.config.mjs","vite.config.ts"].find(f=>fs.existsSync(f));
if(!cfg) process.exit(1);

let s = fs.readFileSync(cfg, "utf8");

if (!s.includes("vite-plugin-pwa")) {
  // Add import
  if (s.includes("from \"vite\"")) {
    s = s.replace(/(import\s+\{\s*defineConfig\s*\}\s+from\s+["']vite["'];?\s*)/m,
      `$1\nimport { VitePWA } from "vite-plugin-pwa";\n`
    );
  } else if (s.includes("defineConfig")) {
    // Best effort insert at top
    s = `import { VitePWA } from "vite-plugin-pwa";\n` + s;
  } else {
    s = `import { defineConfig } from "vite";\nimport { VitePWA } from "vite-plugin-pwa";\n` + s;
  }
}

if (!s.includes("VitePWA(") && !s.includes("VitePWA({")) {
  // Ensure plugins array exists and inject VitePWA
  // This tries to inject into "plugins: [ ... ]"
  const pwaBlock = `VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "SapaTracker",
        short_name: "SapaTracker",
        description: "Personal finance + diary coach",
        theme_color: "#0b1220",
        background_color: "#0b1220",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })`;

  if (s.match(/plugins\s*:\s*\[/)) {
    s = s.replace(/plugins\s*:\s*\[/, match => `${match}\n    ${pwaBlock},\n    `);
  } else if (s.includes("defineConfig({")) {
    // add plugins section
    s = s.replace(/defineConfig\(\{\s*/m, m => `${m}plugins: [\n    ${pwaBlock},\n  ],\n  `);
  }
}

fs.writeFileSync(cfg, s);
console.log("OK: patched", cfg);
NODE

# ---- Register service worker in main ----
echo "🧷 Registering PWA service worker in ${MAIN_FILE}..."
cp -n "${MAIN_FILE}" "${MAIN_FILE}.bak" || true

node - <<'NODE'
const fs = require("fs");
const mainCandidates = ["src/main.jsx","src/main.tsx"].filter(f=>fs.existsSync(f));
if(!mainCandidates.length) process.exit(1);
const f = mainCandidates[0];

let s = fs.readFileSync(f,"utf8");
if(!s.includes("virtual:pwa-register")) {
  // Insert import near top
  s = `import { registerSW } from "virtual:pwa-register";\n` + s;
}
if(!s.includes("registerSW(")) {
  // Add call after first render or at end
  s += `\n\n// PWA service worker\nregisterSW({ immediate: true });\n`;
}
fs.writeFileSync(f,s);
console.log("OK: patched", f);
NODE

# ---- Create Firebase placeholder (non-destructive) ----
if [ ! -f src/services/firebase.js ]; then
  cat > src/services/firebase.js <<'EOF'
/**
 * Firebase bootstrap (placeholder)
 * - If you already have Firebase configured elsewhere, you can ignore this file.
 * - If not, paste your config here and use exports below.
 */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  // messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  // appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
EOF
fi

# ---- Services: entries/loans/budgets + coach engine ----
cat > src/services/entries.js <<'EOF'
import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function addEntry(uid, data) {
  const ref = collection(db, "users", uid, "entries");
  const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  return addDoc(ref, payload);
}

export async function updateEntry(uid, entryId, data) {
  const ref = doc(db, "users", uid, "entries", entryId);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteEntry(uid, entryId) {
  const ref = doc(db, "users", uid, "entries", entryId);
  return deleteDoc(ref);
}

export async function getRecentEntries(uid, n = 5) {
  const ref = collection(db, "users", uid, "entries");
  const q = query(ref, orderBy("createdAt", "desc"), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
EOF

cat > src/services/loans.js <<'EOF'
import { collection, addDoc, doc, updateDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function addLoan(uid, loan) {
  const ref = collection(db, "users", uid, "loans");
  const payload = {
    lender: loan.lender || "Co-op",
    principal: Number(loan.principal || 0),
    balance: Number(loan.balance ?? loan.principal ?? 0),
    startDate: loan.startDate || new Date().toISOString().slice(0,10),
    dueDay: Number(loan.dueDay || 28),
    termMonths: Number(loan.termMonths || 18),
    status: loan.status || "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  return addDoc(ref, payload);
}

export async function recordLoanPayment(uid, loanId, amount, dateStr) {
  const paymentsRef = collection(db, "users", uid, "loans", loanId, "payments");
  await addDoc(paymentsRef, {
    amount: Number(amount),
    date: dateStr || new Date().toISOString().slice(0,10),
    createdAt: serverTimestamp()
  });
  // You can also recompute balance via a cloud function later.
}

export async function getActiveLoans(uid) {
  const ref = collection(db, "users", uid, "loans");
  const q = query(ref, where("status","==","active"), orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateLoan(uid, loanId, patch) {
  const ref = doc(db, "users", uid, "loans", loanId);
  return updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}
EOF

cat > src/services/budgets.js <<'EOF'
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}

export async function upsertMonthlyBudget(uid, month, data) {
  const ref = doc(db, "users", uid, "budgets", month);
  return setDoc(ref, data, { merge: true });
}

export async function getMonthlyBudget(uid, month) {
  const ref = doc(db, "users", uid, "budgets", month);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
EOF

cat > src/features/coach/coachEngine.js <<'EOF'
import { differenceInCalendarDays } from "date-fns";

export function computeCoachNotes({
  now = new Date(),
  paydayDay = 28,
  dailyFloor = 12000,
  manualCash = null,
  computedCash = null,
  totalLoanOwed = 0,
  betBudgetMonthly = 50000,
  betSpentMonthly = 0,
  workoutsLast7Days = 0,
  entryLastAt = null, // Date
  breakfastLoggedToday = false,
  lastShoppingAt = null, // Date
  lastHomeAuditAt = null // Date
}) {
  const cash = (manualCash ?? computedCash ?? 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const payday = new Date(now.getFullYear(), now.getMonth(), paydayDay);
  const paydayNext = payday >= today ? payday : new Date(now.getFullYear(), now.getMonth()+1, paydayDay);

  const daysToPayday = Math.max(0, differenceInCalendarDays(paydayNext, today));
  const runwayDays = dailyFloor > 0 ? (cash / dailyFloor) : 999;

  const notes = [];

  // Entry missing (24hrs)
  if (!entryLastAt || (now.getTime() - entryLastAt.getTime()) > 24 * 60 * 60 * 1000) {
    notes.push({
      type: "REMINDER",
      priority: "HIGH",
      title: "No entry in 24hrs",
      message: "Guy you never drop entry for 24hrs. 30 seconds gist make we update record.",
      action: "/entries/new"
    });
  }

  // Breakfast missing after 10:30
  const hhmm = now.getHours() * 60 + now.getMinutes();
  if (hhmm >= (10*60+30) && !breakfastLoggedToday) {
    notes.push({
      type: "REMINDER",
      priority: "MEDIUM",
      title: "Breakfast no show",
      message: "You never chop breakfast o. Even if na small, log am.",
      action: "/entries/new"
    });
  }

  // Exercise target 4x/week
  if (workoutsLast7Days < 4) {
    notes.push({
      type: "NUDGE",
      priority: "MEDIUM",
      title: "Exercise target",
      message: `Exercise no reach target this week. You need ${4 - workoutsLast7Days} more session(s).`,
      action: "/coach"
    });
  } else {
    notes.push({
      type: "PRAISE",
      priority: "LOW",
      title: "Exercise steady",
      message: "Your exercise dey regular. Body go thank you.",
      action: "/coach"
    });
  }

  // Betting budget
  const betPct = betBudgetMonthly > 0 ? (betSpentMonthly / betBudgetMonthly) : 0;
  if (betPct >= 1) {
    notes.push({
      type: "WARNING",
      priority: "HIGH",
      title: "Bet budget don pass",
      message: "Guy you don pass betting budget. Freeze betting first.",
      action: "/budgets"
    });
  } else if (betPct >= 0.8) {
    notes.push({
      type: "WARNING",
      priority: "MEDIUM",
      title: "Bet budget near cap",
      message: "Betting don near cap (80%). Calm down make e no enter red.",
      action: "/budgets"
    });
  } else {
    notes.push({
      type: "PRAISE",
      priority: "LOW",
      title: "Bet budget safe",
      message: "You have not spent the budget you have for bet. Respect.",
      action: "/budgets"
    });
  }

  // Salary soon + runway
  if (runwayDays >= daysToPayday) {
    notes.push({
      type: "REASSURE",
      priority: "LOW",
      title: "Runway OK",
      message: `You are still within budget. Salary should enter soon (28th). You will be fine.`,
      action: "/coach"
    });
  } else {
    notes.push({
      type: "WARNING",
      priority: "HIGH",
      title: "Runway short",
      message: `Guy, if you dey spend normal ₦${dailyFloor}/day, cash no go reach 28th. Reduce spending or plan inflow.`,
      action: "/coach"
    });
  }

  // Loans pressure
  if (totalLoanOwed > 0) {
    const ratio = cash > 0 ? (totalLoanOwed / cash) : Infinity;
    if (ratio >= 2) {
      notes.push({
        type: "WARNING",
        priority: "HIGH",
        title: "Loan trouble signal",
        message: `You are owing ₦${Math.round(totalLoanOwed).toLocaleString()} and cash is ₦${Math.round(cash).toLocaleString()} (debt heavy pass cash). Make we strategise payment.`,
        action: "/loans"
      });
    } else {
      notes.push({
        type: "NUDGE",
        priority: "MEDIUM",
        title: "Loan active",
        message: `Guy you still dey owe ₦${Math.round(totalLoanOwed).toLocaleString()}. No forget say 28th dey always come.`,
        action: "/loans"
      });
    }
  }

  // Shopping overdue (14 days)
  if (lastShoppingAt) {
    const ds = differenceInCalendarDays(today, new Date(lastShoppingAt));
    if (ds > 14) {
      notes.push({
        type: "NUDGE",
        priority: "LOW",
        title: "Shopping overdue",
        message: `It’s been ${ds} days you do shopping. You dey manage? Plan small restock.`,
        action: "/entries"
      });
    }
  }

  // Home audit overdue (30 days)
  if (lastHomeAuditAt) {
    const da = differenceInCalendarDays(today, new Date(lastHomeAuditAt));
    if (da > 30) {
      notes.push({
        type: "NUDGE",
        priority: "LOW",
        title: "Home audit overdue",
        message: `Are you sure everything is intact? Last home audit was ${da} days ago.`,
        action: "/coach"
      });
    }
  }

  // basic SapaRisk color
  const sapaRisk = Math.max(0, Math.min(100, Math.round(
    (runwayDays < daysToPayday ? 35 : 10)
    + (betPct >= 0.8 ? 20 : 0)
    + (totalLoanOwed > 0 ? 15 : 0)
    + (workoutsLast7Days < 4 ? 10 : 0)
  )));
  const sapaColor = sapaRisk <= 35 ? "GREEN" : (sapaRisk <= 65 ? "YELLOW" : "RED");

  notes.unshift({
    type: "STATUS",
    priority: "LOW",
    title: "Sapa Risk",
    message: `Your SAPA risk is ${sapaColor.toLowerCase()} (${sapaRisk}/100).`,
    action: "/coach"
  });

  return { notes, sapaRisk, sapaColor, daysToPayday, runwayDays };
}
EOF

# ---- Minimal pages (routes) ----
cat > src/features/entries/EntriesPage.jsx <<'EOF'
import React, { useEffect, useState } from "react";
import { getRecentEntries } from "../../services/entries";

export default function EntriesPage({ uid }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!uid) return;
    getRecentEntries(uid, 25).then(setItems).catch(console.error);
  }, [uid]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Entries</h2>
      <p>Recent entries (newest first)</p>
      <a href="/entries/new">+ New Entry</a>
      <div style={{ marginTop: 12 }}>
        {items.map(e => (
          <div key={e.id} style={{ border: "1px solid #2a3550", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>{e.date || ""}</div>
            <div style={{ fontWeight: 700 }}>{e.title || "Untitled"}</div>
            <div style={{ opacity: 0.9, marginTop: 6 }}>{(e.text || "").slice(0, 120)}{(e.text || "").length > 120 ? "..." : ""}</div>
            <div style={{ marginTop: 8 }}>
              <a href={`/entries/${e.id}/edit`}>Edit</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
EOF

cat > src/features/entries/EntryFormPage.jsx <<'EOF'
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addEntry, updateEntry } from "../../services/entries";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function EntryFormPage({ uid }) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const nav = useNavigate();

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    title: "",
    text: "",
    tags: ""
  });

  useEffect(() => {
    if (!uid || !isEdit) return;
    (async () => {
      const ref = doc(db, "users", uid, "entries", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          date: d.date || new Date().toISOString().slice(0,10),
          title: d.title || "",
          text: d.text || "",
          tags: Array.isArray(d.tags) ? d.tags.join(", ") : (d.tags || "")
        });
      }
    })().catch(console.error);
  }, [uid, isEdit, id]);

  const payload = useMemo(() => ({
    date: form.date,
    title: form.title.trim(),
    text: form.text.trim(),
    tags: form.tags.split(",").map(s => s.trim()).filter(Boolean)
  }), [form]);

  async function onSave(e) {
    e.preventDefault();
    if (!uid) return;
    if (isEdit) await updateEntry(uid, id, payload);
    else await addEntry(uid, payload);
    nav("/entries");
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>{isEdit ? "Edit Entry" : "New Entry"}</h2>
      <form onSubmit={onSave} style={{ display: "grid", gap: 10, maxWidth: 640 }}>
        <label>
          Date
          <input value={form.date} onChange={e=>setForm(f=>({ ...f, date: e.target.value }))} type="date" />
        </label>
        <label>
          Title
          <input value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} placeholder="e.g. Saturday gist" />
        </label>
        <label>
          Tags (comma separated)
          <input value={form.tags} onChange={e=>setForm(f=>({ ...f, tags: e.target.value }))} placeholder="work, sapa, gym" />
        </label>
        <label>
          Entry
          <textarea value={form.text} onChange={e=>setForm(f=>({ ...f, text: e.target.value }))} rows={8} placeholder="drop the gist..." />
        </label>
        <button type="submit">{isEdit ? "Update" : "Save"}</button>
        <a href="/entries">Back</a>
      </form>
    </div>
  );
}
EOF

cat > src/features/loans/LoansPage.jsx <<'EOF'
import React, { useEffect, useState } from "react";
import { addLoan, getActiveLoans } from "../../services/loans";

export default function LoansPage({ uid }) {
  const [loans, setLoans] = useState([]);
  const [principal, setPrincipal] = useState(500000);

  async function refresh() {
    if (!uid) return;
    const data = await getActiveLoans(uid);
    setLoans(data);
  }

  useEffect(() => { refresh().catch(console.error); }, [uid]);

  async function onAdd() {
    if (!uid) return;
    await addLoan(uid, { lender: "Co-op", principal, balance: principal, dueDay: 28, termMonths: 18 });
    await refresh();
  }

  const totalOwed = loans.reduce((s,l)=>s + Number(l.balance || 0), 0);

  return (
    <div style={{ padding: 16 }}>
      <h2>Loans</h2>
      <p>Total owed: <b>₦{Math.round(totalOwed).toLocaleString()}</b></p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input type="number" value={principal} onChange={e=>setPrincipal(Number(e.target.value))} />
        <button onClick={onAdd}>+ Add Co-op Loan</button>
      </div>

      {loans.map(l => (
        <div key={l.id} style={{ border: "1px solid #2a3550", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>{l.lender}</div>
          <div>Balance: ₦{Math.round(Number(l.balance||0)).toLocaleString()}</div>
          <div>Due day: {l.dueDay}th | Term: {l.termMonths} months</div>
        </div>
      ))}
    </div>
  );
}
EOF

cat > src/features/budgets/BudgetsPage.jsx <<'EOF'
import React, { useEffect, useState } from "react";
import { getMonthlyBudget, monthKey, upsertMonthlyBudget } from "../../services/budgets";

export default function BudgetsPage({ uid }) {
  const month = monthKey();
  const [dailyFloor, setDailyFloor] = useState(12000);
  const [betBudget, setBetBudget] = useState(50000);
  const [salaryExpected, setSalaryExpected] = useState(200000);

  useEffect(() => {
    if (!uid) return;
    getMonthlyBudget(uid, month).then(d => {
      if (!d) return;
      setDailyFloor(Number(d.dailyFloor ?? 12000));
      setBetBudget(Number(d.categoryBudgets?.bet ?? 50000));
      setSalaryExpected(Number(d.salaryExpected ?? 200000));
    }).catch(console.error);
  }, [uid, month]);

  async function save() {
    if (!uid) return;
    await upsertMonthlyBudget(uid, month, {
      month,
      payday: 28,
      dailyFloor: Number(dailyFloor),
      salaryExpected: Number(salaryExpected),
      categoryBudgets: { bet: Number(betBudget) }
    });
    alert("Saved ✅");
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Budgets ({month})</h2>
      <div style={{ display:"grid", gap: 10, maxWidth: 520 }}>
        <label>Daily Floor (₦/day)
          <input type="number" value={dailyFloor} onChange={e=>setDailyFloor(e.target.value)} />
        </label>
        <label>Bet Budget (₦/month)
          <input type="number" value={betBudget} onChange={e=>setBetBudget(e.target.value)} />
        </label>
        <label>Salary Expected (₦)
          <input type="number" value={salaryExpected} onChange={e=>setSalaryExpected(e.target.value)} />
        </label>
        <button onClick={save}>Save</button>
      </div>
    </div>
  );
}
EOF

cat > src/features/coach/CoachPage.jsx <<'EOF'
import React, { useMemo } from "react";
import { computeCoachNotes } from "./coachEngine";

export default function CoachPage({ coachInput }) {
  const out = useMemo(() => computeCoachNotes(coachInput), [coachInput]);
  return (
    <div style={{ padding: 16 }}>
      <h2>Coach</h2>
      <p><b>Sapa Risk:</b> {out.sapaColor} ({out.sapaRisk}/100) | <b>Runway:</b> {out.runwayDays.toFixed(1)} days | <b>Days to 28th:</b> {out.daysToPayday}</p>
      <div style={{ display: "grid", gap: 10 }}>
        {out.notes.map((n, idx) => (
          <div key={idx} style={{ border: "1px solid #2a3550", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{n.type} · {n.priority}</div>
            <div style={{ fontWeight: 800 }}>{n.title}</div>
            <div style={{ marginTop: 6 }}>{n.message}</div>
            {n.action ? <div style={{ marginTop: 8 }}><a href={n.action}>Go</a></div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
EOF

# ---- Add central router file (non-destructive) ----
cat > src/AppRoutes.jsx <<'EOF'
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import EntriesPage from "./features/entries/EntriesPage";
import EntryFormPage from "./features/entries/EntryFormPage";
import LoansPage from "./features/loans/LoansPage";
import BudgetsPage from "./features/budgets/BudgetsPage";
import CoachPage from "./features/coach/CoachPage";

// NOTE: Replace these props with your real auth/context values.
export default function AppRoutes({ uid, coachInput }) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/coach" replace />} />

      <Route path="/coach" element={<CoachPage coachInput={coachInput} />} />

      <Route path="/entries" element={<EntriesPage uid={uid} />} />
      <Route path="/entries/new" element={<EntryFormPage uid={uid} />} />
      <Route path="/entries/:id/edit" element={<EntryFormPage uid={uid} />} />

      <Route path="/loans" element={<LoansPage uid={uid} />} />
      <Route path="/budgets" element={<BudgetsPage uid={uid} />} />

      <Route path="*" element={<div style={{ padding: 16 }}>Page not found</div>} />
    </Routes>
  );
}
EOF

# ---- Patch src/App.jsx if it exists, otherwise create it ----
echo "🧠 Wiring router into App..."

if [ -f src/App.jsx ]; then
  cp -n src/App.jsx src/App.jsx.bak || true
fi

cat > src/App.jsx <<'EOF'
import React, { useMemo, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./AppRoutes";

/**
 * IMPORTANT:
 * - Replace uid with your real authenticated user id from Firebase/AuthContext.
 * - computedCash should come from your transactions aggregator.
 * - manualCash is your override input (what you said: manual overrides computed).
 */
export default function App() {
  // TEMP placeholders (replace with real auth + computed values)
  const uid = "demo-user";

  const [manualCash, setManualCash] = useState(200000);
  const computedCash = 0;

  const coachInput = useMemo(() => ({
    paydayDay: 28,
    dailyFloor: 12000,
    manualCash,
    computedCash,
    totalLoanOwed: 500000,
    betBudgetMonthly: 50000,
    betSpentMonthly: 0,
    workoutsLast7Days: 0,
    entryLastAt: null,
    breakfastLoggedToday: false,
    lastShoppingAt: null,
    lastHomeAuditAt: null
  }), [manualCash]);

  return (
    <BrowserRouter>
      <div style={{ padding: 16, borderBottom: "1px solid #2a3550" }}>
        <b>SapaTracker</b>{" "}
        <span style={{ opacity: 0.7, marginLeft: 8 }}>
          Manual Cash Override:
        </span>{" "}
        <input
          style={{ marginLeft: 8 }}
          type="number"
          value={manualCash}
          onChange={(e) => setManualCash(Number(e.target.value))}
        />
        <span style={{ opacity: 0.7, marginLeft: 8 }}>
          (overrides computed)
        </span>
      </div>

      <AppRoutes uid={uid} coachInput={coachInput} />
    </BrowserRouter>
  );
}
EOF

# ---- Ensure main imports App ----
echo "🔧 Ensuring ${MAIN_FILE} renders src/App.jsx ..."
cp -n "${MAIN_FILE}" "${MAIN_FILE}.bak2" || true

node - <<'NODE'
const fs = require("fs");

const f = fs.existsSync("src/main.jsx") ? "src/main.jsx" : "src/main.tsx";
let s = fs.readFileSync(f, "utf8");

// Replace any App import to ./App
if (!s.includes('from "./App"') && !s.includes('from "./App.jsx"')) {
  // Best effort: inject App import if missing
  if (!s.includes("import App")) {
    s = `import App from "./App";\n` + s;
  }
}

// Ensure ReactDOM render uses <App />
if (!s.includes("<App")) {
  s = s.replace(/<React\.StrictMode>[\s\S]*?<\/React\.StrictMode>/m, "<React.StrictMode>\n    <App />\n  </React.StrictMode>");
}

// If no strict mode block found, do nothing (user can adjust)
fs.writeFileSync(f, s);
console.log("OK: main updated", f);
NODE

# ---- git commit checkpoint ----
git add -A
git commit -m "feat: add PWA + coach/entries/loans/budgets scaffolds" || true

echo "✅ Done."
echo ""
echo "NEXT:"
echo "1) npm run dev"
echo "2) Visit /coach, /entries, /loans, /budgets"
echo "3) Deploy to Vercel, open on iPhone Safari, Share → Add to Home Screen"
echo ""
echo "⚠️ Replace placeholder uid + firebase config, and replace icons later."
