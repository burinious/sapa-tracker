import { format, parseISO, differenceInCalendarDays } from "date-fns";

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function daysUntil(isoDate) {
  if (!isoDate) return null;
  try {
    const d = parseISO(isoDate);
    return differenceInCalendarDays(d, new Date());
  } catch {
    return null;
  }
}

export function humanDueLabel(days) {
  if (days == null) return "";
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}
