"use client";

import { useState, useRef } from "react";
import { ACTION_META, type Mention, type PricePoint } from "@/lib/types";

interface Props {
  ticker: string;
  prices: PricePoint[];
  mentions: Mention[];
}

export default function StockChart({ ticker, prices, mentions }: Props) {
  const [hover, setHover] = useState<PricePoint | null>(null);
  const [pin, setPin] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!prices.length) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl text-sm"
        style={{ height: 180, background: "#0a0a0a", color: "#374151" }}
      >
        กำลังโหลดราคา…
      </div>
    );
  }

  const W = 900, H = 260;
  const PL = 12, PR = 12, PT = 20, PB = 32;
  const cW = W - PL - PR, cH = H - PT - PB;

  const minP = Math.min(...prices.map((p) => p.price)) * 0.98;
  const maxP = Math.max(...prices.map((p) => p.price)) * 1.02;
  const minD = new Date(prices[0].date).getTime();
  const maxD = new Date(prices[prices.length - 1].date).getTime();

  const xS = (d: string) =>
    PL + ((new Date(d).getTime() - minD) / (maxD - minD)) * cW;
  const yS = (p: number) =>
    PT + cH - ((p - minP) / (maxP - minP)) * cH;

  const path = prices
    .map((p, i) => `${i === 0 ? "M" : "L"}${xS(p.date).toFixed(1)},${yS(p.price).toFixed(1)}`)
    .join(" ");
  const last = prices[prices.length - 1];
  const area =
    path +
    ` L${xS(last.date).toFixed(1)},${(PT + cH).toFixed(1)} L${PL},${(PT + cH).toFixed(1)} Z`;

  const first = prices[0].price;
  const lastPrice = last.price;
  const pct = ((lastPrice - first) / first) * 100;
  const up = pct >= 0;
  const lineColor = up ? "#22c55e" : "#ef4444";

  // Month tick positions
  const months: PricePoint[] = [];
  const seen = new Set<string>();
  prices.forEach((p) => {
    const m = p.date.slice(0, 7);
    if (!seen.has(m)) { seen.add(m); months.push(p); }
  });

  const fmt = (p: number) =>
    p.toLocaleString("en-US", { minimumFractionDigits: p < 50 ? 2 : 0 });

  return (
    <div>
      {/* Price header */}
      <div className="flex items-baseline justify-between mb-5 px-0.5">
        <div>
          <div className="text-4xl font-black tracking-tight text-white">
            ${fmt(lastPrice)}
          </div>
          <div className={`text-sm mt-0.5 font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
            <span className="ml-2 text-xs" style={{ color: "#4b5563" }}>
              since {new Date(prices[0].date).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
            </span>
          </div>
        </div>
        <div className="text-right text-xs leading-relaxed" style={{ color: "#4b5563" }}>
          <div>{mentions.length} mention{mentions.length !== 1 ? "s" : ""}</div>
          {mentions.length > 0 && (
            <div>last: {mentions[mentions.length - 1].date}</div>
          )}
        </div>
      </div>

      {/* SVG chart */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0a0a0a" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          ref={svgRef}
          onMouseMove={(e) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mx = (e.clientX - rect.left) * (W / rect.width);
            const pct = (mx - PL) / cW;
            if (pct < 0 || pct > 1) { setHover(null); return; }
            const idx = Math.round(pct * (prices.length - 1));
            setHover(prices[Math.max(0, Math.min(idx, prices.length - 1))]);
          }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`g-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={area} fill={`url(#g-${ticker})`} />
          {/* Price line */}
          <path d={path} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" />

          {/* Month labels */}
          {months.map((p, i) => (
            <text
              key={i}
              x={xS(p.date)}
              y={H - 8}
              textAnchor="middle"
              fill="#374151"
              fontSize="9"
              fontFamily="monospace"
            >
              {new Date(p.date).toLocaleDateString("en-US", { month: "short" })}
            </text>
          ))}

          {/* Mention pins */}
          {mentions.map((m, i) => {
            const px = xS(m.date);
            // Find closest price point by date
            const closest = prices.reduce((a, b) =>
              Math.abs(new Date(b.date).getTime() - new Date(m.date).getTime()) <
              Math.abs(new Date(a.date).getTime() - new Date(m.date).getTime())
                ? b : a
            );
            const py = yS(closest.price);
            const ac = ACTION_META[m.action] ?? ACTION_META["ถือ"];
            const isActive = pin === i;

            // Keep tooltip box inside chart bounds
            const bw = 190, bh = 68;
            const bx = Math.min(Math.max(px - bw / 2, PL), W - PR - bw);
            const by = Math.max(py - bh - 16, PT);

            return (
              <g
                key={i}
                onClick={() => setPin(isActive ? null : i)}
                style={{ cursor: "pointer" }}
              >
                {/* Dashed vertical line */}
                <line
                  x1={px} y1={PT} x2={px} y2={py - 8}
                  stroke={ac.color} strokeWidth="1" strokeDasharray="2,3" opacity="0.4"
                />
                {/* Pin circle */}
                <circle
                  cx={px} cy={py - 8} r={isActive ? 5.5 : 4}
                  fill={ac.color} stroke="#0a0a0a" strokeWidth="1.5"
                  style={{ transition: "r 0.1s" }}
                />

                {/* Tooltip popup on click */}
                {isActive && (
                  <g>
                    <rect
                      x={bx} y={by} width={bw} height={bh} rx={8}
                      fill="#111" stroke={ac.color} strokeWidth="1" opacity="0.97"
                    />
                    <text x={bx + 12} y={by + 18} fill="#6b7280" fontSize="9" fontFamily="monospace">
                      {m.date}
                    </text>
                    {/* Action badge */}
                    <rect x={bx + 12} y={by + 24} width={34} height={14} rx={3} fill={ac.color} />
                    <text
                      x={bx + 29} y={by + 34}
                      textAnchor="middle" fill="#000" fontSize="8" fontWeight="bold" fontFamily="monospace"
                    >
                      {ac.label}
                    </text>
                    {/* Price */}
                    {m.price != null && (
                      <text x={bx + 52} y={by + 34} fill="#d1d5db" fontSize="9" fontFamily="monospace">
                        ${m.price}
                      </text>
                    )}
                    {/* Note */}
                    <text x={bx + 12} y={by + 52} fill="#6b7280" fontSize="8.5" fontFamily="monospace">
                      {m.note.slice(0, 30)}{m.note.length > 30 ? "…" : ""}
                    </text>
                    {/* Video title hint */}
                    <text x={bx + 12} y={by + 63} fill="#374151" fontSize="7.5" fontFamily="monospace">
                      ▶ {m.videoTitle.slice(0, 26)}{m.videoTitle.length > 26 ? "…" : ""}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Crosshair on hover */}
          {hover && (() => {
            const hx = xS(hover.date);
            const hy = yS(hover.price);
            return (
              <g pointerEvents="none">
                <line x1={hx} y1={PT} x2={hx} y2={PT + cH} stroke="#1f2937" strokeWidth="1" />
                <circle cx={hx} cy={hy} r={3.5} fill={lineColor} stroke="#0a0a0a" strokeWidth="1.5" />
                <rect x={hx - 36} y={hy - 22} width={72} height={18} rx={4} fill="#111" />
                <text
                  x={hx} y={hy - 10}
                  textAnchor="middle" fill="#e5e7eb" fontSize="10" fontFamily="monospace"
                >
                  ${fmt(hover.price)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="text-xs mt-2 text-right" style={{ color: "#374151" }}>
        คลิกที่หมุด = ดูรายละเอียด
      </div>
    </div>
  );
}
