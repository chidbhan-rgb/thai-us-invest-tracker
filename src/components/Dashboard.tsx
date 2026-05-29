"use client";

import { useState, useEffect, useCallback } from "react";
import TickerSelector from "./TickerSelector";
import StockChart from "./StockChart";
import MentionList from "./MentionList";
import { ACTION_META, type StocksData, type PricePoint, type Mention } from "@/lib/types";

interface Props {
  initialData: StocksData;
}

export default function Dashboard({ initialData }: Props) {
  const tickers = Object.keys(initialData.mentions).sort();
  const [selected, setSelected] = useState<string>(tickers[0] ?? "");
  const [priceCache, setPriceCache] = useState<Record<string, PricePoint[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(
    async (ticker: string) => {
      if (priceCache[ticker]) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/prices/${ticker}`);
        const data: PricePoint[] = await res.json();
        setPriceCache((c) => ({ ...c, [ticker]: data }));
      } catch {
        setPriceCache((c) => ({ ...c, [ticker]: [] }));
      } finally {
        setLoading(false);
      }
    },
    [priceCache]
  );

  useEffect(() => {
    if (selected) fetchPrices(selected);
  }, [selected, fetchPrices]);

  const prices = priceCache[selected] ?? [];
  const mentions: Mention[] = initialData.mentions[selected] ?? [];
  const isEmpty = tickers.length === 0;

  const lastUpdatedDisplay = initialData.lastUpdated
    ? new Date(initialData.lastUpdated).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
    : "ยังไม่มีข้อมูล";

  return (
    <div className="min-h-screen bg-slate-950 text-white" style={{ fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">
              ลงทุนหุ้นอเมริกา
            </div>
            <div className="text-lg font-black text-white">
              Stock Tracker <span className="text-emerald-400">📡</span>
            </div>
          </div>
          <div className="text-xs text-slate-600 text-right">
            <div className="text-slate-500">อัปเดต</div>
            <div>{lastUpdatedDisplay}</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {/* Ticker selector */}
            <TickerSelector
              tickers={tickers}
              mentions={initialData.mentions}
              selected={selected}
              onSelect={setSelected}
            />

            {/* Chart */}
            {loading && !prices.length ? (
              <div className="flex items-center justify-center h-48 bg-slate-900 border border-slate-800 rounded-xl text-slate-600 text-sm">
                กำลังโหลดราคา…
              </div>
            ) : (
              <StockChart ticker={selected} prices={prices} mentions={mentions} />
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(ACTION_META).map(([action, cfg]) => (
                <div key={action} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.bg }} />
                  {action}
                </div>
              ))}
              <div className="text-xs text-slate-600 ml-auto">hover ที่หมุด = ดูรายละเอียด</div>
            </div>

            {/* Mention list */}
            <MentionList mentions={mentions} ticker={selected} />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 space-y-4">
      <div className="text-4xl">📡</div>
      <div className="text-slate-400 text-sm">ยังไม่มีข้อมูล</div>
      <div className="text-slate-600 text-xs max-w-sm mx-auto leading-relaxed">
        รัน <code className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300">npm run pipeline</code> เพื่อดึงข้อมูลจาก YouTube
        หรือรอ GitHub Actions วันถัดไป
      </div>
      <div className="border border-slate-800 rounded-xl p-4 text-xs text-slate-600 max-w-sm mx-auto">
        ตั้งค่า <code className="text-slate-400">ANTHROPIC_API_KEY</code> ใน environment ก่อนรัน pipeline
      </div>
    </div>
  );
}
