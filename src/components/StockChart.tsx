"use client";

import { useState, useCallback } from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { ACTION_META, type Mention, type PricePoint } from "@/lib/types";

// ─── Custom mention pin rendered inside Scatter ───────────────
function MentionDot(props: {
  cx?: number;
  cy?: number;
  payload?: MentionPoint;
  onHover: (m: MentionPoint | null) => void;
  hovered: MentionPoint | null;
}) {
  const { cx = 0, cy = 0, payload, onHover, hovered } = props;
  if (!payload) return null;
  const ac = ACTION_META[payload.action] ?? ACTION_META["ถือ"];
  const isHovered = hovered?.date === payload.date && hovered?.action === payload.action;

  return (
    <g
      onMouseEnter={() => onHover(payload)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: "pointer" }}
    >
      {/* dashed vertical line from top to circle */}
      <line
        x1={cx} y1={10} x2={cx} y2={cy - 12}
        stroke={ac.bg} strokeWidth={1} strokeDasharray="3,3" opacity={0.5}
      />
      {/* action chip at top */}
      <rect x={cx - 16} y={2} width={32} height={14} rx={4} fill={ac.bg} opacity={0.9} />
      <text x={cx} y={13} textAnchor="middle" fill={ac.text} fontSize={8} fontWeight="bold" fontFamily="monospace">
        {ac.label}
      </text>
      {/* pin circle */}
      <circle
        cx={cx} cy={cy - 12} r={isHovered ? 9 : 7}
        fill={ac.bg} stroke="#0f172a" strokeWidth={2}
        style={{ transition: "r 0.15s" }}
      />
    </g>
  );
}

// ─── Tooltip for hovered mention ─────────────────────────────
function MentionTooltipOverlay({ mention, chartRight }: { mention: MentionPoint; chartRight: boolean }) {
  const ac = ACTION_META[mention.action] ?? ACTION_META["ถือ"];
  return (
    <div
      className={`absolute top-8 ${chartRight ? "right-4" : "left-4"} z-10 bg-slate-950 border rounded-xl p-3 text-xs font-mono shadow-xl`}
      style={{ borderColor: ac.bg, minWidth: 220, maxWidth: 280 }}
    >
      <div className="text-slate-400 mb-1">{mention.date}</div>
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 rounded font-black text-xs" style={{ background: ac.bg, color: ac.text }}>
          {ac.label}
        </span>
        {mention.price != null && (
          <span className="text-amber-400 font-bold">${mention.price}</span>
        )}
      </div>
      <div className="text-slate-300 leading-snug">{mention.note}</div>
    </div>
  );
}

// ─── Custom price tooltip ─────────────────────────────────────
function PriceTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const date = label ? new Date(label).toISOString().slice(0, 10) : "";
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono">
      <div className="text-slate-400">{date}</div>
      <div className="text-white font-bold">${payload[0].value.toFixed(2)}</div>
    </div>
  );
}

interface MentionPoint extends Mention {
  timestamp: number;
  chartPrice: number;
}

interface Props {
  ticker: string;
  prices: PricePoint[];
  mentions: Mention[];
}

export default function StockChart({ ticker, prices, mentions }: Props) {
  const [hoveredMention, setHoveredMention] = useState<MentionPoint | null>(null);

  const handleHover = useCallback((m: MentionPoint | null) => setHoveredMention(m), []);

  if (!prices.length) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-900 border border-slate-800 rounded-xl text-slate-600 text-sm">
        กำลังโหลดราคา…
      </div>
    );
  }

  // Build chart data — timestamp as numeric x-axis
  const chartData = prices.map((p) => ({
    timestamp: new Date(p.date).getTime(),
    price: p.price,
  }));

  // Map each mention to the closest price on or after its date
  const mentionPoints: MentionPoint[] = mentions.map((m) => {
    const ts = new Date(m.date).getTime();
    const closest = prices.find((p) => p.date >= m.date) ?? prices[prices.length - 1];
    return { ...m, timestamp: ts, chartPrice: closest.price };
  });

  const firstPrice = prices[0].price;
  const lastPrice = prices[prices.length - 1].price;
  const pctChange = (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(1);
  const isUp = lastPrice >= firstPrice;
  const lineColor = isUp ? "#10b981" : "#ef4444";

  const fromLabel = new Date(prices[0].date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

  // x-axis: month labels
  const monthTicks: number[] = [];
  const seenMonths = new Set<string>();
  prices.forEach((p) => {
    const m = p.date.slice(0, 7);
    if (!seenMonths.has(m)) {
      seenMonths.add(m);
      monthTicks.push(new Date(p.date).getTime());
    }
  });

  const renderMentionDot = useCallback(
    (props: object) =>
      MentionDot({ ...(props as { cx?: number; cy?: number; payload?: MentionPoint }), onHover: handleHover, hovered: hoveredMention }),
    [handleHover, hoveredMention]
  );

  // Determine if hoveredMention is in the right half (position tooltip on left)
  const midTs = chartData.length ? chartData[Math.floor(chartData.length / 2)].timestamp : 0;
  const tooltipOnRight = hoveredMention ? hoveredMention.timestamp < midTs : false;

  return (
    <div>
      {/* Price header */}
      <div className="flex items-baseline gap-3 mb-3 px-1">
        <span className="text-3xl font-black text-white">${lastPrice.toFixed(0)}</span>
        <span className={`text-sm font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(Number(pctChange))}% ตั้งแต่ {fromLabel}
        </span>
        <span className="text-xs text-slate-500 ml-auto">Yahoo Finance</span>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
        {hoveredMention && (
          <MentionTooltipOverlay mention={hoveredMention} chartRight={tooltipOnRight} />
        )}
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 24, right: 16, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id={`area-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#1e293b" strokeDasharray="0" vertical={false} />

            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={monthTicks}
              tickFormatter={(ts) =>
                new Date(ts).toLocaleDateString("th-TH", { month: "short" })
              }
              tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={(v) => `$${Math.round(v)}`}
              axisLine={false}
              tickLine={false}
              width={56}
            />

            <Tooltip content={<PriceTooltip />} />

            <Line
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: lineColor, stroke: "#0f172a", strokeWidth: 2 }}
            />

            {/* Mention pins as Scatter */}
            <Scatter
              data={mentionPoints}
              dataKey="chartPrice"
              shape={renderMentionDot}
              isAnimationActive={false}
            />

            {/* Reference lines for each mention date */}
            {mentionPoints.map((m, i) => (
              <ReferenceLine
                key={i}
                x={m.timestamp}
                stroke="transparent"
                strokeWidth={0}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
