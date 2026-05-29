"use client";

import { ACTION_META, type Mention } from "@/lib/types";

interface Props {
  tickers: string[];        // already filtered + sorted by Dashboard
  allMentions: Record<string, Mention[]>;
  selected: string;
  onSelect: (ticker: string) => void;
}

export default function TickerSelector({ tickers, allMentions, selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {tickers.map((t) => {
        const list = allMentions[t] ?? [];
        const lastAction = list[list.length - 1]?.action;
        const ac = lastAction ? ACTION_META[lastAction] : null;
        const isActive = t === selected;

        return (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: isActive ? "#fff" : "#111",
              color: isActive ? "#000" : "#6b7280",
              border: `1px solid ${isActive ? "#fff" : "#1a1a1a"}`,
            }}
          >
            {t}
            <span
              className="text-xs px-1.5 py-0.5 rounded font-black"
              style={{
                background: isActive && ac ? ac.color : ac?.dim ?? "#111",
                color: isActive ? "#000" : ac?.color ?? "#6b7280",
              }}
            >
              {list.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
