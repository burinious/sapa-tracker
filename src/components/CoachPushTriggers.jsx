import { useEffect } from "react";
import { differenceInCalendarDays, format, getISOWeek, startOfDay } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { monthKey } from "../services/budgets";
import { queuePushNotification } from "../services/pushQueue";
import { getCachedSubscriptions, getCachedTransactions } from "../utils/localDashboardCache";
import { getMonthlyBudgetLocal } from "../utils/localBudgets";
import { getEntries } from "../utils/localEntries";
import { getFinance } from "../utils/localFinance";
import { getLoans } from "../utils/localLoans";
import { getShopping } from "../utils/localShopping";
import { normalizeNotificationPrefs } from "../utils/pushAreas";
import { computeCoachNotes } from "../features/coach/coachEngine";
import { deriveCoachInput } from "../features/coach/coachInputBuilder";

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function daysUntilDayOfMonth(day, now = new Date()) {
  const today = startOfDay(now);
  const y = today.getFullYear();
  const m = today.getMonth();
  const dueThisMonth = new Date(y, m, day);
  const due = dueThisMonth >= today ? dueThisMonth : new Date(y, m + 1, day);
  return differenceInCalendarDays(due, today);
}

export default function CoachPushTriggers() {
  const { user, profile } = useAuth();
  const uid = user?.uid || "";

  useEffect(() => {
    if (!uid) return;
    const prefs = normalizeNotificationPrefs(profile?.notificationPrefs);
    if (!prefs.enabled) return;

    let closed = false;

    (async () => {
      try {
        const now = new Date();
        const todayISO = format(now, "yyyy-MM-dd");
        const finance = getFinance(uid);
        const transactions = getCachedTransactions(uid);
        const entries = getEntries(uid);
        const loans = getLoans(uid);
        const shopping = getShopping(uid);
        const monthBudget = getMonthlyBudgetLocal(uid, monthKey(now));

        const coachInput = deriveCoachInput({
          now,
          profile,
          finance,
          transactions,
          entries,
          loans,
          shopping,
          monthBudget,
        });
        const coach = computeCoachNotes(coachInput);

        if (prefs.coachEntries) {
          const waitingEntry = coach.notes.some((n) => n.area === "coach_entries");
          if (waitingEntry) {
            await queuePushNotification(
              uid,
              {
                area: "coach_entries",
                title: "Sapa Coach",
                body: "Sapa Coach is expecting your entries.",
                route: "/entries/new",
                dedupeKey: "coach_entries_daily",
              },
              todayISO
            );
          }
        }

        if (prefs.billReminders) {
          const subs = getCachedSubscriptions(uid);
          const dueSoon = subs.filter((s) => {
            const due = parseDate(s?.nextDueDate);
            if (!due) return false;
            const days = differenceInCalendarDays(startOfDay(due), startOfDay(now));
            return days >= 0 && days <= 2;
          });

          if (dueSoon.length) {
            const total = dueSoon.reduce((sum, s) => sum + safeNum(s?.amount, 0), 0);
            const earliestDue = dueSoon
              .map((s) => parseDate(s?.nextDueDate))
              .filter(Boolean)
              .sort((a, b) => a - b)[0];

            const period = earliestDue ? format(earliestDue, "yyyy-MM-dd") : todayISO;
            await queuePushNotification(
              uid,
              {
                area: "bill_reminders",
                title: "Bills are due soon",
                body: `${dueSoon.length} bill(s) are approaching. Estimated total: NGN ${Math.round(total).toLocaleString("en-NG")}.`,
                route: "/subscriptions",
                dedupeKey: "bills_due_soon",
              },
              period
            );
          }
        }

        if (prefs.loanReminders) {
          const activeLoans = loans.filter((l) => (l?.status || "active") === "active");
          const dueSoonLoans = activeLoans.filter((loan) => {
            const day = Math.max(1, Math.min(31, Math.floor(safeNum(loan?.dueDay, 28))));
            const days = daysUntilDayOfMonth(day, now);
            return days >= 0 && days <= 2;
          });

          if (dueSoonLoans.length) {
            const owed = dueSoonLoans.reduce((sum, loan) => sum + safeNum(loan?.balance ?? loan?.principal, 0), 0);
            const soonestDay = dueSoonLoans
              .map((loan) => Math.max(1, Math.min(31, Math.floor(safeNum(loan?.dueDay, 28)))))
              .sort((a, b) => a - b)[0];

            await queuePushNotification(
              uid,
              {
                area: "loan_reminders",
                title: "Loan reminder",
                body: `${dueSoonLoans.length} loan payment(s) are close. Outstanding around NGN ${Math.round(owed).toLocaleString("en-NG")}.`,
                route: "/loans",
                dedupeKey: "loan_due_soon",
              },
              `${format(now, "yyyy-MM")}-d${soonestDay}`
            );
          }
        }

        if (prefs.weeklyDigest) {
          const week = `${now.getFullYear()}-W${String(getISOWeek(now)).padStart(2, "0")}`;
          const isDigestDay = now.getDay() === 1;
          if (isDigestDay) {
            await queuePushNotification(
              uid,
              {
                area: "weekly_digest",
                title: "Weekly money digest",
                body: `Risk ${coach.sapaRisk}/100, runway ${coach.runwayDays.toFixed(1)} days. Open Coach for this week's plan.`,
                route: "/coach",
                dedupeKey: "weekly_digest",
              },
              week
            );
          }
        }
      } catch (err) {
        if (!closed) {
          console.warn("Coach push trigger failed:", err?.message || err);
        }
      }
    })();

    return () => {
      closed = true;
    };
  }, [uid, profile?.notificationPrefs, profile]);

  return null;
}
