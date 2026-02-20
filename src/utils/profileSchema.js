export const DEFAULT_PROFILE = {
  // Identity
  fullName: "",
  username: "",
  gender: "",            // optional: "male" | "female" | "nonbinary" | etc
  pronouns: "",          // e.g. "he/him"
  dateOfBirth: "",       // "YYYY-MM-DD"

  // Locale
  currency: "NGN",
  timezone: "Africa/Lagos",

  // Finance baseline (optional but useful)
  cashAtHand: 0,

  // Income
  primaryIncome: {
    amount: 0,
    frequency: "monthly", // "daily" | "weekly" | "monthly" | "yearly"
    payday: 25,           // day of month for monthly income (optional)
    nextPayDate: ""       // "YYYY-MM-DD" optional
  },
  salary: {
    amount: 0,
    frequency: "monthly",
    payday: 25,
    nextPayDate: ""
  },
  otherIncomes: [
    // Example:
    // { source: "Design gigs", amount: 35000, frequency: "monthly", payday: 15, note: "Freelance", active: true }
  ],

  // Rent (treat as VIP bill)
  rent: {
    amount: 0,
    frequency: "yearly",   // "monthly" | "yearly"
    nextDueDate: "",       // "YYYY-MM-DD"
    reminderDays: [60, 30, 14]
  },

  // Fixed bills/subscriptions
  fixedBills: [
    // Example object:
    // { name:"Electricity", amount:15000, frequency:"monthly", dueDay:10, category:"Utilities", provider:"Disco", status:"active", autopay:false }
  ],

  // Preferences (helps SAPA A.I vibe)
  spendingPrefs: {
    foodStyle: "mix",         // "cookMostly" | "mix" | "buyMostly"
    transportStyle: "mixed",  // "public" | "rideHail" | "mixed"
    dailySpendCap: 0,         // 0 means not set
    savingsGoalMonthly: 0
  },

  // SAPA A.I config
  aiTone: "street",           // "street" | "coach" | "corporate"
  sensitiveMode: false,       // avoid judgmental phrasing

  // Notification preferences
  notificationPrefs: {
    enabled: true,
    coachEntries: true,
    billReminders: true,
    loanReminders: true,
    weeklyDigest: true,
  },

  // Metadata
  createdAt: null,
  updatedAt: null
};

export const DEFAULT_BILLS_NG = [
  { name: "Electricity", amount: 0, frequency: "monthly", dueDay: 10, category: "Utilities", provider: "Disco", status: "active", autopay: false },
  { name: "Data/Internet", amount: 0, frequency: "monthly", dueDay: 5, category: "Utilities", provider: "ISP", status: "active", autopay: false },
  { name: "Netflix", amount: 0, frequency: "monthly", dueDay: 5, category: "Entertainment", provider: "Netflix", status: "inactive", autopay: false },
];

export function normalizeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeDay(x, fallback = 1) {
  const n = Math.floor(Number(x));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(31, n));
}

export function safeDateStr(s) {
  // keep it simple: accept YYYY-MM-DD or empty
  if (!s) return "";
  return String(s).slice(0, 10);
}

export function mergeDefaults(existing = {}) {
  const legacyName =
    (typeof existing.fullName === "string" && existing.fullName.trim()) ||
    (typeof existing.name === "string" && existing.name.trim()) ||
    (typeof existing.displayName === "string" && existing.displayName.trim()) ||
    "";
  const legacyUsername =
    (typeof existing.username === "string" && existing.username.trim()) ||
    (typeof existing.storeName === "string" && existing.storeName.trim()) ||
    (typeof existing.email === "string" && existing.email.includes("@")
      ? existing.email.split("@")[0]
      : "");

  // shallow merge + nested objects merge
  const p = { ...DEFAULT_PROFILE, ...existing };

  p.primaryIncome = {
    ...DEFAULT_PROFILE.primaryIncome,
    ...(existing.primaryIncome || {}),
    amount: Number(
      existing?.primaryIncome?.amount ??
      existing?.salary?.amount ??
      DEFAULT_PROFILE.primaryIncome.amount
    ) || 0,
    frequency:
      existing?.primaryIncome?.frequency ||
      existing?.salary?.frequency ||
      DEFAULT_PROFILE.primaryIncome.frequency,
    payday: Math.max(
      1,
      Math.min(
        31,
        Math.floor(
          Number(
            existing?.primaryIncome?.payday ??
            existing?.salary?.payday ??
            DEFAULT_PROFILE.primaryIncome.payday
          ) || DEFAULT_PROFILE.primaryIncome.payday
        )
      )
    ),
    nextPayDate: safeDateStr(
      existing?.primaryIncome?.nextPayDate ??
      existing?.salary?.nextPayDate ??
      DEFAULT_PROFILE.primaryIncome.nextPayDate
    ),
  };
  p.salary = {
    ...DEFAULT_PROFILE.salary,
    ...(existing.salary || {}),
    amount: Number(
      existing?.salary?.amount ??
      existing?.primaryIncome?.amount ??
      DEFAULT_PROFILE.salary.amount
    ) || 0,
    frequency:
      existing?.salary?.frequency ||
      existing?.primaryIncome?.frequency ||
      DEFAULT_PROFILE.salary.frequency,
    payday: Math.max(
      1,
      Math.min(
        31,
        Math.floor(
          Number(
            existing?.salary?.payday ??
            existing?.primaryIncome?.payday ??
            DEFAULT_PROFILE.salary.payday
          ) || DEFAULT_PROFILE.salary.payday
        )
      )
    ),
    nextPayDate: safeDateStr(
      existing?.salary?.nextPayDate ??
      existing?.primaryIncome?.nextPayDate ??
      DEFAULT_PROFILE.salary.nextPayDate
    ),
  };
  p.rent = { ...DEFAULT_PROFILE.rent, ...(existing.rent || {}) };
  p.spendingPrefs = { ...DEFAULT_PROFILE.spendingPrefs, ...(existing.spendingPrefs || {}) };
  p.notificationPrefs = { ...DEFAULT_PROFILE.notificationPrefs, ...(existing.notificationPrefs || {}) };
  const rawOtherIncomes = Array.isArray(existing.otherIncomes)
    ? existing.otherIncomes
    : (Array.isArray(existing.otherIncome) ? existing.otherIncome : []);
  p.otherIncomes = rawOtherIncomes
    .map((x) => ({
      source: String(x?.source || x?.name || "").trim(),
      amount: normalizeNumber(x?.amount, 0),
      frequency: x?.frequency || "monthly",
      payday: normalizeDay(x?.payday ?? x?.day ?? 1, 1),
      note: String(x?.note || "").trim(),
      active: x?.active !== false,
    }))
    .filter((x) => x.source || x.amount > 0);
  p.fullName = String(p.fullName || legacyName || "").trim();
  p.username = String(p.username || legacyUsername || "").trim();

  // fixedBills should be array; if missing, keep empty
  p.fixedBills = Array.isArray(existing.fixedBills) ? existing.fixedBills : (DEFAULT_PROFILE.fixedBills || []);

  return p;
}
