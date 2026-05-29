"use client";

import { ACTION_META, type Mention } from "@/lib/types";

interface Props {
  tickers: string[];
  mentions: Record<string, Mention[]>;
  selected: string;
  onSelect: (ticker: string) => void;
}

export default function TickerSelector({ tickers, mentions, selected, onSelect }: Props) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">
        หุ้นที่ถูกพูดถึง
      </div>
      <div className="flex flex-wrap gap-2">
        {tickers.map((t) => {
          const list = mentions[t] ?? [];
          const lastAction = list[list.length - 1]?.action;
          const ac = lastAction ? ACTION_META[lastAction] : null;
          const isActive = t === selected;

          return (
            <button
              key={t}
              onClick={() => onSelect(t)}
              className={`px-4 py-2 rounded-xl text-sm font-black border-2 transition-all flex items-center gap-2
                ${isActive
                  ? "border-white bg-white text-slate-950"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                }`}
            >
              {t}
              <span
                className="text-xs px-1.5 py-0.5 rounded font-bold"
                style={
                  isActive && ac
                    ? { background: ac.bg, color: ac.text }
                    : { background: "#1e293b", color: "#94a3b8" }
                }
              >
                {list.length}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
