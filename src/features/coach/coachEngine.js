import { differenceInCalendarDays } from "date-fns";

const PRIORITY_WEIGHT = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function note({ area, type, priority, title, message, action }) {
  return {
    id: `${area}_${Math.random().toString(36).slice(2, 9)}`,
    area,
    type,
    priority,
    title,
    message,
    action: action || null,
    weight: PRIORITY_WEIGHT[priority] || 1,
  };
}

export function computeCoachNotes({
  now = new Date(),
  paydayDay = 28,
  dailyFloor = 12000,
  manualCash = null,
  computedCash = null,
  totalLoanOwed = 0,
  betBudgetMonthly = 0,
  betSpentMonthly = 0,
  workoutsLast7Days = 0,
  entryLastAt = null,
  breakfastLoggedToday = false,
  lastShoppingAt = null,
  lastHomeAuditAt = null,
} = {}) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const paydayThisMonth = new Date(now.getFullYear(), now.getMonth(), clamp(n(paydayDay, 28), 1, 31));
  const payday = paydayThisMonth >= today
    ? paydayThisMonth
    : new Date(now.getFullYear(), now.getMonth() + 1, clamp(n(paydayDay, 28), 1, 31));

  const cash = n(manualCash ?? computedCash ?? 0);
  const floor = Math.max(1, n(dailyFloor, 12000));
  const daysToPayday = Math.max(0, differenceInCalendarDays(payday, today));
  const runwayDays = cash > 0 ? cash / floor : 0;

  const notes = [];

  const entryMissing = !entryLastAt || (now.getTime() - new Date(entryLastAt).getTime()) > 24 * 60 * 60 * 1000;
  if (entryMissing) {
    notes.push(
      note({
        area: "coach_entries",
        type: "REMINDER",
        priority: "HIGH",
        title: "Coach check-in needed",
        message: "Sapa Coach is expecting your entries. Add a quick money update now.",
        action: "/entries/new",
      })
    );
  }

  const hhmm = now.getHours() * 60 + now.getMinutes();
  if (hhmm >= 10 * 60 + 30 && !breakfastLoggedToday) {
    notes.push(
      note({
        area: "coach_breakfast",
        type: "REMINDER",
        priority: "MEDIUM",
        title: "Breakfast not logged",
        message: "You are past 10:30 and no breakfast entry was found. Keep your routine log accurate.",
        action: "/entries/new",
      })
    );
  }

  if (workoutsLast7Days < 4) {
    notes.push(
      note({
        area: "coach_workout",
        type: "NUDGE",
        priority: "MEDIUM",
        title: "Workout target not reached",
        message: `You need ${4 - workoutsLast7Days} more workout session(s) this week.`,
        action: "/entries/new",
      })
    );
  } else {
    notes.push(
      note({
        area: "coach_workout",
        type: "PRAISE",
        priority: "LOW",
        title: "Workout consistency is good",
        message: "Great streak. Keep this health discipline steady.",
        action: "/coach",
      })
    );
  }

  const betBudget = Math.max(0, n(betBudgetMonthly, 0));
  const betSpent = Math.max(0, n(betSpentMonthly, 0));
  const betPct = betBudget > 0 ? betSpent / betBudget : 0;
  if (betBudget > 0 && betPct >= 1) {
    notes.push(
      note({
        area: "coach_betting",
        type: "WARNING",
        priority: "HIGH",
        title: "Bet budget exceeded",
        message: "Your betting spend is above budget. Pause betting and reset your budget.",
        action: "/budgets",
      })
    );
  } else if (betBudget > 0 && betPct >= 0.8) {
    notes.push(
      note({
        area: "coach_betting",
        type: "WARNING",
        priority: "MEDIUM",
        title: "Bet budget is near limit",
        message: "You are at 80%+ of your betting cap this month.",
        action: "/budgets",
      })
    );
  }

  if (runwayDays >= daysToPayday) {
    notes.push(
      note({
        area: "coach_runway",
        type: "REASSURE",
        priority: "LOW",
        title: "Runway looks stable",
        message: "Your current cash pace should carry you to payday.",
        action: "/dashboard",
      })
    );
  } else {
    notes.push(
      note({
        area: "coach_runway",
        type: "WARNING",
        priority: "HIGH",
        title: "Runway is short",
        message: `At about NGN ${Math.round(floor).toLocaleString("en-NG")}/day, current cash may not reach payday.`,
        action: "/budgets",
      })
    );
  }

  const loanOwed = Math.max(0, n(totalLoanOwed, 0));
  if (loanOwed > 0) {
    const ratio = cash > 0 ? loanOwed / cash : Number.POSITIVE_INFINITY;
    if (ratio >= 2) {
      notes.push(
        note({
          area: "coach_loans",
          type: "WARNING",
          priority: "HIGH",
          title: "Debt pressure is high",
          message: `Active loan balance is NGN ${Math.round(loanOwed).toLocaleString("en-NG")} and needs a payoff plan.`,
          action: "/loans",
        })
      );
    } else {
      notes.push(
        note({
          area: "coach_loans",
          type: "NUDGE",
          priority: "MEDIUM",
          title: "Active loan needs tracking",
          message: `You still owe NGN ${Math.round(loanOwed).toLocaleString("en-NG")}. Keep payments on schedule.`,
          action: "/loans",
        })
      );
    }
  }

  if (lastShoppingAt) {
    const daysSinceShopping = differenceInCalendarDays(today, new Date(lastShoppingAt));
    if (daysSinceShopping > 14) {
      notes.push(
        note({
          area: "coach_shopping",
          type: "NUDGE",
          priority: "LOW",
          title: "House shopping review due",
          message: `It has been ${daysSinceShopping} days since your last shopping update.`,
          action: "/house-shopping",
        })
      );
    }
  }

  if (lastHomeAuditAt) {
    const daysSinceAudit = differenceInCalendarDays(today, new Date(lastHomeAuditAt));
    if (daysSinceAudit > 30) {
      notes.push(
        note({
          area: "coach_home_audit",
          type: "NUDGE",
          priority: "LOW",
          title: "Home audit overdue",
          message: `Last home audit was ${daysSinceAudit} days ago. Do a quick home-check log.`,
          action: "/entries/new",
        })
      );
    }
  }

  const sapaRisk = clamp(
    Math.round(
      (runwayDays < daysToPayday ? 35 : 10) +
        (betPct >= 0.8 ? 20 : 0) +
        (loanOwed > 0 ? 15 : 0) +
        (workoutsLast7Days < 4 ? 10 : 0)
    ),
    0,
    100
  );

  const sapaColor = sapaRisk <= 35 ? "GREEN" : sapaRisk <= 65 ? "YELLOW" : "RED";

  const sorted = [...notes].sort((a, b) => b.weight - a.weight || a.title.localeCompare(b.title));

  return {
    notes: sorted,
    sapaRisk,
    sapaColor,
    daysToPayday,
    runwayDays,
  };
}
