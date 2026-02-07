const money = (n) => `₦${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pick = (arr, fallback = "") => (arr?.length ? arr[Math.floor(Math.random() * arr.length)] : fallback);

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function runwayDays(cashAtHand, avgDailySpend7) {
  const cash = Number(cashAtHand || 0);
  const daily = Number(avgDailySpend7 || 0);
  if (daily <= 0) return null;
  return Math.floor(cash / daily);
}

function topLeak(computed) {
  const top = computed?.topCats?.[0];
  return top
    ? { name: top.name, amount: Number(top.amount || 0), count: top.count || 0 }
    : { name: "spending", amount: 0, count: 0 };
}

function shortCtx(ctx) {
  const cash = Number(ctx?.cashAtHand ?? ctx?.profile?.cashAtHand ?? 0);
  const avg = Number(ctx?.computed?.avgDailySpend7 ?? 0);
  const due = Number(ctx?.computed?.dueTotal ?? 0);
  const run = runwayDays(cash, avg);
  const top = topLeak(ctx?.computed);
  return { cash, avg, due, run, top };
}

const INTENTS = [
  {
    id: "rent_possible",
    keywords: ["rent", "pay rent", "renew rent", "landlord"],
    build: (ctx) => {
      const { cash, avg, due, run, top } = shortCtx(ctx);
      const headline = cash > 0 ? "Yes, rent still dey possible." : "E still possible, but e tight.";
      const runwayLine = run === null ? "" : `At this pace, you get about ~${run} days runway.`;

      const dailyCap = money(clamp(avg || 5000, 1500, 15000));
      const steps = [
        `Cut ${top.name} by 30–40% till rent lands.`,
        `Set daily cap: ${dailyCap}. Once you hit am, stop.`,
        due > 0 ? `Bills due soon: ${money(due)}. Prioritize rent first.` : `Pause non-essentials for 7 days.`,
        "Cook more, buy food less. Food fit behave like rent if you no watch am.",
      ];

      return {
        text:
          `${headline}\n` +
          `What I’m seeing: cash ${money(cash)}; avg/day ${money(avg)}. ${runwayLine}\n` +
          `Biggest leak now: ${top.name}.\n\n` +
          `Do this now:\n- ${steps.join("\n- ")}\n\n` +
          `If you hold this for 14 days, rent go breathe.`,
        actions: [{ label: "Open Dashboard", route: "/dashboard" }],
      };
    },
  },

  {
    id: "pause_subscription",
    keywords: ["postpone", "pause", "cancel", "netflix", "spotify", "showmax", "prime", "renewal", "subscription"],
    build: (ctx, msg) => {
      const { cash, due } = shortCtx(ctx);
      const m = norm(msg);
      const what =
        m.includes("netflix") ? "Netflix" :
        m.includes("spotify") ? "Spotify" :
        m.includes("showmax") ? "Showmax" :
        m.includes("prime") ? "Prime" :
        "that subscription";

      const plan = [
        `Pause ${what} till after rent/bills.`,
        `If you must keep it, switch to cheaper tier for this month.`,
        `Resume on payday, not random date.`,
      ];

      return {
        text:
          `No wahala. ${what} no be enemy, but timing matters.\n` +
          `What I’m seeing: cash ${money(cash)}${due ? `; bills soon ${money(due)}` : ""}.\n\n` +
          `Options:\n- ${plan.join("\n- ")}\n\n` +
          `Quick win: any subscription wey you no use for 7–14 days, pause am.`,
        actions: [{ label: "Manage Subscriptions", route: "/subscriptions" }],
      };
    },
  },

  {
    id: "broke_mid_month",
    keywords: ["broke", "mid month", "mid-month", "sapa", "pressure", "no money", "red zone"],
    build: (ctx) => {
      const { avg, top } = shortCtx(ctx);
      const fixes = [
        "Split money into weekly buckets (Week 1–4).",
        `Cap ${top.name}. If you no cap am, e go cap you.`,
        "Batch purchases (groceries twice/week, not daily).",
        "No spending after 9pm for 14 days (impulse killer).",
      ];
      return {
        text:
          `Your money is doing fast-fast exit.\n` +
          `Top leak: ${top.name}. Avg/day: ${money(avg)}.\n\n` +
          `Fix:\n- ${fixes.join("\n- ")}\n\n` +
          `Quick win: pick ONE leak category and cut it 30% this week.`,
        actions: [{ label: "See Insights", route: "/dashboard#insights" }],
      };
    },
  },

  {
    id: "buy_big_item",
    keywords: ["buy", "purchase", "ps5", "ipad", "laptop", "ac", "air conditioner", "generator", "iphone"],
    build: (ctx, msg) => {
      const { cash, avg, due, run, top } = shortCtx(ctx);
      const m = norm(msg);
      const item =
        m.includes("ps5") ? "PS5" :
        m.includes("ipad") ? "iPad" :
        m.includes("laptop") ? "laptop" :
        (m.includes("ac") || m.includes("air conditioner")) ? "AC" :
        m.includes("generator") ? "generator" :
        m.includes("iphone") ? "iPhone" :
        "that item";

      const caution =
        run !== null && run <= 10
          ? "Runway short. Buying now fit cause pressure."
          : "Possible, but we need structure.";

      const plan = [
        "Use installment: pay deposit now, spread the rest.",
        `Cut ${top.name} temporarily to free cash.`,
        "Buy after your bills window, not inside it.",
      ];

      return {
        text:
          `For ${item}: ${pick(["Depends.", "Possible, but plan am.", "Yes, but no rush."])}\n` +
          `What I’m seeing: cash ${money(cash)}; avg/day ${money(avg)}; bills soon ${money(due)}.\n` +
          `${caution}\n\n` +
          `Plan:\n- ${plan.join("\n- ")}\n\n` +
          `Quick win: set target date + weekly saving amount.`,
        actions: [{ label: "Open Dashboard", route: "/dashboard" }],
      };
    },
  },

  {
    id: "food_overspend",
    keywords: ["food", "eating out", "buy food", "cook", "shawarma", "restaurant", "groceries"],
    build: () => {
      const fixes = [
        "Cook 3–4 days/week (batch cook).",
        "Grocery run 1–2 times/week (not daily).",
        "If you must buy food, cap it: 2 times/week.",
        "Swap snacks/soft drinks for water/fruits for 7 days.",
      ];
      return {
        text:
          `Food fit behave like rent if you no watch am.\n\n` +
          `Do this:\n- ${fixes.join("\n- ")}\n\n` +
          `Quick win: cook once, eat twice.`,
        actions: [{ label: "Open Insights", route: "/dashboard#insights" }],
      };
    },
  },
];

function fallback(ctx) {
  const { cash, avg, top } = shortCtx(ctx);
  const suggestions = [
    "Try: “is paying rent still a possibility?”",
    "Try: “postpone netflix”",
    "Try: “why I dey broke mid-month?”",
    "Try: “can I buy PS5 now?”",
    "Try: “help me reduce food spending”",
  ];
  return {
    text:
      `I hear you.\n` +
      `Quick snapshot: cash ${money(cash)}, avg/day ${money(avg)}, top leak ${top.name}.\n\n` +
      `${pick(suggestions)}\n` +
      `Tell me your goal (rent/savings/purchase) and I’ll give you a plan.`,
    intent: "fallback",
    confidence: 0.2,
    actions: [{ label: "Open Dashboard", route: "/dashboard" }],
  };
}

function matchIntent(message) {
  const m = norm(message);
  let best = { intent: null, score: 0 };

  for (const intent of INTENTS) {
    let score = 0;
    for (const k of intent.keywords) {
      const re = new RegExp(k, "i");
      if (re.test(m)) score += 1;
    }
    if (score > best.score) best = { intent, score };
  }

  if (!best.intent) return null;
  return { intent: best.intent, confidence: clamp(best.score / 4, 0.25, 0.95) };
}

export function sapaReply({ message, ctx } = {}) {
  const hit = matchIntent(message || "");
  if (!hit) return fallback(ctx);

  const built = hit.intent.build(ctx, message);
  return {
    text: built.text,
    intent: hit.intent.id,
    confidence: hit.confidence,
    actions: built.actions || [],
  };
}

export const SAPA_INTENTS_COUNT = INTENTS.length;
