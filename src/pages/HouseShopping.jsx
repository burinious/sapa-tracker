import { useEffect, useMemo, useRef, useState } from "react";
import { FaShoppingBasket } from "react-icons/fa";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext";
import "../styles/app.css";

import {
  addShoppingItem,
  clearShoppingItems,
  deleteShoppingItem,
  listenShoppingItems,
  updateShoppingItem,
} from "../services/shoppingService";

import { DEFAULT_HOUSE_SHOPPING } from "../utils/defaultHouseShopping";

const money = (n) => `NGN ${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SHOPPING_PRESETS = [
  {
    id: "hostel-restock",
    label: "Hostel Restock",
    items: [
      { name: "Bath Soap", category: "Toiletries", qty: 2, unit: "pcs", price: 0, recurring: true, priority: 2, mustBuy: true, store: "Campus Market" },
      { name: "Toothpaste", category: "Toiletries", qty: 1, unit: "pcs", price: 0, recurring: true, priority: 2, mustBuy: true, store: "Campus Market" },
      { name: "Detergent", category: "Cleaning", qty: 1, unit: "pack", price: 0, recurring: true, priority: 2, mustBuy: true, store: "Campus Market" },
      { name: "Tissue", category: "Toiletries", qty: 2, unit: "roll", price: 0, recurring: true, priority: 3, mustBuy: false, store: "Campus Market" },
    ],
  },
  {
    id: "exam-week",
    label: "Exam Week",
    items: [
      { name: "Noodles", category: "Kitchen", qty: 4, unit: "pcs", price: 0, recurring: false, priority: 2, mustBuy: true, store: "Mini Mart" },
      { name: "Bread", category: "Kitchen", qty: 2, unit: "loaf", price: 0, recurring: false, priority: 2, mustBuy: true, store: "Mini Mart" },
      { name: "Energy Drink", category: "Kitchen", qty: 2, unit: "can", price: 0, recurring: false, priority: 3, mustBuy: false, store: "Mini Mart" },
      { name: "Bottled Water", category: "Kitchen", qty: 6, unit: "pcs", price: 0, recurring: false, priority: 1, mustBuy: true, store: "Mini Mart" },
    ],
  },
  {
    id: "laundry-week",
    label: "Laundry Week",
    items: [
      { name: "Detergent", category: "Cleaning", qty: 1, unit: "pack", price: 0, recurring: true, priority: 1, mustBuy: true, store: "Campus Market" },
      { name: "Bleach", category: "Cleaning", qty: 1, unit: "bottle", price: 0, recurring: false, priority: 3, mustBuy: false, store: "Campus Market" },
      { name: "Fabric Softener", category: "Cleaning", qty: 1, unit: "bottle", price: 0, recurring: false, priority: 4, mustBuy: false, store: "Campus Market" },
    ],
  },
];

const SUBSTITUTE_HINTS = {
  toiletries: "Try generic/store brand to cut cost.",
  kitchen: "Try smaller pack size or local alternatives.",
  cleaning: "Refill packs are often cheaper than full bottle.",
};

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function lineTotal(item) {
  return safeNum(item?.qty, 1) * safeNum(item?.price, 0);
}

function fileDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function drawWrappedLine(ctx, text, x, y, maxWidth, lineHeight = 22) {
  const words = String(text || "").split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function keyFor(uid, suffix) {
  return `sapa_${uid}_${suffix}`;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function clampPriority(value) {
  return Math.max(1, Math.min(4, Math.round(safeNum(value, 3))));
}

function normalizeSeedItem(item) {
  return {
    name: String(item?.name || "").trim(),
    category: String(item?.category || "Other").trim() || "Other",
    qty: Math.max(1, safeNum(item?.qty, 1)),
    unit: String(item?.unit || "pcs").trim() || "pcs",
    price: Math.max(0, safeNum(item?.price, 0)),
    priority: clampPriority(item?.priority),
    recurring: !!item?.recurring,
    mustBuy: !!item?.mustBuy,
    store: String(item?.store || "General").trim() || "General",
    bought: !!item?.bought,
  };
}

function snapshotFromItems(list = []) {
  return list
    .map((it) => ({
      name: String(it?.name || "").trim(),
      category: String(it?.category || "Other").trim() || "Other",
      qty: Math.max(1, safeNum(it?.qty, 1)),
      unit: String(it?.unit || "pcs").trim() || "pcs",
      price: Math.max(0, safeNum(it?.price, 0)),
      priority: clampPriority(it?.priority),
      recurring: !!it?.recurring,
      mustBuy: !!it?.mustBuy,
      store: String(it?.store || "General").trim() || "General",
    }))
    .filter((it) => it.name);
}

function shortText(text, maxLen) {
  const s = String(text || "");
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 3))}...`;
}

export default function HouseShopping() {
  const { user, profile } = useAuth();
  const uid = user?.uid;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionBusy, setActionBusy] = useState("");
  const [exportBusy, setExportBusy] = useState("");

  const [tab, setTab] = useState("all");
  const [cat, setCat] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [qText, setQText] = useState("");
  const [groupByStore, setGroupByStore] = useState(true);
  const [targetBudget, setTargetBudget] = useState("");
  const [presetId, setPresetId] = useState(SHOPPING_PRESETS[0].id);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Toiletries");
  const [store, setStore] = useState("Campus Market");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("pcs");
  const [price, setPrice] = useState(0);
  const [priority, setPriority] = useState(3);
  const [recurring, setRecurring] = useState(false);
  const [mustBuy, setMustBuy] = useState(false);

  const [priceHistory, setPriceHistory] = useState([]);
  const [lastSnapshot, setLastSnapshot] = useState([]);
  const touchStartXRef = useRef({});

  useEffect(() => {
    if (!uid) {
      setPriceHistory([]);
      setLastSnapshot([]);
      setTargetBudget("");
      return;
    }
    setPriceHistory(readJson(keyFor(uid, "shopping_price_history"), []));
    setLastSnapshot(readJson(keyFor(uid, "shopping_last_list"), []));
    const savedBudget = readJson(keyFor(uid, "shopping_target_budget"), "");
    setTargetBudget(savedBudget === "" ? "" : String(savedBudget));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const n = targetBudget === "" ? "" : Math.max(0, safeNum(targetBudget, 0));
    writeJson(keyFor(uid, "shopping_target_budget"), n);
  }, [uid, targetBudget]);

  useEffect(() => {
    if (!uid) return;

    setLoading(true);
    const unsub = listenShoppingItems(
      uid,
      (rows) => {
        setItems(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error(err?.message || "Failed to load shopping list");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, refreshKey]);

  const categories = useMemo(() => {
    const set = new Set();
    for (const it of items) {
      const c = String(it.category || "").trim();
      if (c) set.add(c);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const stores = useMemo(() => {
    const set = new Set(["Campus Market", "Mini Mart", "General"]);
    for (const it of items) {
      const s = String(it.store || "").trim();
      if (s) set.add(s);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    const list = items.filter((it) => {
      const bought = !!it.bought;
      const isQuick = !!it.recurring;

      if (tab === "quick" && !isQuick) return false;
      if (tab === "pending" && bought) return false;
      if (tab === "bought" && !bought) return false;

      if (cat !== "all" && String(it.category || "").trim() !== cat) return false;
      if (storeFilter !== "all" && String(it.store || "").trim() !== storeFilter) return false;

      if (q) {
        const hay = `${it.name || ""} ${it.category || ""} ${it.unit || ""} ${it.store || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const aPinned = !a.bought && !!a.mustBuy;
      const bPinned = !b.bought && !!b.mustBuy;
      if (aPinned !== bPinned) return bPinned ? 1 : -1;
      if (!!a.bought !== !!b.bought) return a.bought ? 1 : -1;
      const pa = safeNum(a.priority, 3);
      const pb = safeNum(b.priority, 3);
      if (pa !== pb) return pa - pb;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    return list;
  }, [items, tab, cat, storeFilter, qText]);

  const totals = useMemo(() => {
    let total = 0;
    let pending = 0;
    let quick = 0;

    for (const it of filtered) {
      const line = lineTotal(it);
      total += line;
      if (!it.bought) pending += line;
      if (it.recurring) quick += line;
    }
    return { total, pending, quick };
  }, [filtered]);

  const perCategory = useMemo(() => {
    const map = {};
    for (const it of filtered) {
      const c = String(it.category || "Other");
      const line = lineTotal(it);
      map[c] = (map[c] || 0) + line;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const allPending = useMemo(() => items.filter((it) => !it.bought), [items]);
  const pendingTotalAll = useMemo(
    () => allPending.reduce((sum, it) => sum + lineTotal(it), 0),
    [allPending]
  );

  const budgetInsights = useMemo(() => {
    const target = targetBudget === "" ? 0 : Math.max(0, safeNum(targetBudget, 0));
    const overBy = Math.max(0, pendingTotalAll - target);
    const optional = allPending.filter((it) => !it.mustBuy);
    const ranked = [...optional].sort((a, b) => {
      const lineDiff = lineTotal(b) - lineTotal(a);
      if (lineDiff !== 0) return lineDiff;
      return safeNum(b.priority, 3) - safeNum(a.priority, 3);
    });

    let remaining = overBy;
    const trim = [];
    for (const it of ranked) {
      if (remaining <= 0) break;
      trim.push(it);
      remaining -= lineTotal(it);
    }

    const projectedIfTrim = pendingTotalAll - trim.reduce((sum, it) => sum + lineTotal(it), 0);
    const coveragePct = target > 0 ? Math.min(999, Math.round((pendingTotalAll / target) * 100)) : 0;
    return { target, overBy, trim, projectedIfTrim, coveragePct };
  }, [allPending, pendingTotalAll, targetBudget]);

  const groupedStores = useMemo(() => {
    if (!groupByStore) return [["All Stores", filtered]];
    const map = new Map();
    for (const it of filtered) {
      const key = String(it.store || "General").trim() || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupByStore]);

  const essentials = useMemo(() => items.filter((it) => !!it.mustBuy), [items]);
  const essentialsBought = useMemo(() => essentials.filter((it) => !!it.bought).length, [essentials]);
  const essentialPct = essentials.length ? Math.round((essentialsBought / essentials.length) * 100) : 0;

  const priceInsights = useMemo(() => {
    const historyByName = new Map();
    for (const h of priceHistory) {
      const key = String(h.name || "").trim().toLowerCase();
      if (!key) continue;
      if (!historyByName.has(key)) historyByName.set(key, []);
      historyByName.get(key).push(safeNum(h.price, 0));
    }

    const warnings = [];
    for (const it of allPending) {
      const key = String(it.name || "").trim().toLowerCase();
      const values = historyByName.get(key) || [];
      if (!values.length || safeNum(it.price, 0) <= 0) continue;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg <= 0) continue;
      const deltaPct = Math.round(((safeNum(it.price, 0) - avg) / avg) * 100);
      if (deltaPct >= 20) {
        const catKey = String(it.category || "").trim().toLowerCase();
        warnings.push({
          id: it.id,
          name: it.name,
          deltaPct,
          current: safeNum(it.price, 0),
          typical: avg,
          hint: SUBSTITUTE_HINTS[catKey] || "Check another store before buying.",
        });
      }
    }

    const byWeekday = Array.from({ length: 7 }, () => []);
    for (const h of priceHistory) {
      const day = Number(h.weekday);
      if (!Number.isInteger(day) || day < 0 || day > 6) continue;
      byWeekday[day].push(safeNum(h.price, 0));
    }
    let bestDay = null;
    for (let i = 0; i < byWeekday.length; i += 1) {
      const arr = byWeekday[i];
      if (!arr.length) continue;
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      if (!bestDay || avg < bestDay.avg) bestDay = { day: i, avg };
    }
    return { warnings: warnings.slice(0, 5), bestDay };
  }, [allPending, priceHistory]);

  const sapaImpact = useMemo(() => {
    const cash = Math.max(0, safeNum(profile?.cashAtHand, 0));
    const after = cash - pendingTotalAll;
    let zone = "GREEN";
    if (after < 0) zone = "RED";
    else if (cash > 0 && after / cash < 0.25) zone = "YELLOW";

    const buyLaterIds = new Set(budgetInsights.trim.map((it) => it.id));
    const buyNow = allPending.filter((it) => it.mustBuy || !buyLaterIds.has(it.id));
    const buyLater = allPending.filter((it) => buyLaterIds.has(it.id));

    return { cash, after, zone, buyNow, buyLater };
  }, [allPending, budgetInsights.trim, pendingTotalAll, profile?.cashAtHand]);

  function storeKeyOf(item) {
    return `${String(item?.name || "").trim().toLowerCase()}|${String(item?.store || "General").trim().toLowerCase()}`;
  }

  function persistSnapshot(list) {
    setLastSnapshot(list);
    if (uid) writeJson(keyFor(uid, "shopping_last_list"), list);
  }

  function savePriceHistoryFromItem(it) {
    if (!uid || !it?.name) return;
    const priceNow = safeNum(it?.price, 0);
    if (priceNow <= 0) return;
    const now = new Date();
    const entry = {
      name: String(it.name || "").trim(),
      category: String(it.category || "Other").trim() || "Other",
      store: String(it.store || "General").trim() || "General",
      price: priceNow,
      weekday: now.getDay(),
      recordedAtISO: now.toISOString(),
    };
    setPriceHistory((prev) => {
      const next = [entry, ...prev].slice(0, 500);
      writeJson(keyFor(uid, "shopping_price_history"), next);
      return next;
    });
  }

  async function addItem(e) {
    e.preventDefault();
    if (!uid) return;

    const n = name.trim();
    if (!n) return toast.error("Item name required.");

    try {
      await addShoppingItem(uid, normalizeSeedItem({
        name: n,
        category,
        store,
        qty,
        unit,
        price,
        priority,
        recurring,
        mustBuy,
        bought: false,
      }));
      setName("");
      setQty(1);
      setPrice(0);
      setPriority(3);
      setRecurring(false);
      setMustBuy(false);
      toast.success("Added to shopping list.");
    } catch (err) {
      toast.error(err?.message || "Failed to add item.");
    }
  }

  async function toggleBought(it) {
    if (!uid) return;
    try {
      const nextBought = !it.bought;
      await updateShoppingItem(uid, it.id, {
        bought: nextBought,
        purchasedAtISO: nextBought ? new Date().toISOString() : null,
      });
      if (nextBought) savePriceHistoryFromItem(it);
    } catch (err) {
      toast.error(err?.message || "Failed to update.");
    }
  }

  function handleSwipeStart(it, e) {
    const touch = e.changedTouches?.[0];
    if (!touch || !it?.id) return;
    touchStartXRef.current[it.id] = touch.clientX;
  }

  function handleSwipeEnd(it, e) {
    const touch = e.changedTouches?.[0];
    if (!touch || !it?.id) return;
    const startX = touchStartXRef.current[it.id];
    delete touchStartXRef.current[it.id];
    if (startX == null) return;
    const delta = touch.clientX - startX;
    if (Math.abs(delta) < 70) return;
    if (delta > 0 && !it.bought) {
      toggleBought(it);
    } else if (delta < 0 && it.bought) {
      toggleBought(it);
    }
  }

  async function updateField(it, patch) {
    if (!uid) return;
    try {
      await updateShoppingItem(uid, it.id, patch);
    } catch (err) {
      toast.error(err?.message || "Failed to update.");
    }
  }

  async function remove(it) {
    if (!uid) return;
    if (!window.confirm(`Remove "${it.name}" from list?`)) return;
    try {
      await deleteShoppingItem(uid, it.id);
      toast.success("Removed.");
    } catch (err) {
      toast.error(err?.message || "Failed to remove.");
    }
  }

  async function seedDefaults() {
    if (!uid) return;
    setActionBusy("seed");
    try {
      const existing = new Set(items.map((x) => storeKeyOf(x)));
      const toAdd = DEFAULT_HOUSE_SHOPPING
        .map((x) => normalizeSeedItem({ ...x, store: x.store || "Campus Market" }))
        .filter((x) => !existing.has(storeKeyOf(x)));
      if (!toAdd.length) {
        toast.info("Starter pack already loaded.");
        return;
      }
      for (const it of toAdd) {
        await addShoppingItem(uid, it);
      }
      toast.success(`Loaded ${toAdd.length} starter items.`);
    } catch (err) {
      toast.error(err?.message || "Failed to load defaults.");
    } finally {
      setActionBusy("");
    }
  }

  async function applyPreset() {
    if (!uid) return;
    const preset = SHOPPING_PRESETS.find((x) => x.id === presetId);
    if (!preset) return;
    setActionBusy("preset");
    try {
      const existing = new Set(items.map((x) => storeKeyOf(x)));
      const toAdd = preset.items.map(normalizeSeedItem).filter((x) => !existing.has(storeKeyOf(x)));
      if (!toAdd.length) {
        toast.info(`${preset.label} already added.`);
        return;
      }
      for (const it of toAdd) {
        await addShoppingItem(uid, it);
      }
      toast.success(`Added ${toAdd.length} item(s) from ${preset.label}.`);
    } catch (err) {
      toast.error(err?.message || "Failed to apply preset.");
    } finally {
      setActionBusy("");
    }
  }

  async function saveCurrentAsSnapshot() {
    if (!items.length) return toast.info("Nothing to snapshot yet.");
    setActionBusy("snapshot");
    try {
      const snap = snapshotFromItems(items);
      persistSnapshot(snap);
      toast.success(`Saved list snapshot (${snap.length} items).`);
    } finally {
      setActionBusy("");
    }
  }

  async function duplicatePreviousList() {
    if (!uid) return;
    if (!lastSnapshot.length) return toast.info("No previous snapshot found.");
    setActionBusy("duplicate");
    try {
      const existing = new Set(items.map((x) => storeKeyOf(x)));
      const toAdd = lastSnapshot.map(normalizeSeedItem).filter((x) => !existing.has(storeKeyOf(x)));
      if (!toAdd.length) {
        toast.info("Current list already contains your previous snapshot items.");
        return;
      }
      for (const it of toAdd) {
        await addShoppingItem(uid, it);
      }
      toast.success(`Restored ${toAdd.length} item(s) from previous list.`);
    } catch (err) {
      toast.error(err?.message || "Failed to restore snapshot.");
    } finally {
      setActionBusy("");
    }
  }

  function refreshData() {
    setActionBusy("refresh");
    setRefreshKey((v) => v + 1);
    window.setTimeout(() => setActionBusy(""), 220);
    toast.success("Shopping data refreshed.");
  }

  async function clearBought() {
    if (!uid) return;
    const boughtRows = items.filter((it) => !!it.bought);
    if (!boughtRows.length) return toast.info("No bought items to clear.");
    if (!window.confirm(`Clear ${boughtRows.length} bought item(s)?`)) return;

    setActionBusy("clear-bought");
    try {
      await Promise.all(boughtRows.map((it) => deleteShoppingItem(uid, it.id)));
      toast.success(`Cleared ${boughtRows.length} bought item(s).`);
    } catch (err) {
      toast.error(err?.message || "Failed to clear bought items.");
    } finally {
      setActionBusy("");
    }
  }

  async function clearAllList() {
    if (!uid) return;
    if (!items.length) return toast.info("Shopping list is already empty.");
    if (!window.confirm("Clear the full shopping list?")) return;
    if (!window.confirm("Final check: this removes all shopping items. Continue?")) return;
    setActionBusy("clear-all");
    try {
      persistSnapshot(snapshotFromItems(items));
      const removed = await clearShoppingItems(uid);
      toast.success(`Cleared ${removed} item(s).`);
    } catch (err) {
      toast.error(err?.message || "Failed to clear shopping list.");
    } finally {
      setActionBusy("");
    }
  }

  async function exportAsImage() {
    if (!filtered.length) return toast.info("Nothing to export.");
    setExportBusy("image");
    try {
      const width = 1220;
      const left = 46;
      const rowHeight = 30;
      const header = 164;
      const footer = 52;
      const height = header + filtered.length * rowHeight + footer;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available.");

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#f5f9ff");
      bg.addColorStop(1, "#eef7f4");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const headBg = ctx.createLinearGradient(0, 0, width, 0);
      headBg.addColorStop(0, "#243f86");
      headBg.addColorStop(1, "#157f8f");
      ctx.fillStyle = headBg;
      ctx.fillRect(0, 0, width, 98);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 32px Trebuchet MS";
      ctx.fillText("SapaTracker Shopping List", left, 46);
      ctx.font = "400 15px Trebuchet MS";
      ctx.fillText(`${new Date().toLocaleString()} | ${filtered.length} item(s)`, left, 74);

      ctx.fillStyle = "#17346b";
      ctx.font = "700 15px Trebuchet MS";
      ctx.fillText(
        `Pending: ${money(pendingTotalAll)} | Cash: ${money(profile?.cashAtHand || 0)} | Sapa Zone: ${sapaImpact.zone}`,
        left,
        126
      );
      ctx.font = "400 13px Trebuchet MS";
      drawWrappedLine(
        ctx,
        `Target: ${money(budgetInsights.target)} | View: ${tab.toUpperCase()} | Filter: ${cat === "all" ? "all categories" : cat}`,
        left,
        146,
        width - left * 2
      );

      const cols = [
        { label: "Item", x: left, max: 27 },
        { label: "Category", x: 390, max: 14 },
        { label: "Store", x: 560, max: 15 },
        { label: "Qty", x: 720, max: 6 },
        { label: "Unit Price", x: 790, max: 14 },
        { label: "Line", x: 930, max: 14 },
        { label: "Status", x: 1060, max: 10 },
      ];

      let y = header;
      ctx.fillStyle = "#1c2f61";
      ctx.font = "700 13px Trebuchet MS";
      for (const c of cols) ctx.fillText(c.label, c.x, y);
      y += 10;

      for (let i = 0; i < filtered.length; i += 1) {
        const it = filtered[i];
        const rowY = y + i * rowHeight;
        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(123, 75, 255, 0.06)";
          ctx.fillRect(left - 10, rowY - 14, width - left * 2 + 16, rowHeight);
        }
        ctx.fillStyle = "#1d2f63";
        ctx.font = "400 12px Trebuchet MS";
        ctx.fillText(shortText(it.name, cols[0].max), cols[0].x, rowY + 4);
        ctx.fillText(shortText(it.category || "Other", cols[1].max), cols[1].x, rowY + 4);
        ctx.fillText(shortText(it.store || "General", cols[2].max), cols[2].x, rowY + 4);
        ctx.fillText(String(safeNum(it.qty, 1)), cols[3].x, rowY + 4);
        ctx.fillText(money(safeNum(it.price, 0)), cols[4].x, rowY + 4);
        ctx.fillText(money(lineTotal(it)), cols[5].x, rowY + 4);
        ctx.fillText(it.bought ? "Bought" : "Pending", cols[6].x, rowY + 4);
      }

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `sapa-shopping-${fileDateStamp()}.png`;
      a.click();
      toast.success("Exported shopping list image.");
    } catch (err) {
      toast.error(err?.message || "Failed to export image.");
    } finally {
      setExportBusy("");
    }
  }

  async function exportAsPdf() {
    if (!filtered.length) return toast.info("Nothing to export.");
    setExportBusy("pdf");
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text("SapaTracker Shopping List", 40, 44);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleString()}`, 40, 62);
      doc.text(`Pending total: ${money(pendingTotalAll)} | Sapa zone: ${sapaImpact.zone}`, 40, 76);
      doc.text(`Target: ${money(budgetInsights.target)} | Coverage: ${budgetInsights.coveragePct}%`, 40, 90);

      autoTable(doc, {
        startY: 104,
        head: [["Item", "Category", "Store", "Qty", "Unit Price", "Line", "Status"]],
        body: filtered.map((it) => [
          it.name || "",
          it.category || "Other",
          it.store || "General",
          String(safeNum(it.qty, 1)),
          money(safeNum(it.price, 0)),
          money(lineTotal(it)),
          it.bought ? "Bought" : "Pending",
        ]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [36, 64, 134] },
      });

      const endY = (doc.lastAutoTable?.finalY || 104) + 22;
      doc.setFontSize(10);
      doc.text(
        `Essentials: ${essentialsBought}/${essentials.length} | Quick items total: ${money(totals.quick)}`,
        40,
        endY
      );
      doc.save(`sapa-shopping-${fileDateStamp()}.pdf`);
      toast.success("Exported shopping list PDF.");
    } catch (err) {
      toast.error(err?.message || "Failed to export PDF.");
    } finally {
      setExportBusy("");
    }
  }

  if (!uid) {
    return (
      <div className="page-shell">
        <div className="page-card" style={{ maxWidth: 980 }}>
          <div className="page-title-row">
            <span className="page-title-icon"><FaShoppingBasket /></span>
            <h3 className="page-title">House Shopping</h3>
          </div>
          <p className="small">Log in to manage your house shopping list.</p>
        </div>
      </div>
    );
  }

  const zoneStyle = sapaImpact.zone === "RED"
    ? { borderColor: "rgba(228,73,73,.42)", background: "linear-gradient(135deg, rgba(255,103,103,.18), rgba(255,80,140,.12))" }
    : sapaImpact.zone === "YELLOW"
      ? { borderColor: "rgba(238,162,35,.42)", background: "linear-gradient(135deg, rgba(255,181,64,.18), rgba(255,143,73,.12))" }
      : { borderColor: "rgba(31,184,142,.40)", background: "linear-gradient(135deg, rgba(31,184,142,.16), rgba(74,225,191,.10))" };

  return (
    <div className="page-shell">
      <div className="page-card" style={{ maxWidth: 980 }}>
        <div className="page-title-row">
          <span className="page-title-icon"><FaShoppingBasket /></span>
          <h3 className="page-title">House Shopping</h3>
        </div>
        <p className="page-sub">Track spending, see Sapa risk, trim optional items, and export your list.</p>

        <div className="toolbar">
          <div className="toolbar-item">
            <label className="small">View</label>
            <select className="input" value={tab} onChange={(e) => setTab(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="bought">Bought</option>
              <option value="quick">Quick list (recurring)</option>
            </select>
          </div>

          <div className="toolbar-item">
            <label className="small">Category</label>
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All" : c}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-item">
            <label className="small">Store</label>
            <select className="input" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
              {stores.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All stores" : s}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-grow">
            <label className="small">Search</label>
            <input
              className="input"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="soap, kitchen, mini mart..."
            />
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-pill">List total: <b>{money(totals.total)}</b></div>
          <div className="stat-pill">Pending total: <b>{money(totals.pending)}</b></div>
          <div className="stat-pill">Quick list total: <b>{money(totals.quick)}</b></div>
          <div className="stat-pill">Essentials done: <b>{essentialsBought}/{essentials.length}</b></div>
        </div>

        <div className="section-card" style={{ marginTop: 12 }}>
          <h4 className="section-title">Budget Planner + Sapa Risk</h4>
          <div className="split-2">
            <div>
              <label className="small">Target budget for pending items</label>
              <input
                className="input"
                value={targetBudget}
                onChange={(e) => setTargetBudget(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 20000"
              />
              <div className="small muted" style={{ marginTop: 8 }}>
                Coverage: <b>{budgetInsights.coveragePct}%</b> of target.
              </div>
              <div className="budgets-progress-track" style={{ marginTop: 8 }}>
                <span
                  className="budgets-progress-fill"
                  style={{ width: `${Math.min(100, budgetInsights.coveragePct)}%` }}
                />
              </div>
              {budgetInsights.target > 0 && budgetInsights.overBy > 0 ? (
                <div className="note-warn" style={{ marginTop: 10, marginBottom: 0 }}>
                  Over target by <b>{money(budgetInsights.overBy)}</b>. Suggested trims:{" "}
                  {budgetInsights.trim.slice(0, 3).map((x) => x.name).join(", ") || "none"}.
                </div>
              ) : (
                <div className="small muted" style={{ marginTop: 10 }}>
                  {budgetInsights.target > 0
                    ? "You are within target budget."
                    : "Set a target budget to get trim suggestions."}
                </div>
              )}
            </div>

            <div className="section-card" style={{ ...zoneStyle, margin: 0 }}>
              <div className="small muted">Sapa impact after pending list</div>
              <div style={{ fontSize: 26, fontWeight: 900, marginTop: 3 }}>{sapaImpact.zone}</div>
              <div className="small muted" style={{ marginTop: 4 }}>
                Cash at hand: <b>{money(sapaImpact.cash)}</b>
              </div>
              <div className="small muted">
                After shopping: <b>{money(sapaImpact.after)}</b>
              </div>
              <div className="small muted" style={{ marginTop: 8 }}>
                Buy now: <b>{sapaImpact.buyNow.length}</b> item(s), buy later: <b>{sapaImpact.buyLater.length}</b> item(s).
              </div>
            </div>
          </div>
        </div>

        <div className="split-2" style={{ marginTop: 12 }}>
          <div className="section-card">
            <h4 className="section-title">Shopping Actions</h4>
            <div className="toolbar">
              <button className="btn settings-secondary-btn" type="button" onClick={seedDefaults} disabled={!!actionBusy}>
                {actionBusy === "seed" ? "Loading..." : "Load Starter Pack"}
              </button>
              <button className="btn settings-secondary-btn" type="button" onClick={refreshData} disabled={!!actionBusy}>
                {actionBusy === "refresh" ? "Refreshing..." : "Refresh Data"}
              </button>
              <button className="btn settings-secondary-btn" type="button" onClick={saveCurrentAsSnapshot} disabled={!!actionBusy}>
                {actionBusy === "snapshot" ? "Saving..." : "Save Stage"}
              </button>
              <button className="btn settings-secondary-btn" type="button" onClick={duplicatePreviousList} disabled={!!actionBusy}>
                {actionBusy === "duplicate" ? "Restoring..." : "Restore Previous Stage"}
              </button>
            </div>
            <div className="toolbar" style={{ marginTop: 8 }}>
              <div className="toolbar-item" style={{ minWidth: 190 }}>
                <label className="small">Preset</label>
                <select className="input" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                  {SHOPPING_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "end" }}>
                <button className="btn settings-secondary-btn" type="button" onClick={applyPreset} disabled={!!actionBusy}>
                  {actionBusy === "preset" ? "Applying..." : "Apply Preset"}
                </button>
              </div>
            </div>
            <div className="small muted" style={{ marginTop: 8 }}>
              Saved stage count: <b>{lastSnapshot.length}</b> item(s).
            </div>
          </div>

          <div className="section-card">
            <h4 className="section-title">Export + Cleanup</h4>
            <div className="toolbar">
              <button className="btn settings-secondary-btn" type="button" onClick={exportAsImage} disabled={!!exportBusy}>
                {exportBusy === "image" ? "Exporting..." : "Export as Image"}
              </button>
              <button className="btn settings-secondary-btn" type="button" onClick={exportAsPdf} disabled={!!exportBusy}>
                {exportBusy === "pdf" ? "Exporting..." : "Export as PDF"}
              </button>
            </div>
            <div className="toolbar" style={{ marginTop: 8 }}>
              <button className="btn settings-secondary-btn" type="button" onClick={clearBought} disabled={!!actionBusy}>
                {actionBusy === "clear-bought" ? "Clearing..." : "Clear Bought Items"}
              </button>
              <button className="btn" type="button" onClick={clearAllList} disabled={!!actionBusy}>
                {actionBusy === "clear-all" ? "Clearing..." : "Clear Full List"}
              </button>
            </div>
            <div className="small muted" style={{ marginTop: 8 }}>
              Full list clear keeps your last stage so you can restore quickly.
            </div>
          </div>
        </div>

        <div className="split-2" style={{ marginTop: 12 }}>
          <div className="section-card">
            <h4 className="section-title">Price Intelligence</h4>
            {priceInsights.bestDay ? (
              <div className="small muted">
                Cheapest average shopping day so far:{" "}
                <b>{WEEK_DAYS[priceInsights.bestDay.day]}</b> ({money(priceInsights.bestDay.avg)} average line price).
              </div>
            ) : (
              <div className="small muted">
                Mark items as bought over time to unlock best shopping day insight.
              </div>
            )}
            <div className="list-stack" style={{ marginTop: 8 }}>
              {priceInsights.warnings.length ? priceInsights.warnings.map((w) => (
                <div key={w.id || `${w.name}-${w.current}`} className="list-card">
                  <div className="small muted"><b>{w.name}</b> is about <b>{w.deltaPct}%</b> above usual.</div>
                  <div className="small muted">Current: {money(w.current)} | Typical: {money(w.typical)}</div>
                  <div className="small muted">{w.hint}</div>
                </div>
              )) : (
                <div className="small muted">No high-price warnings right now.</div>
              )}
            </div>
          </div>

          <div className="section-card">
            <h4 className="section-title">Essentials Progress</h4>
            <div className="small muted">
              Essentials bought: <b>{essentialsBought}</b> / <b>{essentials.length}</b> ({essentialPct}%)
            </div>
            <div className="budgets-progress-track" style={{ marginTop: 8 }}>
              <span className="budgets-progress-fill" style={{ width: `${essentialPct}%` }} />
            </div>
            <div className="small muted" style={{ marginTop: 10 }}>
              Toggle "Must buy" on important items so they stay pinned at the top.
            </div>
          </div>
        </div>

        {perCategory.length ? (
          <div style={{ marginTop: 12 }}>
            <div className="small muted" style={{ marginBottom: 6 }}>By category:</div>
            <div className="toolbar">
              {perCategory.slice(0, 8).map(([c, v]) => (
                <div key={c} className="stat-pill"><b>{c}</b>: {money(v)}</div>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={addItem} className="page-stack-md" style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 0 }}>Add item</h4>
          <div className="split-3">
            <div>
              <label className="small">Item</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Detergent, Toothpaste..." />
            </div>
            <div>
              <label className="small">Category</label>
              <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Toiletries, Kitchen..." />
            </div>
            <div>
              <label className="small">Store</label>
              <input className="input" value={store} onChange={(e) => setStore(e.target.value)} placeholder="Campus Market..." />
            </div>
          </div>

          <div className="split-4">
            <div>
              <label className="small">Qty</label>
              <input className="input" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <label className="small">Unit</label>
              <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs, pack, bag..." />
            </div>
            <div>
              <label className="small">Price (each)</label>
              <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <label className="small">Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value={1}>1 (Urgent)</option>
                <option value={2}>2 (Important)</option>
                <option value={3}>3 (Normal)</option>
                <option value={4}>4 (Low)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              Recurring (quick list)
            </label>
            <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={mustBuy} onChange={(e) => setMustBuy(e.target.checked)} />
              Must buy
            </label>
            <button className="btn" type="submit">Add</button>
          </div>
        </form>

        <div style={{ marginTop: 18 }}>
          <div className="list-top">
            <h4 style={{ margin: 0 }}>Items</h4>
            <div className="small muted">Swipe right to mark bought, swipe left to unmark.</div>
          </div>

          <div className="toolbar" style={{ marginTop: 8 }}>
            <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={groupByStore}
                onChange={(e) => setGroupByStore(e.target.checked)}
              />
              Group by store
            </label>
          </div>

          {loading ? (
            <p className="small">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="small">No items yet.</p>
          ) : (
            <div className="list-stack">
              {groupedStores.map(([storeName, groupItems]) => {
                const groupPending = groupItems.filter((it) => !it.bought).reduce((sum, it) => sum + lineTotal(it), 0);
                return (
                  <div key={storeName} className="section-card">
                    {groupByStore ? (
                      <div className="list-top">
                        <div className="list-title">{storeName}</div>
                        <div className="small muted">
                          {groupItems.length} item(s) | Pending: <b>{money(groupPending)}</b>
                        </div>
                      </div>
                    ) : null}

                    <div className="list-stack" style={{ marginTop: groupByStore ? 10 : 0 }}>
                      {groupItems.map((it) => {
                        const itemLine = lineTotal(it);
                        return (
                          <div
                            key={it.id}
                            className="list-card"
                            style={{ opacity: it.bought ? 0.65 : 1 }}
                            onTouchStart={(e) => handleSwipeStart(it, e)}
                            onTouchEnd={(e) => handleSwipeEnd(it, e)}
                          >
                            <div className="list-top">
                              <div className="list-title">
                                {it.name}{" "}
                                <span className="small muted">
                                  | {it.category || "Other"} | {it.store || "General"} | P{safeNum(it.priority, 3)}
                                  {it.recurring ? " | Quick" : ""}
                                  {it.mustBuy ? " | Must" : ""}
                                </span>
                              </div>
                              <div className="list-amount">{money(itemLine)}</div>
                            </div>

                            <div
                              style={{
                                marginTop: 10,
                                display: "grid",
                                gap: 8,
                                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                              }}
                            >
                              <div>
                                <label className="small">Qty</label>
                                <input
                                  className="input"
                                  value={it.qty ?? 1}
                                  onChange={(e) => updateField(it, { qty: Math.max(1, safeNum(e.target.value, 1)) })}
                                  inputMode="numeric"
                                />
                              </div>
                              <div>
                                <label className="small">Unit</label>
                                <input
                                  className="input"
                                  value={it.unit || "pcs"}
                                  onChange={(e) => updateField(it, { unit: e.target.value || "pcs" })}
                                />
                              </div>
                              <div>
                                <label className="small">Price</label>
                                <input
                                  className="input"
                                  value={it.price ?? 0}
                                  onChange={(e) => updateField(it, { price: Math.max(0, safeNum(e.target.value, 0)) })}
                                  inputMode="numeric"
                                />
                              </div>
                              <div>
                                <label className="small">Priority</label>
                                <select
                                  className="input"
                                  value={safeNum(it.priority, 3)}
                                  onChange={(e) => updateField(it, { priority: clampPriority(e.target.value) })}
                                >
                                  <option value={1}>1</option>
                                  <option value={2}>2</option>
                                  <option value={3}>3</option>
                                  <option value={4}>4</option>
                                </select>
                              </div>
                              <div>
                                <label className="small">Category</label>
                                <input
                                  className="input"
                                  value={it.category || "Other"}
                                  onChange={(e) => updateField(it, { category: e.target.value || "Other" })}
                                />
                              </div>
                              <div>
                                <label className="small">Store</label>
                                <input
                                  className="input"
                                  value={it.store || "General"}
                                  onChange={(e) => updateField(it, { store: e.target.value || "General" })}
                                />
                              </div>
                              <label className="small" style={{ display: "flex", alignItems: "end", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={!!it.recurring}
                                  onChange={(e) => updateField(it, { recurring: e.target.checked })}
                                />
                                Recurring
                              </label>
                              <label className="small" style={{ display: "flex", alignItems: "end", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={!!it.mustBuy}
                                  onChange={(e) => updateField(it, { mustBuy: e.target.checked })}
                                />
                                Must buy
                              </label>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                              <button className="btn" type="button" onClick={() => toggleBought(it)}>
                                {it.bought ? "Unbuy" : "Mark bought"}
                              </button>
                              <button className="btn settings-secondary-btn" type="button" onClick={() => remove(it)}>
                                Remove
                              </button>
                            </div>

                            <div className="small muted" style={{ marginTop: 8 }}>
                              Line: {safeNum(it.qty, 1)} {it.unit || "pcs"} x {money(it.price)} = <b>{money(itemLine)}</b>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
