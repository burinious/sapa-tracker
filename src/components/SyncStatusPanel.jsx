import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getSyncMeta } from "../utils/syncMeta";
import { syncLocalToFirestore } from "../services/syncLocalToFirestore";
import { getEntries } from "../utils/localEntries";
import { getLoans } from "../utils/localLoans";
import { getMonthlyBudgetLocal } from "../utils/localBudgets";

export default function SyncStatusPanel() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [meta, setMeta] = useState({ lastSyncAtISO: "", lastError: "", lastErrorAtISO: "" });
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    if (!uid) return;
    setMeta(getSyncMeta(uid));

    const entries = getEntries(uid);
    const loans = getLoans(uid);
    const month = new Date();
    const m = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const budget = getMonthlyBudgetLocal(uid, m);

    const pendingEntries = entries.filter((e) => e.syncStatus !== "synced").length;
    const pendingLoans = loans.filter((l) => l.syncStatus !== "synced").length;
    const pendingBudget = budget && budget.syncStatus !== "synced" ? 1 : 0;
    setPending(pendingEntries + pendingLoans + pendingBudget);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    refresh();
    const onSync = () => refresh();
    window.addEventListener("sapa-sync", onSync);
    window.addEventListener("online", onSync);
    window.addEventListener("offline", onSync);
    return () => {
      window.removeEventListener("sapa-sync", onSync);
      window.removeEventListener("online", onSync);
      window.removeEventListener("offline", onSync);
    };
  }, [uid, refresh]);

  const lastSyncLabel = useMemo(() => {
    if (!meta.lastSyncAtISO) return "Never";
    const d = new Date(meta.lastSyncAtISO);
    return Number.isNaN(d.getTime()) ? meta.lastSyncAtISO : d.toLocaleString();
  }, [meta.lastSyncAtISO]);

  const lastErrorLabel = useMemo(() => {
    if (!meta.lastError) return "None";
    const d = new Date(meta.lastErrorAtISO);
    const at = Number.isNaN(d.getTime()) ? "" : ` (${d.toLocaleString()})`;
    return `${meta.lastError}${at}`;
  }, [meta.lastError, meta.lastErrorAtISO]);

  const manualSync = async () => {
    if (!uid || syncing) return;
    try {
      setSyncing(true);
      await syncLocalToFirestore(uid);
      refresh();
    } catch {
      refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="page-card" style={{ marginTop: 12 }}>
      <div className="list-title" style={{ marginBottom: 6 }}>Sync Status</div>
      <div className="small">Pending items: <b>{pending}</b></div>
      <div className="small">Last sync: <b>{lastSyncLabel}</b></div>
      <div className="small">Last error: <b>{lastErrorLabel}</b></div>
      <div className="toolbar">
        <button className="btn" type="button" onClick={manualSync} disabled={syncing || !uid}>
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
      <div className="small" style={{ marginTop: 8 }}>
        Tip: if you go offline, changes save locally and sync when you reconnect.
      </div>
    </div>
  );
}
