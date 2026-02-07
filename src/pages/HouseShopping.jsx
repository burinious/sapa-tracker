import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import "../styles/app.css";

import {
  addShoppingItem,
  deleteShoppingItem,
  listenShoppingItems,
  updateShoppingItem,
} from "../services/shoppingService";

import { DEFAULT_HOUSE_SHOPPING } from "../utils/defaultHouseShopping";

const money = (n) => `₦${Math.round(Number(n || 0)).toLocaleString("en-NG")}`;

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export default function HouseShopping() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [tab, setTab] = useState("all"); // all | quick | pending | bought
  const [cat, setCat] = useState("all");
  const [qText, setQText] = useState("");

  // New item form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Toiletries");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("pcs");
  const [price, setPrice] = useState(0);
  const [priority, setPriority] = useState(3);
  const [recurring, setRecurring] = useState(false);

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
  }, [uid]);

  const categories = useMemo(() => {
    const set = new Set();
    for (const it of items) {
      const c = String(it.category || "").trim();
      if (c) set.add(c);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    return items.filter((it) => {
      const bought = !!it.bought;
      const isQuick = !!it.recurring;

      if (tab === "quick" && !isQuick) return false;
      if (tab === "pending" && bought) return false;
      if (tab === "bought" && !bought) return false;

      if (cat !== "all" && String(it.category || "").trim() !== cat) return false;

      if (q) {
        const hay = `${it.name || ""} ${it.category || ""} ${it.unit || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [items, tab, cat, qText]);

  const totals = useMemo(() => {
    let total = 0;
    let pending = 0;
    let quick = 0;

    for (const it of filtered) {
      const line = safeNum(it.qty, 1) * safeNum(it.price, 0);
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
      const line = safeNum(it.qty, 1) * safeNum(it.price, 0);
      map[c] = (map[c] || 0) + line;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  async function addItem(e) {
    e.preventDefault();
    if (!uid) return;

    const n = name.trim();
    if (!n) return toast.error("Item name required");

    try {
      await addShoppingItem(uid, {
        name: n,
        category: category.trim() || "Other",
        qty: safeNum(qty, 1),
        unit: unit.trim() || "pcs",
        price: safeNum(price, 0),
        priority: safeNum(priority, 3),
        recurring: !!recurring,
        bought: false,
      });
      setName("");
      setQty(1);
      setPrice(0);
      setRecurring(false);
      toast.success("Added to shopping list");
    } catch (err) {
      toast.error(err?.message || "Failed to add item");
    }
  }

  async function toggleBought(it) {
    try {
      await updateShoppingItem(uid, it.id, { bought: !it.bought });
    } catch (err) {
      toast.error(err?.message || "Failed to update");
    }
  }

  async function updateField(it, patch) {
    try {
      await updateShoppingItem(uid, it.id, patch);
    } catch (err) {
      toast.error(err?.message || "Failed to update");
    }
  }

  async function remove(it) {
    if (!confirm(`Remove "${it.name}"?`)) return;
    try {
      await deleteShoppingItem(uid, it.id);
      toast.success("Removed");
    } catch (err) {
      toast.error(err?.message || "Failed to remove");
    }
  }

  async function seedDefaults() {
    if (!uid) return;
    try {
      // only seed items that don't already exist by name
      const existing = new Set(items.map((x) => (x.name || "").toLowerCase().trim()));
      const toAdd = DEFAULT_HOUSE_SHOPPING.filter((x) => !existing.has(x.name.toLowerCase().trim()));
      if (!toAdd.length) return toast.info("Defaults already loaded.");
      for (const it of toAdd) {
        // eslint-disable-next-line no-await-in-loop
        await addShoppingItem(uid, it);
      }
      toast.success(`Loaded ${toAdd.length} starter items`);
    } catch (err) {
      toast.error(err?.message || "Failed to load defaults");
    }
  }

  if (!uid) {
    return (
      <div className="st-card" style={{ maxWidth: 980 }}>
        <h3>House Shopping</h3>
        <p className="small">Log in to manage your house shopping list.</p>
      </div>
    );
  }

  return (
    <div className="st-card" style={{ maxWidth: 980 }}>
      <h3>House Shopping</h3>
      <p className="small" style={{ opacity: 0.85 }}>
        Full list + quick recurring items. Totals update live.
      </p>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div>
          <label className="small">View</label>
          <select className="input" value={tab} onChange={(e) => setTab(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="bought">Bought</option>
            <option value="quick">Quick list (recurring)</option>
          </select>
        </div>

        <div>
          <label className="small">Category</label>
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c === "all" ? "All" : c}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label className="small">Search</label>
          <input className="input" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="soap, kitchen, detergent..." />
        </div>

        <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
          <button className="btn" type="button" onClick={seedDefaults}>Load Starter Pack</button>
        </div>
      </div>

      {/* Totals */}
      <div style={{ marginTop: 12, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div className="small">Total: <b>{money(totals.total)}</b></div>
        <div className="small">Pending: <b>{money(totals.pending)}</b></div>
        <div className="small">Quick-list total: <b>{money(totals.quick)}</b></div>
      </div>

      {/* Category summary */}
      {perCategory.length ? (
        <div style={{ marginTop: 10 }}>
          <div className="small" style={{ opacity: 0.85, marginBottom: 6 }}>By category:</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {perCategory.slice(0, 8).map(([c, v]) => (
              <div key={c} className="small" style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)" }}>
                <b>{c}</b>: {money(v)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Add item */}
      <form onSubmit={addItem} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <h4 style={{ marginBottom: 0 }}>Add item</h4>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
          <div>
            <label className="small">Item</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Detergent, Toothpaste..." />
          </div>
          <div>
            <label className="small">Category</label>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Toiletries, Kitchen..." />
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
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
          <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
            <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              Recurring (quick list)
            </label>
            <button className="btn" type="submit">Add</button>
          </div>
        </div>
      </form>

      {/* List */}
      <div style={{ marginTop: 18 }}>
        <h4 style={{ marginBottom: 8 }}>Items</h4>

        {loading ? (
          <p className="small">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="small">No items yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((it) => {
              const lineTotal = safeNum(it.qty, 1) * safeNum(it.price, 0);
              return (
                <div
                  key={it.id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(255,255,255,0.03)",
                    opacity: it.bought ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>
                      {it.name}{" "}
                      <span className="small" style={{ opacity: 0.85 }}>
                        · {it.category} · P{it.priority || 3} {it.recurring ? "· Quick" : ""}
                      </span>
                    </div>
                    <div style={{ fontWeight: 900 }}>{money(lineTotal)}</div>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <label className="small">Qty</label>
                      <input className="input" value={it.qty ?? 1} onChange={(e) => updateField(it, { qty: safeNum(e.target.value, 1) })} inputMode="numeric" />
                    </div>
                    <div>
                      <label className="small">Unit</label>
                      <input className="input" value={it.unit || "pcs"} onChange={(e) => updateField(it, { unit: e.target.value })} />
                    </div>
                    <div>
                      <label className="small">Price</label>
                      <input className="input" value={it.price ?? 0} onChange={(e) => updateField(it, { price: safeNum(e.target.value, 0) })} inputMode="numeric" />
                    </div>
                    <div style={{ display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap" }}>
                      <button className="btn" type="button" onClick={() => toggleBought(it)}>
                        {it.bought ? "Unbuy" : "Mark bought"}
                      </button>
                      <button className="btn" type="button" onClick={() => remove(it)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="small" style={{ marginTop: 8, opacity: 0.85 }}>
                    Line: {safeNum(it.qty, 1)} {it.unit || "pcs"} × {money(it.price)} = <b>{money(lineTotal)}</b>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
