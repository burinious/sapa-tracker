import { auth } from "../firebase/firebase";

function n(x, fallback = 0) {
  const num = Number(x);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeTopCats(raw = []) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 5).map((x) => ({
    name: String(x?.name || "Other"),
    amount: n(x?.amount, 0),
    count: Math.max(0, Math.round(n(x?.count, 0))),
  }));
}

function normalizeRecentTransactions(raw = []) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 10).map((t) => ({
    type: String(t?.type || "expense"),
    amount: n(t?.amount, 0),
    category: String(t?.categoryName || t?.category || "Other"),
    date: String(t?.date || ""),
    note: String(t?.note || "").slice(0, 80),
  }));
}

function normalizeDueSoonSubscriptions(raw = []) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => String(s?.status || "active") === "active")
    .sort((a, b) => String(a?.nextDueDate || "").localeCompare(String(b?.nextDueDate || "")))
    .slice(0, 8)
    .map((s) => ({
      name: String(s?.name || s?.title || "Subscription"),
      amount: n(s?.amount, 0),
      nextDueDate: String(s?.nextDueDate || ""),
      category: String(s?.category || ""),
    }));
}

function profileSummary(profile = {}) {
  const salary = n(profile?.salary?.amount ?? profile?.primaryIncome?.amount, 0);
  const otherIncomes = Array.isArray(profile?.otherIncomes) ? profile.otherIncomes : [];
  const otherIncomeTotal = otherIncomes
    .filter((x) => x?.active !== false)
    .reduce((sum, x) => sum + n(x?.amount, 0), 0);
  const fixedBills = Array.isArray(profile?.fixedBills) ? profile.fixedBills : [];
  const fixedBillsActive = fixedBills.filter((x) => String(x?.status || "active") === "active");
  const fixedBillsTotal = fixedBillsActive.reduce((sum, x) => sum + n(x?.amount, 0), 0);
  return {
    salaryAmount: salary,
    salaryFrequency: String(profile?.salary?.frequency || profile?.primaryIncome?.frequency || "monthly"),
    otherIncomeTotal,
    otherIncomeCount: otherIncomes.length,
    rentAmount: n(profile?.rent?.amount, 0),
    rentNextDueDate: String(profile?.rent?.nextDueDate || ""),
    fixedBillsCount: fixedBillsActive.length,
    fixedBillsTotal,
  };
}

function contextSnapshot(ctx = {}) {
  const computed = ctx?.computed || {};
  const profile = ctx?.profile || {};
  const profileCtx = profileSummary(profile);
  return {
    currency: String(profile?.currency || "NGN"),
    cashAtHand: n(ctx?.cashAtHand ?? profile?.cashAtHand, 0),
    txCount: Math.max(0, Math.round(n(ctx?.txCount, 0))),
    mtdIncome: n(computed?.mtdIncome, 0),
    mtdExpense: n(computed?.mtdExpense, 0),
    cashApprox: n(computed?.cashApprox, 0),
    avgDailySpend7: n(computed?.avgDailySpend7, 0),
    dueTotalSoon: n(computed?.dueTotal, 0),
    riskScore: n(computed?.score, 0),
    riskZone: String(computed?.zone || "YELLOW ZONE"),
    topCats: normalizeTopCats(computed?.topCats),
    recentTransactions: normalizeRecentTransactions(ctx?.transactions),
    dueSoonSubscriptions: normalizeDueSoonSubscriptions(ctx?.subscriptions),
    profile: profileCtx,
  };
}

function systemPrompt(ctx) {
  return [
    "You are SAPA A.I, a practical money coach for Nigerian students and early workers.",
    "Tone: direct, helpful, lightly street-aware but respectful.",
    "Priorities: protect essentials first (rent, dues, transport, food basics), reduce leak spending, keep cash flow stable.",
    "Use concise plain language and specific action steps tied to available user data.",
    "If user asks for plan, provide numbered steps with realistic daily/weekly targets and expected outcome.",
    "When user asks for insight, explicitly reference numbers from the context.",
    "If user asks affordability, weigh due bills, rent, and current cash flow before answering.",
    "If uncertain, say assumptions briefly and ask one clear follow-up question.",
    "Never claim to execute transactions or account actions.",
    "",
    `Current user context (JSON): ${JSON.stringify(ctx)}`,
  ].join("\n");
}

function buildInput({ history = [], message, ctx }) {
  const recent = history.slice(-12);
  const chatTurns = recent.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: [{ type: "input_text", text: String(m.text || "") }],
  }));

  return [
    {
      role: "system",
      content: [{ type: "input_text", text: systemPrompt(ctx) }],
    },
    ...chatTurns,
    {
      role: "user",
      content: [{ type: "input_text", text: String(message || "") }],
    },
  ];
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const out = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of out) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if ((c?.type === "output_text" || c?.type === "text") && typeof c?.text === "string" && c.text.trim()) {
        return c.text.trim();
      }
    }
  }

  const firstChoice = payload?.choices?.[0];
  const legacy = firstChoice?.message?.content;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return "";
}

function endpointConfig() {
  const premiumRaw = String(import.meta.env.VITE_SAPA_AI_PREMIUM_ENABLED || "").trim().toLowerCase();
  const premiumEnabled = premiumRaw === "1" || premiumRaw === "true" || premiumRaw === "yes";
  const endpoint = String(import.meta.env.VITE_OPENAI_ENDPOINT || "").trim();
  const model = String(import.meta.env.VITE_OPENAI_MODEL || "gpt-5-mini").trim();
  return { premiumEnabled, endpoint, model };
}

export function isSapaAIPremiumEnabled() {
  const { premiumEnabled } = endpointConfig();
  return premiumEnabled;
}

export function isOpenAIConfigured() {
  const { premiumEnabled, endpoint } = endpointConfig();
  return premiumEnabled && Boolean(endpoint);
}

export async function askSapaOpenAI({ message, history = [], ctx = {} }) {
  const { premiumEnabled, endpoint, model } = endpointConfig();
  if (!premiumEnabled) {
    throw new Error("Premium AI is disabled.");
  }
  if (!endpoint) {
    throw new Error("AI endpoint not configured. Add VITE_OPENAI_ENDPOINT.");
  }

  const url = endpoint;
  const snap = contextSnapshot(ctx);
  const body = {
    model,
    input: buildInput({ history, message, ctx: snap }),
    max_output_tokens: 420,
  };

  const idToken = await auth?.currentUser?.getIdToken?.();
  if (!idToken) {
    throw new Error("Session expired. Please log in again.");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const errMsg = payload?.error?.message || `OpenAI request failed (${res.status}).`;
    throw new Error(errMsg);
  }

  const text = extractOutputText(payload);
  if (!text) throw new Error("OpenAI returned an empty response.");
  return {
    text,
    model: payload?.model || model,
    via: endpoint ? "endpoint" : "openai-direct",
  };
}
