const APP_THEME_KEY = "sapa-app-theme";
const APP_THEMES = ["light", "dark"];

export function normalizeAppTheme(value) {
  return APP_THEMES.includes(value) ? value : "light";
}

export function getStoredAppTheme() {
  try {
    return normalizeAppTheme(localStorage.getItem(APP_THEME_KEY));
  } catch {
    return "light";
  }
}

export function applyAppTheme(theme) {
  const next = normalizeAppTheme(theme);
  try {
    localStorage.setItem(APP_THEME_KEY, next);
  } catch {
    // ignore storage failure
  }

  if (typeof document !== "undefined") {
    const isDark = next === "dark";
    document.documentElement.classList.toggle("theme-dark", isDark);
    if (document.body) {
      document.body.classList.toggle("theme-dark", isDark);
    }
  }

  return next;
}

export function initAppTheme() {
  return applyAppTheme(getStoredAppTheme());
}
