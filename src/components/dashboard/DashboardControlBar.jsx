import React from "react";

const WINDOWS = [7, 14, 30];

export default function DashboardControlBar({
  riskWindowDays = 7,
  onChangeWindow,
  mode = "standard",
  theme = "ocean",
  onOpenSettings,
}) {
  return (
    <div className="st-card st-controls">
      <div className="st-controls-top">
        <div>
          <div className="st-kicker">Money Window</div>
          <div className="st-sub">Switch your spend horizon and personalize what you see.</div>
        </div>
        <button className="st-mini" type="button" onClick={onOpenSettings}>
          Customize
        </button>
      </div>

      <div className="st-chip-row">
        {WINDOWS.map((days) => (
          <button
            key={days}
            type="button"
            className={`st-chip ${riskWindowDays === days ? "active" : ""}`}
            onClick={() => onChangeWindow?.(days)}
          >
            {days} days
          </button>
        ))}
      </div>

      <div className="st-sub st-controls-meta">
        Mode:
        {" "}
        <span className="st-mode-pill">{mode}</span>
        {" "}
        Theme:
        {" "}
        <span className="st-mode-pill">{theme}</span>
      </div>
    </div>
  );
}
