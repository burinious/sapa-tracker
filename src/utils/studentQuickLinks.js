export const STUDENT_QUICK_LINKS = [
  {
    id: "addExpense",
    label: "Add Expense",
    description: "Log spend instantly",
  },
  {
    id: "setDailyPlan",
    label: "Daily Target",
    description: "Set your daily budget",
  },
  {
    id: "spendReview",
    label: "Spending",
    description: "Review your money flow",
  },
  {
    id: "coachPulse",
    label: "Coach Pulse",
    description: "See sapa risk now",
  },
  {
    id: "dueBills",
    label: "Bills Due",
    description: "Avoid surprise debits",
  },
  {
    id: "customize",
    label: "Customize",
    description: "Choose what you see",
  },
];

export const STUDENT_QUICK_LINK_DEFAULTS = STUDENT_QUICK_LINKS.reduce((acc, item) => {
  acc[item.id] = true;
  return acc;
}, {});

export const STUDENT_QUICK_LINK_ORDER = STUDENT_QUICK_LINKS.map((item) => item.id);

export function normalizeStudentQuickLinks(raw = {}) {
  const out = { ...STUDENT_QUICK_LINK_DEFAULTS };
  for (const key of Object.keys(out)) {
    if (typeof raw?.[key] === "boolean") {
      out[key] = raw[key];
    }
  }
  return out;
}

export function normalizeStudentQuickLinkOrder(raw = []) {
  if (!Array.isArray(raw)) return [...STUDENT_QUICK_LINK_ORDER];
  const validSet = new Set(STUDENT_QUICK_LINK_ORDER);
  const seen = new Set();
  const ordered = [];

  for (const id of raw) {
    if (validSet.has(id) && !seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }

  for (const id of STUDENT_QUICK_LINK_ORDER) {
    if (!seen.has(id)) ordered.push(id);
  }

  return ordered;
}
