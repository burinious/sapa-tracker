import React, { useMemo } from "react";
import { computeCoachNotes } from "./coachEngine";

export default function CoachPage({ coachInput }) {
  const out = useMemo(() => computeCoachNotes(coachInput), [coachInput]);
  return (
    <div style={{ padding: 16 }}>
      <h2>Coach</h2>
      <p><b>Sapa Risk:</b> {out.sapaColor} ({out.sapaRisk}/100) | <b>Runway:</b> {out.runwayDays.toFixed(1)} days | <b>Days to 28th:</b> {out.daysToPayday}</p>
      <div style={{ display: "grid", gap: 10 }}>
        {out.notes.map((n, idx) => (
          <div key={idx} style={{ border: "1px solid #2a3550", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{n.type} · {n.priority}</div>
            <div style={{ fontWeight: 800 }}>{n.title}</div>
            <div style={{ marginTop: 6 }}>{n.message}</div>
            {n.action ? <div style={{ marginTop: 8 }}><a href={n.action}>Go</a></div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
