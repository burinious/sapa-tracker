import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary";
import { registerSW } from "virtual:pwa-register";
import React from "react";
import ReactDOM from "react-dom/client";
import { initAppTheme } from "./utils/theme";

// Optional: keep global css if you have any
// import "./index.css";

function Root() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}

initAppTheme();

try {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
} catch (e) {
  document.body.innerHTML =
    "<pre style='padding:16px;color:#fff;background:#111;white-space:pre-wrap'>" +
    "App crashed before render:\n\n" +
    (e?.stack || e?.message || String(e)) +
    "</pre>";
}


// PWA service worker
registerSW({ immediate: true });
