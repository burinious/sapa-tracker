export const DEFAULT_PROFILE = {
  // Identity
  fullName: "",
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
  // shallow merge + nested objects merge
  const p = { ...DEFAULT_PROFILE, ...existing };

  p.primaryIncome = { ...DEFAULT_PROFILE.primaryIncome, ...(existing.primaryIncome || {}) };
  p.rent = { ...DEFAULT_PROFILE.rent, ...(existing.rent || {}) };
  p.spendingPrefs = { ...DEFAULT_PROFILE.spendingPrefs, ...(existing.spendingPrefs || {}) };

  // fixedBills should be array; if missing, keep empty
  p.fixedBills = Array.isArray(existing.fixedBills) ? existing.fixedBills : (DEFAULT_PROFILE.fixedBills || []);

  return p;
}
