export const DASHBOARD_WIDGETS = [
  "quickAdd",
  "pressureThisWeek",
  "aiNotes",
  "spendingInsights",
  "recentTransactions",
  "sapaAiInfo",
];

export const DASHBOARD_PRESETS = {
  simple: {
    label: "Simple",
    widgets: {
      quickAdd: true,
      pressureThisWeek: true,
      aiNotes: true,
      spendingInsights: false,
      recentTransactions: true,
      sapaAiInfo: true,
    },
  },
  standard: {
    label: "Standard",
    widgets: {
      quickAdd: true,
      pressureThisWeek: true,
      aiNotes: true,
      spendingInsights: true,
      recentTransactions: true,
      sapaAiInfo: true,
    },
  },
  pro: {
    label: "Pro",
    widgets: {
      quickAdd: true,
      pressureThisWeek: true,
      aiNotes: true,
      spendingInsights: true,
      recentTransactions: true,
      sapaAiInfo: true,
    },
  },
};

export function mergeWidgets(preset = {}, overrides = {}) {
  return { ...preset, ...overrides };
}
