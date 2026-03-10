export const INCOME_CATEGORIES = Object.freeze([
  "Salary",
  "Gift",
  "Freelance",
  "Business",
  "Investment",
  "Other",
]);

export const EXPENSE_CATEGORIES = Object.freeze([
  "Food",
  "Transport",
  "Data",
  "Bills",
  "Shopping",
  "Health",
  "Entertainment",
  "Education",
  "Other",
]);

const CATEGORY_MAP = {
  income: new Map(INCOME_CATEGORIES.map((name) => [normalizeKey(name), name])),
  expense: new Map(EXPENSE_CATEGORIES.map((name) => [normalizeKey(name), name])),
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isValidTransactionType(type) {
  return type === "income" || type === "expense";
}

export function getCategoriesByType(type) {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function normalizeCategory(type, category) {
  if (!isValidTransactionType(type)) return "";
  return CATEGORY_MAP[type].get(normalizeKey(category)) || "";
}

export function normalizeOptionalText(value, maxLen = 200) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}
