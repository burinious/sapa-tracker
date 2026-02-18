export const DASHBOARD_WIDGETS = [
  "quickAdd",
  "modules",
  "actionCenter",
  "pressureThisWeek",
  "aiNotes",
  "spendingInsights",
  "recentTransactions",
  "sapaAiInfo",
];

export const DASHBOARD_PRESETS = {
  focus: {
    label: "Focus",
    widgets: {
      quickAdd: false,
      modules: false,
      actionCenter: true,
      pressureThisWeek: false,
      aiNotes: false,
      spendingInsights: false,
      recentTransactions: true,
      sapaAiInfo: false,
    },
  },
  simple: {
    label: "Simple",
    widgets: {
      quickAdd: false,
      modules: false,
      actionCenter: true,
      pressureThisWeek: true,
      aiNotes: false,
      spendingInsights: false,
      recentTransactions: true,
      sapaAiInfo: false,
    },
  },
  standard: {
    label: "Standard",
    widgets: {
      quickAdd: true,
      modules: false,
      actionCenter: true,
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
      modules: true,
      actionCenter: true,
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
