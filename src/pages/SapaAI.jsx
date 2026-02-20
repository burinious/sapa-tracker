import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaRobot } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import useDashboardData from "../hooks/useDashboardData";
import { sapaReply, SAPA_INTENTS_COUNT } from "../ai/sapaChatBrain";
import { askSapaOpenAI, isOpenAIConfigured } from "../services/sapaOpenAI";
import "../styles/app.css";

const money = (n) => `NGN ${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;

const REQUEST_PRESETS = [
  "Give me a quick weekly money insight based on my app data.",
  "What are my top spending leaks and how do I cut them this week?",
  "Can I safely handle rent and bills from my current cash flow?",
  "Create a 7-day survival spending plan from my current numbers.",
];

export default function SapaAI() {
  const { user, profile } = useAuth();
  const uid = user?.uid;

  const { loading, error, computed, transactions, subscriptions } = useDashboardData(uid, {
    currency: "NGN",
    riskWindowDays: 7,
    txWindowDays: 30,
    notesLimit: 8,
  });

  const cashAtHand = Number(profile?.cashAtHand ?? 0);
  const txCount = transactions?.length ?? 0;
  const subCount = subscriptions?.length ?? 0;
  const aiBackendReady = isOpenAIConfigured();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([
    {
      role: "assistant",
      text:
        `I'm SAPA A.I.\n` +
        `I can use your app data (cash, transactions, bills, profile) for advice.\n` +
        `Try: "can I still pay rent?", "give me weekly insight", "what should I cut now?"\n` +
        `(Local intents: ${SAPA_INTENTS_COUNT}. AI backend: ${aiBackendReady ? "connected" : "not configured"})`,
    },
  ]);

  const historyRef = useRef(history);
  const autoInsightKeyRef = useRef("");

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const ctx = useMemo(() => {
    return {
      cashAtHand,
      txCount,
      profile,
      computed,
      transactions: Array.isArray(transactions) ? transactions : [],
      subscriptions: Array.isArray(subscriptions) ? subscriptions : [],
    };
  }, [cashAtHand, txCount, profile, computed, transactions, subscriptions]);

  const sendMessage = useCallback(async (rawMessage, options = {}) => {
    const msg = String(rawMessage || "").trim();
    const appendUser = options.appendUser !== false;
    if (!msg || sending) return;

    let baseHistory = historyRef.current;
    if (appendUser) {
      const userTurn = { role: "user", text: msg };
      baseHistory = [...baseHistory, userTurn];
      setHistory(baseHistory);
    }

    setSending(true);
    try {
      let replyText = "";

      if (aiBackendReady) {
        const result = await askSapaOpenAI({
          message: msg,
          history: baseHistory,
          ctx,
        });
        replyText = result.text;
      } else {
        const local = sapaReply({
          message: msg,
          ctx,
        });
        replyText = local.text;
      }

      setHistory((h) => [...h, { role: "assistant", text: replyText }]);
    } catch (err) {
      const fallback = sapaReply({
        message: msg,
        ctx,
      });
      const preface = `AI backend unavailable right now (${err?.message || "request failed"}).`;
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: `${preface}\n\nFallback advice:\n${fallback.text}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [ctx, aiBackendReady, sending]);

  useEffect(() => {
    if (!uid || loading || sending) return;
    if ((historyRef.current?.length || 0) > 1) return;

    const digest = [
      uid,
      aiBackendReady ? "ready" : "fallback",
      Math.round(cashAtHand),
      txCount,
      Math.round(computed?.avgDailySpend7 || 0),
      Math.round(computed?.dueTotal || 0),
      Math.round(computed?.score || 0),
    ].join("|");

    if (autoInsightKeyRef.current === digest) return;
    autoInsightKeyRef.current = digest;

    sendMessage(
      "Use my latest app data and give one proactive insight: risk summary, top leak, and a 7-day action plan.",
      { appendUser: false }
    );
  }, [
    uid,
    loading,
    sending,
    aiBackendReady,
    cashAtHand,
    txCount,
    computed?.avgDailySpend7,
    computed?.dueTotal,
    computed?.score,
    sendMessage,
  ]);

  function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    sendMessage(msg, { appendUser: true });
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

            <p className="page-sub">
              {aiBackendReady
                ? "SAPA A.I (powered by OpenAI backend) using your in-app profile and live spending context."
                : "SAPA A.I local fallback mode using your in-app data."}
            </p>

            <div className="stats-row">
              <div className="stat-pill">Cash: <b>{money(cashAtHand)}</b></div>
              <div className="stat-pill">Transactions: <b>{txCount}</b></div>
              <div className="stat-pill">Subscriptions: <b>{subCount}</b></div>
              <div className="stat-pill">Avg/day: <b>{money(computed?.avgDailySpend7 ?? 0)}</b></div>
              <div className="stat-pill">Due soon: <b>{money(computed?.dueTotal ?? 0)}</b></div>
              <div className="stat-pill">Top leak: <b>{computed?.topCats?.[0]?.name ?? "-"}</b></div>
              <div className="stat-pill">Engine: <b>{aiBackendReady ? "Cloud AI" : "Local Fallback"}</b></div>
            </div>

            <div className="page-stack-md" style={{ marginTop: 14 }}>
              <div className="toolbar" style={{ marginTop: 0 }}>
                <button
                  className="btn settings-secondary-btn"
                  type="button"
                  onClick={() =>
                    sendMessage(
                      "Use my current app data and generate fresh proactive insight for this week.",
                      { appendUser: false }
                    )
                  }
                  disabled={sending}
                >
                  Generate Insight
                </button>
              </div>

              {!aiBackendReady ? (
                <p className="small muted" style={{ marginTop: -6 }}>
                  AI backend is not configured yet. Add `VITE_OPENAI_ENDPOINT` and restart the app.
                </p>
              ) : null}

              <div className="toolbar" style={{ marginTop: 0 }}>
                {REQUEST_PRESETS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="btn settings-secondary-btn"
                    onClick={() => sendMessage(q, { appendUser: true })}
                    disabled={sending}
                  >
                    {q}
                  </button>
                ))}
              </div>

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
                  placeholder='Try: "Can I still pay rent and survive this week?"'
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button className="btn" onClick={send} disabled={sending}>
                  {sending ? "Thinking..." : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
