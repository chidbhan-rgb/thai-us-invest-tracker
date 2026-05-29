"use client";

import { useState } from "react";
import { ACTION_META, type VideoEntry } from "@/lib/types";

interface Props {
  videos: VideoEntry[];
}

export default function VideoList({ videos }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!videos.length) {
    return (
      <div className="text-sm text-center py-10" style={{ color: "#374151" }}>
        ยังไม่มีวิดีโอ
      </div>
    );
  }

  return (
    <div>
      <div style={{ borderTop: "1px solid #111" }}>
        {videos.map((v) => {
          const isOpen = expanded === v.videoId;
          // Sort stocks: BUY first, then ADD, HOLD, SELL, AVOID
          const order = ["ซื้อ", "ซื้อเพิ่ม", "ถือ", "ขาย", "หลีกเลี่ยง"];
          const sortedStocks = [...v.stocks].sort(
            (a, b) => order.indexOf(a.action) - order.indexOf(b.action)
          );

          return (
            <div key={v.videoId} style={{ borderBottom: "1px solid #0d0d0d" }}>
              {/* Video row */}
              <button
                className="w-full flex items-start gap-4 py-4 text-left transition-colors"
                style={{ background: isOpen ? "#0d0d0d" : "transparent" }}
                onClick={() => setExpanded(isOpen ? null : v.videoId)}
              >
                {/* Date */}
                <div
                  className="text-sm font-mono pt-0.5 w-16 shrink-0"
                  style={{ color: "#4b5563", fontFamily: "var(--font-geist-mono)" }}
                >
                  {v.date.slice(5)}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-base leading-snug truncate"
                    style={{ color: isOpen ? "#f8fafc" : "#d1d5db" }}
                  >
                    {v.videoTitle}
                  </div>
                </div>

                {/* Stock count badge + chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-sm font-black px-2 py-0.5 rounded"
                    style={{ background: "#1a1a1a", color: "#6b7280" }}
                  >
                    {v.stocks.length} stocks
                  </span>
                  <span
                    className="text-xs transition-transform"
                    style={{
                      color: "#374151",
                      display: "inline-block",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
                </div>
              </button>

              {/* Expanded stock list */}
              {isOpen && (
                <div className="pb-3 px-0" style={{ background: "#0d0d0d" }}>
                  {/* YouTube link */}
                  <div className="px-4 pb-3">
                    <a
                      href={`https://www.youtube.com/watch?v=${v.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs transition-colors hover:text-slate-300"
                      style={{ color: "#374151" }}
                    >
                      ▶ เปิดใน YouTube →
                    </a>
                  </div>

                  {/* Stock rows */}
                  <div style={{ borderTop: "1px solid #111" }}>
                    {sortedStocks.map((s, i) => {
                      const ac = ACTION_META[s.action] ?? ACTION_META["ถือ"];
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-3 px-4 py-3"
                          style={{ borderBottom: "1px solid #111" }}
                        >
                          {/* Ticker */}
                          <div
                            className="text-sm font-black w-14 shrink-0 pt-0.5"
                            style={{
                              color: "#e5e7eb",
                              fontFamily: "var(--font-geist-mono)",
                            }}
                          >
                            {s.ticker}
                          </div>

                          {/* Action badge */}
                          <div className="w-12 shrink-0">
                            <span
                              className="text-sm font-black px-2 py-1 rounded"
                              style={{ background: ac.dim, color: ac.color }}
                            >
                              {ac.label}
                            </span>
                          </div>

                          {/* Note */}
                          <div
                            className="flex-1 text-sm leading-snug"
                            style={{ color: "#9ca3af" }}
                          >
                            {s.note}
                          </div>

                          {/* Price */}
                          {s.price != null && (
                            <div
                              className="text-sm font-mono shrink-0"
                              style={{
                                color: "#6b7280",
                                fontFamily: "var(--font-geist-mono)",
                              }}
                            >
                              ${s.price}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
