"use client";

import { useState, useEffect, useCallback } from "react";
import TickerSelector from "./TickerSelector";
import StockChart from "./StockChart";
import MentionList from "./MentionList";
import { ACTION_META, type StocksData, type PricePoint } from "@/lib/types";

type SortOption = "Most Mentioned" | "Recent" | "A → Z";
const SORT_OPTIONS: SortOption[] = ["Most Mentioned", "Recent", "A → Z"];

interface Props {
  initialData: StocksData;
}

export default function Dashboard({ initialData }: Props) {
  const allTickers = Object.keys(initialData.mentions);
  const [selected, setSelected] = useState<string>(allTickers[0] ?? "");
  const [priceCache, setPriceCache] = useState<Record<string, PricePoint[]>>({});
  const [sort, setSort] = useState<SortOption>("Most Mentioned");
  const [search, setSearch] = useState("");

  const fetchPrices = useCallback(
    async (ticker: string) => {
      if (priceCache[ticker] !== undefined) return;
      try {
        const res = await fetch(`/api/prices/${ticker}`);
        const data: PricePoint[] = await res.json();
        setPriceCache((c) => ({ ...c, [ticker]: data }));
      } catch {
        setPriceCache((c) => ({ ...c, [ticker]: [] }));
      }
    },
    [priceCache]
  );

  useEffect(() => {
    if (selected) fetchPrices(selected);
  }, [selected, fetchPrices]);

  // Filter + sort
  const filteredTickers = allTickers
    .filter((t) => t.includes(search.toUpperCase()))
    .sort((a, b) => {
      const ma = initialData.mentions[a] ?? [];
      const mb = initialData.mentions[b] ?? [];
      if (sort === "Most Mentioned") return mb.length - ma.length;
      if (sort === "Recent") {
        const da = ma[ma.length - 1]?.date ?? "";
        const db = mb[mb.length - 1]?.date ?? "";
        return db.localeCompare(da);
      }
      return a.localeCompare(b);
    });

  const mentions = initialData.mentions[selected] ?? [];
  const prices = priceCache[selected] ?? [];
  const lastAction = mentions[mentions.length - 1]?.action;
  const ac = lastAction ? ACTION_META[lastAction] : null;

  const lastUpdatedDisplay = initialData.lastUpdated
    ? new Date(initialData.lastUpdated).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
    : null;

  if (!allTickers.length) return <EmptyState />;

  return (
    <div className="min-h-screen" style={{ background: "#080808", fontFamily: "var(--font-mono)" }}>

      {/* Sticky header */}
      <div
        className="sticky top-0 z-10"
        style={{ background: "#080808", borderBottom: "1px solid #111" }}
      >
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div
              className="text-xs uppercase tracking-widest mb-0.5"
              style={{ color: "#4b5563" }}
            >
              ลงทุนหุ้นอเมริกา
            </div>
            <div className="text-white font-black text-base">Stock Tracker</div>
          </div>
          <div className="text-xs" style={{ color: "#4b5563" }}>
            {lastUpdatedDisplay ?? ""}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">

        {/* Search + Sort */}
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา ticker..."
            className="flex-1 text-sm px-4 py-2.5 rounded-xl text-white placeholder-slate-700 outline-none"
            style={{ background: "#111", border: "1px solid #1a1a1a" }}
          />
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a" }}>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className="px-3 py-2 text-xs transition-all"
                style={{
                  background: sort === s ? "#1a1a1a" : "transparent",
                  color: sort === s ? "#e5e7eb" : "#4b5563",
                }}
              >
                {s === "Most Mentioned" ? "Top" : s === "Recent" ? "Recent" : "A-Z"}
              </button>
            ))}
          </div>
        </div>

        {/* Ticker list */}
        <TickerSelector
          tickers={filteredTickers}
          allMentions={initialData.mentions}
          selected={selected}
          onSelect={setSelected}
        />

        {/* Divider */}
        <div style={{ borderTop: "1px solid #111" }} />

        {/* Selected ticker header */}
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black text-white">{selected}</div>
          {ac && (
            <span
              className="text-xs font-black px-2 py-1 rounded-lg"
              style={{ background: ac.dim, color: ac.color }}
            >
              {ac.label}
            </span>
          )}
        </div>

        {/* Chart */}
        <StockChart ticker={selected} prices={prices} mentions={mentions} />

        {/* Action legend */}
        <div className="flex gap-5 flex-wrap">
          {Object.entries(ACTION_META).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs" style={{ color: "#374151" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: v.color }} />
              {k}
            </div>
          ))}
        </div>

        {/* Mention list */}
        <MentionList mentions={mentions} ticker={selected} />

      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "#080808", fontFamily: "var(--font-mono)" }}
    >
      <div className="text-3xl">📡</div>
      <div className="text-sm" style={{ color: "#4b5563" }}>ยังไม่มีข้อมูล</div>
      <div className="text-xs text-center max-w-xs leading-relaxed" style={{ color: "#374151" }}>
        รัน{" "}
        <code className="px-1.5 py-0.5 rounded" style={{ background: "#111", color: "#9ca3af" }}>
          npm run pipeline
        </code>{" "}
        เพื่อดึงข้อมูลจาก YouTube
      </div>
    </div>
  );
}
