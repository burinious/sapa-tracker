import { format, subDays } from "date-fns";

function safeNum(x, fallback = 0) {
  if (x === null || x === undefined || x === "") return fallback;
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(x, min, max, fallback) {
  const n = Math.floor(safeNum(x, fallback));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseDateLike(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    return Number.isNaN(d?.getTime?.()) ? null : d;
  }
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const raw = v.length <= 10 ? `${v}T00:00:00` : v;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function maxDate(items = [], pickDate) {
  let latest = null;
  for (const item of items) {
    const d = parseDateLike(pickDate(item));
    if (!d) continue;
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

function normalizeText(s) {
  return String(s || "").toLowerCase();
}

function isWorkoutEntry(entry) {
  const text = `${entry?.title || ""} ${entry?.text || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase();
  return /(workout|exercise|gym|jog|run|training|walk)/i.test(text);
}

function isBreakfastEntry(entry) {
  const text = `${entry?.title || ""} ${entry?.text || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase();
  return /(breakfast|morning meal|brkfast)/i.test(text);
}

function isHomeAuditEntry(entry) {
  const text = `${entry?.title || ""} ${entry?.text || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase();
  return /(home audit|house audit|inventory|stock check|restock check)/i.test(text);
}

function entryDate(entry) {
  return (
    parseDateLike(entry?.date) ||
    parseDateLike(entry?.updatedAtISO) ||
    parseDateLike(entry?.createdAtISO) ||
    parseDateLike(entry?.updatedAt) ||
    parseDateLike(entry?.createdAt)
  );
}

function txDate(tx) {
  return (
    parseDateLike(tx?.date) ||
    parseDateLike(tx?.updatedAtISO) ||
    parseDateLike(tx?.createdAtISO) ||
    parseDateLike(tx?.updatedAt) ||
    parseDateLike(tx?.createdAt) ||
    parseDateLike(tx?.timestamp)
  );
}

function isBetTransaction(tx) {
  const hay = `${tx?.categoryName || ""} ${tx?.category || ""} ${tx?.title || ""} ${tx?.note || ""}`;
  return /(bet|betting|gambl|sporty|bookmaker)/i.test(normalizeText(hay));
}

export function deriveCoachInput({
  now = new Date(),
  profile = null,
  computed = null,
  finance = null,
  transactions = [],
  entries = [],
  loans = [],
  shopping = [],
  monthBudget = null,
} = {}) {
  const todayISO = format(now, "yyyy-MM-dd");
  const weekStart = subDays(now, 6);

  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeShopping = Array.isArray(shopping) ? shopping : [];

  const entryLastAt = maxDate(safeEntries, (e) => entryDate(e));
  const breakfastLoggedToday = safeEntries.some((e) => {
    const d = entryDate(e);
    return d && format(d, "yyyy-MM-dd") === todayISO && isBreakfastEntry(e);
  });

  const workoutsLast7Days = new Set(
    safeEntries
      .filter((e) => {
        const d = entryDate(e);
        return d && d >= weekStart && isWorkoutEntry(e);
      })
      .map((e) => format(entryDate(e), "yyyy-MM-dd"))
  ).size;

  const lastHomeAuditAt = maxDate(
    safeEntries.filter((e) => isHomeAuditEntry(e)),
    (e) => entryDate(e)
  );

  const lastShoppingAt = maxDate(safeShopping, (item) => item?.updatedAtISO || item?.createdAtISO);

  const activeLoans = safeLoans.filter((l) => (l?.status || "active") === "active");
  const totalLoanOwed = activeLoans.reduce((sum, loan) => sum + safeNum(loan?.balance ?? loan?.principal ?? 0), 0);

  const betBudgetMonthly = safeNum(monthBudget?.categoryBudgets?.bet ?? 0);
  const thisMonth = format(now, "yyyy-MM");
  const betSpentMonthly = safeTx.reduce((sum, tx) => {
    const d = txDate(tx);
    if (!d) return sum;
    if (format(d, "yyyy-MM") !== thisMonth) return sum;
    if (String(tx?.type || "").toLowerCase() !== "expense") return sum;
    if (!isBetTransaction(tx)) return sum;
    return sum + safeNum(tx?.amount ?? 0);
  }, 0);

  const profileCash = safeNum(profile?.cashAtHand, null);
  const financeCash = safeNum(finance?.cashAtHand, null);
  const computedCash = safeNum(computed?.cashApprox ?? null, null);
  const manualCash = profileCash ?? financeCash;

  const paydayDay = clampInt(profile?.primaryIncome?.payday ?? 28, 1, 31, 28);
  const dailyFloor = Math.max(
    1000,
    safeNum(monthBudget?.dailyFloor ?? profile?.spendingPrefs?.dailySpendCap ?? 12000, 12000)
  );

  return {
    now,
    paydayDay,
    dailyFloor,
    manualCash,
    computedCash,
    totalLoanOwed,
    betBudgetMonthly,
    betSpentMonthly,
    workoutsLast7Days,
    entryLastAt,
    breakfastLoggedToday,
    lastShoppingAt,
    lastHomeAuditAt,
  };
}
