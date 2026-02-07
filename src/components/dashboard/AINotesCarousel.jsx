import React, { useMemo, useState } from "react";

export default function AINotesCarousel({ notes = [] }) {
  const items = useMemo(() => {
    // If Firestore notes are empty, generate a few default "WOW" placeholders
    if (notes && notes.length) return notes;

    return [
      {
        id: "n1",
        title: "Death by small spending",
        body: "Track those ₦500–₦2k moves. That’s where sapa starts.",
        severity: "warn",
      },
      {
        id: "n2",
        title: "Subscriptions are silent thieves",
        body: "If you don’t use it weekly, pause it this month.",
        severity: "info",
      },
      {
        id: "n3",
        title: "Don’t spend blind",
        body: "Open the app daily. One minute check = one week peace.",
        severity: "danger",
      },
    ];
  }, [notes]);

  const [idx, setIdx] = useState(0);
  const cur = items[idx] || items[0];

  return (
    <div className="st-card" id="notes">
      <div className="st-row-between">
        <div>
          <div className="st-kicker">SAPA A.I Notes</div>
          <div className="st-sub">Swipe-style insights to keep you stable</div>
        </div>
        <div className="st-nav">
          <button className="st-mini" type="button" onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}>
            Prev
          </button>
          <button className="st-mini" type="button" onClick={() => setIdx((i) => (i + 1) % items.length)}>
            Next
          </button>
        </div>
      </div>

      <div className={`st-note st-note-${cur?.severity || "info"}`}>
        <div className="st-note-title">{cur?.title || "Insight"}</div>
        <div className="st-note-body">{cur?.body || ""}</div>
      </div>

      <div className="st-dots">
        {items.map((_, i) => (
          <span key={i} className={`st-dot ${i === idx ? "active" : ""}`} onClick={() => setIdx(i)} />
        ))}
      </div>
    </div>
  );
}
