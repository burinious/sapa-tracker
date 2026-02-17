import React, { useEffect, useMemo, useState } from "react";
import "./DashboardUpgrade.css";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import SapaRiskMeter from "../components/dashboard/SapaRiskMeter";
import QuickAddRow from "../components/dashboard/QuickAddRow";
import PressureThisWeek from "../components/dashboard/PressureThisWeek";
import AINotesCarousel from "../components/dashboard/AINotesCarousel";
import SnapshotCards from "../components/dashboard/SnapshotCards";
import SpendingInsights from "../components/dashboard/SpendingInsights";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import SidebarModulesPanel from "../components/dashboard/SidebarModulesPanel";

import useDashboardData from "../hooks/useDashboardData";
import useSapaAiNotes from "../hooks/useSapaAiNotes";

import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Dashboard() {
  const [fbUser, setFbUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u || null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const uid = fbUser?.uid;
  const storeName = fbUser?.displayName || "SapaTracker";
  const currency = "NGN";

  const { loading, error, notes: storedNotes, computed, transactions, subscriptions } = useDashboardData(uid, {
    currency,
    riskWindowDays: 7,
    txWindowDays: 30,
    notesLimit: 8,
  });

  // SAPA A.I notes generated from real data
  const { notes: aiNotes } = useSapaAiNotes({
    transactions: transactions || [],
    subscriptions: subscriptions || [],
    computed,
    profile: { currency, riskWindowDays: 7 },
  });

  // Prefer SAPA A.I engine notes first. If empty, fallback to stored notes.
  const mergedNotes = aiNotes?.length ? aiNotes : (storedNotes || []);

  const dueCount = computed?.dueSoon?.length || 0;

  const leftProps = useMemo(() => ({
    score: computed?.score || 0,
    zone: computed?.zone || "YELLOW ZONE",
    cashApprox: computed?.cashApprox || 0,
    dueTotal: computed?.dueTotal || 0,
    avgDailySpend7: computed?.avgDailySpend7 || 0,
  }), [computed]);

  if (authLoading) {
    return (
      <div className="st-wrap">
        <div className="st-card">
          <div className="st-kicker">Auth</div>
          <div className="st-sub">Checking login…</div>
        </div>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="st-wrap">
        <div className="st-card">
          <div className="st-kicker">Auth</div>
          <div className="st-title">You’re not logged in</div>
          <div className="st-sub">Go back to login to access your dashboard.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="st-wrap">
      <div className="st-grid">
        {/* LEFT (sticky on desktop) */}
        <div className="st-col">
          <DashboardHeader storeName={storeName} dueCount={dueCount} />

          <SapaRiskMeter
            score={leftProps.score}
            zone={leftProps.zone}
            cashApprox={leftProps.cashApprox}
            dueTotal={leftProps.dueTotal}
            avgDailySpend7={leftProps.avgDailySpend7}
            currency={currency}
            windowDays={7}
          />

          <SnapshotCards
            currency={currency}
            cashApprox={computed?.cashApprox || 0}
            mtdIncome={computed?.mtdIncome || 0}
            mtdExpense={computed?.mtdExpense || 0}
          />
        </div>

        {/* MID */}
        <div className="st-mid">
          <QuickAddRow />
          <SidebarModulesPanel
            uid={uid}
            computed={computed}
            transactions={transactions}
            subscriptions={subscriptions}
            aiNotesCount={mergedNotes?.length || 0}
          />

          {error ? (
            <div className="st-card">
              <div className="st-kicker">Error</div>
              <div className="st-sub">{error}</div>
            </div>
          ) : null}

          {loading ? (
            <div className="st-card">
              <div className="st-kicker">Loading</div>
              <div className="st-sub">Fetching your money reality…</div>
            </div>
          ) : (
            <>
              <div id="pressure">
                <PressureThisWeek
                  dueSoon={computed?.dueSoon || []}
                  dueTotal={computed?.dueTotal || 0}
                  currency={currency}
                />
              </div>

              <AINotesCarousel notes={mergedNotes || []} />

              <div id="insights">
                <SpendingInsights topCats={computed?.topCats || []} currency={currency} />
              </div>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="st-col">
          <RecentTransactions recent={computed?.recent || []} currency={currency} />

          <div className="st-card">
            <div className="st-kicker">SAPA A.I</div>
            <div className="st-sub">
              You’re running the deterministic rules engine (no OpenAI). Next is: persistence + weekly recap.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
