export function fmtMoney(amount = 0, currency = "NGN") {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    // Fallback (if Intl currency fails)
    return `${currency} ${n.toLocaleString()}`;
  }
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
