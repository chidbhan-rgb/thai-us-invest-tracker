"use client";

import { ACTION_META, type Mention } from "@/lib/types";

interface Props {
  mentions: Mention[];
  ticker: string;
}

export default function MentionList({ mentions, ticker }: Props) {
  if (!mentions.length) {
    return (
      <div className="text-sm text-slate-600 text-center py-8">
        ยังไม่มีข้อมูล {ticker}
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">
        ประวัติที่พูดถึง
      </div>
      {[...mentions].reverse().map((m, i) => {
        const ac = ACTION_META[m.action] ?? ACTION_META["ถือ"];
        return (
          <div
            key={i}
            className="flex gap-3 items-start bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-600 transition-colors"
          >
            <div className="mt-0.5 shrink-0">
              <span
                className="text-xs font-black px-2 py-1 rounded-md"
                style={{ background: ac.bg, color: ac.text }}
              >
                {ac.label}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs text-slate-400 font-mono">{m.date}</span>
                {m.price != null && (
                  <span className="text-xs text-amber-400 font-bold">${m.price}</span>
                )}
                <a
                  href={`https://www.youtube.com/watch?v=${m.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors truncate max-w-[240px]"
                  title={m.videoTitle}
                >
                  ▶ {m.videoTitle}
                </a>
              </div>
              <div className="text-sm text-slate-300 leading-snug">{m.note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
