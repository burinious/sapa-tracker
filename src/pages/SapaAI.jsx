import { useMemo, useState } from "react";
import { FaRobot } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import useDashboardData from "../hooks/useDashboardData";
import { sapaReply, SAPA_INTENTS_COUNT } from "../ai/sapaChatBrain";
import "../styles/app.css";

const money = (n) => `NGN ${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;

export default function SapaAI() {
  const { user, profile } = useAuth();
  const uid = user?.uid;

  const { loading, error, computed, transactions } = useDashboardData(uid, {
    currency: "NGN",
    riskWindowDays: 7,
    txWindowDays: 30,
    notesLimit: 8,
  });

  const cashAtHand = Number(profile?.cashAtHand ?? 0);
  const txCount = transactions?.length ?? 0;

  const [input, setInput] = useState("");
  const [history, setHistory] = useState([
    {
      role: "assistant",
      text:
        `I'm SAPA A.I.\n` +
        `Try: "is paying rent still a possibility?", "postpone netflix", "why I dey broke mid-month?"\n` +
        `(Scenario brain loaded: ${SAPA_INTENTS_COUNT} intents.)`,
    },
  ]);

  const ctx = useMemo(() => {
    return {
      cashAtHand,
      txCount,
      profile,
      computed,
    };
  }, [cashAtHand, txCount, profile, computed]);

  function send() {
    const msg = input.trim();
    if (!msg) return;

    const userTurn = { role: "user", text: msg };

    const reply = sapaReply({
      message: msg,
      ctx,
    });

    const assistantTurn = {
      role: "assistant",
      text: reply.text,
    };

    setHistory((h) => [...h, userTurn, assistantTurn]);
    setInput("");
  }

  if (!uid) {
    return (
      <div className="page-shell">
        <div className="page-card">
          <div className="page-title-row">
            <span className="page-title-icon"><FaRobot /></span>
            <h3 className="page-title">SAPA A.I</h3>
          </div>
          <p className="small">Log in to activate SAPA A.I.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-card" style={{ maxWidth: 760 }}>
        <div className="page-title-row">
          <span className="page-title-icon"><FaRobot /></span>
          <h3 className="page-title">SAPA A.I</h3>
        </div>

        {loading ? (
          <p className="small">Syncing your money reality...</p>
        ) : (
          <>
            {error ? <p className="note-warn">{error}</p> : null}

            <p className="page-sub">Local mode (no cloud chat). I read your cash baseline + real transactions.</p>

            <div className="stats-row">
              <div className="stat-pill">Cash: <b>{money(cashAtHand)}</b></div>
              <div className="stat-pill">Transactions: <b>{txCount}</b></div>
              <div className="stat-pill">Avg/day: <b>{money(computed?.avgDailySpend7 ?? 0)}</b></div>
              <div className="stat-pill">Due soon: <b>{money(computed?.dueTotal ?? 0)}</b></div>
              <div className="stat-pill">Top leak: <b>{computed?.topCats?.[0]?.name ?? "-"}</b></div>
            </div>

            <div className="page-stack-md" style={{ marginTop: 14 }}>
              <div className="chat-box">
                {history.map((m, i) => (
                  <div key={i} className="chat-row">
                    <div className="chat-role">{m.role === "user" ? "You" : "SAPA A.I"}</div>
                    <div className="chat-msg">{m.text}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='Try: "is paying rent still a possibility"'
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button className="btn" onClick={send}>Send</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
