"use client";

import { useState } from "react";
import { ACTION_META, SECTOR_ORDER, type Mention, type Sector } from "@/lib/types";

interface Props {
  tickers: string[];           // already filtered + sorted by Dashboard
  allMentions: Record<string, Mention[]>;
  sectors: Record<string, Sector>;
  selected: string;
  onSelect: (ticker: string) => void;
  isSearching: boolean;        // when true → flat list, no grouping
}

function TickerButton({
  ticker,
  mentions,
  selected,
  onSelect,
}: {
  ticker: string;
  mentions: Mention[];
  selected: string;
  onSelect: (t: string) => void;
}) {
  const lastAction = mentions[mentions.length - 1]?.action;
  const ac = lastAction ? ACTION_META[lastAction] : null;
  const isActive = ticker === selected;
  return (
    <button
      onClick={() => onSelect(ticker)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-bold transition-all"
      style={{
        background: isActive ? "#fff" : "#111",
        color: isActive ? "#000" : "#6b7280",
        border: `1px solid ${isActive ? "#fff" : "#1a1a1a"}`,
      }}
    >
      {ticker}
      <span
        className="text-sm px-2 py-0.5 rounded font-black"
        style={{
          background: isActive && ac ? ac.color : ac?.dim ?? "#111",
          color: isActive ? "#000" : ac?.color ?? "#6b7280",
        }}
      >
        {mentions.length}
      </span>
    </button>
  );
}

export default function TickerSelector({
  tickers,
  allMentions,
  sectors,
  selected,
  onSelect,
  isSearching,
}: Props) {
  // All sectors start collapsed; auto-expand the one containing the selected ticker
  const selectedSector = sectors[selected] ?? "Other";
  const [openSectors, setOpenSectors] = useState<Set<Sector>>(
    new Set([selectedSector])
  );

  const toggleSector = (s: Sector) => {
    setOpenSectors((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  // ── Flat list when searching ────────────────────────────────
  if (isSearching) {
    return (
      <div className="flex flex-wrap gap-2">
        {tickers.map((t) => (
          <TickerButton
            key={t}
            ticker={t}
            mentions={allMentions[t] ?? []}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  // ── Grouped by sector ───────────────────────────────────────
  // Build sector → ticker[] map preserving SECTOR_ORDER
  const grouped: Record<Sector, string[]> = Object.fromEntries(
    SECTOR_ORDER.map((s) => [s, []])
  ) as Record<Sector, string[]>;

  for (const t of tickers) {
    const s = sectors[t] ?? "Other";
    grouped[s].push(t);
  }

  return (
    <div className="space-y-2">
      {SECTOR_ORDER.filter((s) => grouped[s].length > 0).map((s) => {
        const isOpen = openSectors.has(s);
        const count = grouped[s].length;
        const hasSelected = grouped[s].includes(selected);

        return (
          <div key={s}>
            {/* Sector header */}
            <button
              onClick={() => toggleSector(s)}
              className="flex items-center gap-2 w-full text-left py-1.5 group"
            >
              <span
                className="text-xs uppercase tracking-widest font-bold transition-colors group-hover:text-slate-400"
                style={{ color: hasSelected ? "#9ca3af" : "#374151" }}
              >
                {s}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "#111", color: "#4b5563" }}
              >
                {count}
              </span>
              <span
                className="text-xs ml-auto transition-transform"
                style={{
                  color: "#374151",
                  display: "inline-block",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                ▾
              </span>
            </button>

            {/* Ticker buttons */}
            {isOpen && (
              <div className="flex flex-wrap gap-2 pb-2">
                {grouped[s].map((t) => (
                  <TickerButton
                    key={t}
                    ticker={t}
                    mentions={allMentions[t] ?? []}
                    selected={selected}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
