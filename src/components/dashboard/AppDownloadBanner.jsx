import { useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "sapa-install-banner-dismissed";
const DEFAULT_ANDROID_DOWNLOAD_URL = "/downloads/sapatracker-android.apk";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator?.standalone === true
  );
}

export default function AppDownloadBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  const androidUrl = useMemo(
    () => String(import.meta.env.VITE_ANDROID_DOWNLOAD_URL || DEFAULT_ANDROID_DOWNLOAD_URL).trim(),
    []
  );
  const iosUrl = useMemo(
    () => String(import.meta.env.VITE_IOS_DOWNLOAD_URL || "").trim(),
    []
  );
  const standalone = isStandaloneMode();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const canInstallPwa = Boolean(deferredPrompt && !standalone);
  const hasStoreLinks = Boolean(androidUrl || iosUrl);

  if (dismissed || (!canInstallPwa && !hasStoreLinks)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt || installing) return;
    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      className="st-dashboard-top-banner st-card st-install-banner st-anim"
      style={{ "--d": "0.01s" }}
      role="region"
      aria-label="Download SapaTracker app"
    >
      <div className="st-install-copy">
        <div className="st-kicker">Get The App</div>
        <div className="st-title">Install SapaTracker on your phone</div>
        <div className="st-sub">
          Add it to your home screen or download from available mobile links.
        </div>
      </div>

      <div className="st-install-actions">
        {canInstallPwa ? (
          <button type="button" className="st-mini st-install-cta" onClick={handleInstall} disabled={installing}>
            {installing ? "Installing..." : "Install On This Device"}
          </button>
        ) : null}

        {androidUrl ? (
          <a
            className="st-mini st-link-btn st-install-cta"
            href={androidUrl}
            target="_blank"
            rel="noreferrer"
          >
            Download Android
          </a>
        ) : null}

        {iosUrl ? (
          <a
            className="st-mini st-link-btn st-install-cta"
            href={iosUrl}
            target="_blank"
            rel="noreferrer"
          >
            Download iPhone
          </a>
        ) : null}

        <button type="button" className="st-mini st-install-dismiss" onClick={handleDismiss}>
          Maybe Later
        </button>
      </div>
    </div>
  );
}
