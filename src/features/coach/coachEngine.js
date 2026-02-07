import { differenceInCalendarDays } from "date-fns";

export function computeCoachNotes({
  now = new Date(),
  paydayDay = 28,
  dailyFloor = 12000,
  manualCash = null,
  computedCash = null,
  totalLoanOwed = 0,
  betBudgetMonthly = 50000,
  betSpentMonthly = 0,
  workoutsLast7Days = 0,
  entryLastAt = null, // Date
  breakfastLoggedToday = false,
  lastShoppingAt = null, // Date
  lastHomeAuditAt = null // Date
}) {
  const cash = (manualCash ?? computedCash ?? 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const payday = new Date(now.getFullYear(), now.getMonth(), paydayDay);
  const paydayNext = payday >= today ? payday : new Date(now.getFullYear(), now.getMonth()+1, paydayDay);

  const daysToPayday = Math.max(0, differenceInCalendarDays(paydayNext, today));
  const runwayDays = dailyFloor > 0 ? (cash / dailyFloor) : 999;

  const notes = [];

  // Entry missing (24hrs)
  if (!entryLastAt || (now.getTime() - entryLastAt.getTime()) > 24 * 60 * 60 * 1000) {
    notes.push({
      type: "REMINDER",
      priority: "HIGH",
      title: "No entry in 24hrs",
      message: "Guy you never drop entry for 24hrs. 30 seconds gist make we update record.",
      action: "/entries/new"
    });
  }

  // Breakfast missing after 10:30
  const hhmm = now.getHours() * 60 + now.getMinutes();
  if (hhmm >= (10*60+30) && !breakfastLoggedToday) {
    notes.push({
      type: "REMINDER",
      priority: "MEDIUM",
      title: "Breakfast no show",
      message: "You never chop breakfast o. Even if na small, log am.",
      action: "/entries/new"
    });
  }

  // Exercise target 4x/week
  if (workoutsLast7Days < 4) {
    notes.push({
      type: "NUDGE",
      priority: "MEDIUM",
      title: "Exercise target",
      message: `Exercise no reach target this week. You need ${4 - workoutsLast7Days} more session(s).`,
      action: "/coach"
    });
  } else {
    notes.push({
      type: "PRAISE",
      priority: "LOW",
      title: "Exercise steady",
      message: "Your exercise dey regular. Body go thank you.",
      action: "/coach"
    });
  }

  // Betting budget
  const betPct = betBudgetMonthly > 0 ? (betSpentMonthly / betBudgetMonthly) : 0;
  if (betPct >= 1) {
    notes.push({
      type: "WARNING",
      priority: "HIGH",
      title: "Bet budget don pass",
      message: "Guy you don pass betting budget. Freeze betting first.",
      action: "/budgets"
    });
  } else if (betPct >= 0.8) {
    notes.push({
      type: "WARNING",
      priority: "MEDIUM",
      title: "Bet budget near cap",
      message: "Betting don near cap (80%). Calm down make e no enter red.",
      action: "/budgets"
    });
  } else {
    notes.push({
      type: "PRAISE",
      priority: "LOW",
      title: "Bet budget safe",
      message: "You have not spent the budget you have for bet. Respect.",
      action: "/budgets"
    });
  }

  // Salary soon + runway
  if (runwayDays >= daysToPayday) {
    notes.push({
      type: "REASSURE",
      priority: "LOW",
      title: "Runway OK",
      message: `You are still within budget. Salary should enter soon (28th). You will be fine.`,
      action: "/coach"
    });
  } else {
    notes.push({
      type: "WARNING",
      priority: "HIGH",
      title: "Runway short",
      message: `Guy, if you dey spend normal ₦${dailyFloor}/day, cash no go reach 28th. Reduce spending or plan inflow.`,
      action: "/coach"
    });
  }

  // Loans pressure
  if (totalLoanOwed > 0) {
    const ratio = cash > 0 ? (totalLoanOwed / cash) : Infinity;
    if (ratio >= 2) {
      notes.push({
        type: "WARNING",
        priority: "HIGH",
        title: "Loan trouble signal",
        message: `You are owing ₦${Math.round(totalLoanOwed).toLocaleString()} and cash is ₦${Math.round(cash).toLocaleString()} (debt heavy pass cash). Make we strategise payment.`,
        action: "/loans"
      });
    } else {
      notes.push({
        type: "NUDGE",
        priority: "MEDIUM",
        title: "Loan active",
        message: `Guy you still dey owe ₦${Math.round(totalLoanOwed).toLocaleString()}. No forget say 28th dey always come.`,
        action: "/loans"
      });
    }
  }

  // Shopping overdue (14 days)
  if (lastShoppingAt) {
    const ds = differenceInCalendarDays(today, new Date(lastShoppingAt));
    if (ds > 14) {
      notes.push({
        type: "NUDGE",
        priority: "LOW",
        title: "Shopping overdue",
        message: `It’s been ${ds} days you do shopping. You dey manage? Plan small restock.`,
        action: "/entries"
      });
    }
  }

  // Home audit overdue (30 days)
  if (lastHomeAuditAt) {
    const da = differenceInCalendarDays(today, new Date(lastHomeAuditAt));
    if (da > 30) {
      notes.push({
        type: "NUDGE",
        priority: "LOW",
        title: "Home audit overdue",
        message: `Are you sure everything is intact? Last home audit was ${da} days ago.`,
        action: "/coach"
      });
    }
  }

  // basic SapaRisk color
  const sapaRisk = Math.max(0, Math.min(100, Math.round(
    (runwayDays < daysToPayday ? 35 : 10)
    + (betPct >= 0.8 ? 20 : 0)
    + (totalLoanOwed > 0 ? 15 : 0)
    + (workoutsLast7Days < 4 ? 10 : 0)
  )));
  const sapaColor = sapaRisk <= 35 ? "GREEN" : (sapaRisk <= 65 ? "YELLOW" : "RED");

  notes.unshift({
    type: "STATUS",
    priority: "LOW",
    title: "Sapa Risk",
    message: `Your SAPA risk is ${sapaColor.toLowerCase()} (${sapaRisk}/100).`,
    action: "/coach"
  });

  return { notes, sapaRisk, sapaColor, daysToPayday, runwayDays };
}
