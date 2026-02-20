import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaBolt,
  FaBrain,
  FaChartLine,
  FaCog,
  FaCreditCard,
  FaWallet,
} from "react-icons/fa";
import { normalizeStudentQuickLinkOrder, STUDENT_QUICK_LINK_ORDER } from "../../utils/studentQuickLinks";

function linkCard(id, to, icon, title, badge = "") {
  return { id, to, icon, title, badge };
}

export default function StudentQuickLinks({
  computed = null,
  visibility = {},
  order = STUDENT_QUICK_LINK_ORDER,
  onSwap,
}) {
  const [swapMode, setSwapMode] = useState(false);

  const cards = useMemo(() => {
    const dueCount = computed?.dueSoon?.length || 0;
    const risk = computed?.score || 0;
    return [
      linkCard(
        "addExpense",
        "/add-transaction",
        <FaBolt />,
        "Add Expense",
        "Now"
      ),
      linkCard(
        "setDailyPlan",
        "/budgets",
        <FaWallet />,
        "Daily Target",
        "Plan"
      ),
      linkCard(
        "spendReview",
        "/transactions",
        <FaChartLine />,
        "Spending",
        "Review"
      ),
      linkCard(
        "coachPulse",
        "/coach",
        <FaBrain />,
        "Coach Pulse",
        `${risk}`
      ),
      linkCard(
        "dueBills",
        "/subscriptions",
        <FaCreditCard />,
        "Bills Due",
        `${dueCount}`
      ),
      linkCard(
        "customize",
        "/settings",
        <FaCog />,
        "Customize",
        "Edit"
      ),
    ];
  }, [computed]);

  const cardsById = useMemo(() => {
    const out = {};
    for (const item of cards) out[item.id] = item;
    return out;
  }, [cards]);

  const orderedIds = useMemo(() => normalizeStudentQuickLinkOrder(order), [order]);
  const visibleCards = orderedIds
    .map((id) => cardsById[id])
    .filter((item) => item && visibility[item.id] !== false);

  if (!visibleCards.length) return null;
  const canSwap = typeof onSwap === "function" && visibleCards.length > 1;

  function swapWithNeighbor(index, step) {
    if (!canSwap) return;
    const targetIndex = index + step;
    if (targetIndex < 0 || targetIndex >= visibleCards.length) return;
    onSwap(visibleCards[index].id, visibleCards[targetIndex].id);
  }

  return (
    <section className="st-quicklinks-section" aria-label="Quick links">
      <div className="st-row-between">
        <h3 className="st-quicklinks-title">Quick Links</h3>
        {canSwap ? (
          <button
            type="button"
            className="st-mini st-quicklinks-toggle"
            onClick={() => setSwapMode((prev) => !prev)}
          >
            {swapMode ? "Done" : "Swap icons"}
          </button>
        ) : null}
      </div>

      <div className="st-quicklink-belt" role="list">
        {visibleCards.map((item, index) => (
          <div key={item.id} className="st-quicklink-slot" role="listitem">
            <Link
              to={item.to}
              className={`st-quicklink-pill ${swapMode ? "is-swap-mode" : ""}`}
              onClick={(e) => {
                if (swapMode) e.preventDefault();
              }}
              aria-disabled={swapMode ? "true" : undefined}
            >
              <span className="st-quicklink-circle">
                {item.icon}
                {item.badge ? <span className="st-quicklink-badge">{item.badge}</span> : null}
              </span>
              <span className="st-quicklink-label">{item.title}</span>
            </Link>

            {swapMode ? (
              <div className="st-quicklink-swap-row">
                <button
                  type="button"
                  className="st-quicklink-swap-btn"
                  aria-label={`Move ${item.title} left`}
                  disabled={index === 0}
                  onClick={() => swapWithNeighbor(index, -1)}
                >
                  <FaChevronLeft />
                </button>
                <button
                  type="button"
                  className="st-quicklink-swap-btn"
                  aria-label={`Move ${item.title} right`}
                  disabled={index === visibleCards.length - 1}
                  onClick={() => swapWithNeighbor(index, 1)}
                >
                  <FaChevronRight />
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
