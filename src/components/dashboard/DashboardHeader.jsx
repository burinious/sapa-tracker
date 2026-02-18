import React from "react";
import { format } from "date-fns";

function greetByHour(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHeader({ username = "User", dueCount = 0, riskWindowDays = 7 }) {
  const today = format(new Date(), "EEEE, MMM d, yyyy");
  const greet = greetByHour();
  return (
    <div className="st-card st-header">
      <div className="st-header-copy">
        <div className="st-kicker">Today</div>
        <h2 className="st-title st-title-hero">{greet}, {username}</h2>
        <div className="st-sub">{today}</div>
      </div>
      <div className="st-pill">
        <span className="st-pill-dot" />
        <span className="st-pill-text">{dueCount} due in {riskWindowDays} days</span>
      </div>
    </div>
  );
}
