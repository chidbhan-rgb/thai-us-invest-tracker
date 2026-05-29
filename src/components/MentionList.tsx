"use client";

import { ACTION_META, type Mention } from "@/lib/types";

interface Props {
  mentions: Mention[];
  ticker: string;
}

export default function MentionList({ mentions, ticker }: Props) {
  if (!mentions.length) {
    return (
      <div className="text-sm text-center py-10" style={{ color: "#374151" }}>
        ยังไม่มีข้อมูล {ticker}
      </div>
    );
  }

  return (
    <div>
      <div
        className="text-xs uppercase tracking-widest mb-1"
        style={{ color: "#374151" }}
      >
        ประวัติที่พูดถึง
      </div>
      <div style={{ borderTop: "1px solid #111" }}>
        {[...mentions].reverse().map((m, i) => {
          const ac = ACTION_META[m.action] ?? ACTION_META["ถือ"];
          return (
            <div
              key={i}
              className="flex items-start gap-4 py-4"
              style={{ borderBottom: "1px solid #0d0d0d" }}
            >
              {/* Date */}
              <div
                className="text-xs font-mono pt-0.5 w-14 shrink-0"
                style={{ color: "#4b5563" }}
              >
                {m.date.slice(5)}
              </div>

              {/* Action badge */}
              <div className="w-10 shrink-0">
                <span
                  className="text-xs font-black px-1.5 py-0.5 rounded"
                  style={{ background: ac.dim, color: ac.color }}
                >
                  {ac.label}
                </span>
              </div>

              {/* Note + video link */}
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-snug" style={{ color: "#d1d5db" }}>
                  {m.note}
                </div>
                <a
                  href={`https://www.youtube.com/watch?v=${m.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs mt-0.5 block truncate transition-colors hover:text-slate-400"
                  style={{ color: "#374151" }}
                  title={m.videoTitle}
                >
                  ▶ {m.videoTitle}
                </a>
              </div>

              {/* Price */}
              <div className="text-sm font-mono shrink-0" style={{ color: "#6b7280" }}>
                {m.price != null ? `$${m.price}` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
