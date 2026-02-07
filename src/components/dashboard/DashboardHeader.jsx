import React from "react";
import { format } from "date-fns";

export default function DashboardHeader({ storeName = "SapaTracker", dueCount = 0 }) {
  const today = format(new Date(), "EEEE, MMM d, yyyy");
  return (
    <div className="st-card st-header">
      <div>
        <div className="st-kicker">Today</div>
        <h2 className="st-title">Welcome, {storeName}</h2>
        <div className="st-sub">{today}</div>
      </div>
      <div className="st-pill">
        <span className="st-pill-dot" />
        <span>{dueCount} due in 7 days</span>
      </div>
    </div>
  );
}
