export const DEFAULT_NOTIFICATION_PREFS = {
  enabled: true,
  coachEntries: true,
  billReminders: true,
  loanReminders: true,
  weeklyDigest: true,
};

export const PUSH_NOTIFICATION_AREAS = [
  {
    id: "coach_entries",
    prefKey: "coachEntries",
    title: "Coach Entries Reminder",
    sample: "Sapa Coach is expecting your entries.",
  },
  {
    id: "bill_reminders",
    prefKey: "billReminders",
    title: "Bills Due Reminder",
    sample: "A bill is due soon. Review it before pressure starts.",
  },
  {
    id: "loan_reminders",
    prefKey: "loanReminders",
    title: "Loan Due Reminder",
    sample: "Loan repayment is close. Keep your balance in check.",
  },
  {
    id: "weekly_digest",
    prefKey: "weeklyDigest",
    title: "Weekly Money Digest",
    sample: "Your weekly spending summary is ready.",
  },
];

export function normalizeNotificationPrefs(raw = {}) {
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(raw || {}),
  };
}

export function getEnabledPushAreas(rawPrefs = {}) {
  const prefs = normalizeNotificationPrefs(rawPrefs);
  if (!prefs.enabled) return [];
  return PUSH_NOTIFICATION_AREAS.filter((area) => !!prefs[area.prefKey]);
}
