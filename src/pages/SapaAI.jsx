import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import useDashboardData from "../hooks/useDashboardData";
import { sapaReply, SAPA_INTENTS_COUNT } from "../ai/sapaChatBrain";

const money = (n) => `₦${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;

export default function SapaAI() {
  const { user, profile } = useAuth();
  const uid = user?.uid;

  // ✅ Pull the same computed brain as Dashboard (realtime)
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
        `I’m SAPA A.I.\n` +
        `Try: “is paying rent still a possibility?”, “postpone netflix”, “why I dey broke mid-month?”\n` +
        `(Scenario brain loaded: ${SAPA_INTENTS_COUNT} intents.)`,
    },
  ]);

  const ctx = useMemo(() => {
    return {
      cashAtHand,
      txCount,
      profile,
      computed, // ✅ this is the juice
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
      <div className="st-card">
        <h3>SAPA A.I</h3>
        <p className="small">Log in to activate SAPA A.I.</p>
      </div>
    );
  }

  return (
    <div className="st-card" style={{ maxWidth: 760 }}>
      <h3>SAPA A.I</h3>

      {loading ? (
        <p className="small">Syncing your money reality…</p>
      ) : (
        <>
          {error ? (
            <p className="small" style={{ color: "#ffb3b3" }}>
              {error}
            </p>
          ) : null}

          <p className="small" style={{ opacity: 0.85 }}>
            Local mode (no cloud chat). I read your cash baseline + real transactions.
          </p>

          <div className="small" style={{ marginTop: 10, opacity: 0.92 }}>
            Snapshot:
            <div style={{ marginTop: 6 }}>
              Cash at hand: <b>{money(cashAtHand)}</b> · Transactions: <b>{txCount}</b>
              {" · "}
              Avg/day: <b>{money(computed?.avgDailySpend7 ?? 0)}</b>
              {" · "}
              Due soon: <b>{money(computed?.dueTotal ?? 0)}</b>
            </div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              Top leak: <b>{computed?.topCats?.[0]?.name ?? "—"}</b>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 12,
                maxHeight: 360,
                overflow: "auto",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              {history.map((m, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, opacity: 0.85 }}>
                    {m.role === "user" ? "You" : "SAPA A.I"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{m.text}</div>
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
              <button className="btn" onClick={send}>
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
