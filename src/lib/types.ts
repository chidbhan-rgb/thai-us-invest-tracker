export type Action = "ซื้อ" | "ซื้อเพิ่ม" | "ถือ" | "ขาย" | "หลีกเลี่ยง";

export interface Mention {
  date: string;        // YYYY-MM-DD
  videoId: string;
  videoTitle: string;
  action: Action;
  price: number | null;
  note: string;
}

export interface StocksData {
  lastUpdated: string | null;
  processedVideos: string[];       // video IDs already processed
  mentions: Record<string, Mention[]>;
}

export interface PricePoint {
  date: string;   // YYYY-MM-DD
  price: number;
}

export interface VideoStock {
  ticker: string;
  action: Action;
  price: number | null;
  note: string;
}

export interface VideoEntry {
  videoId: string;
  videoTitle: string;
  date: string;
  stocks: VideoStock[];
}

/** Aggregate mentions by video, sorted newest first */
export function buildVideoList(mentions: Record<string, Mention[]>): VideoEntry[] {
  const map = new Map<string, VideoEntry>();

  for (const [ticker, list] of Object.entries(mentions)) {
    for (const m of list) {
      if (!map.has(m.videoId)) {
        map.set(m.videoId, {
          videoId: m.videoId,
          videoTitle: m.videoTitle,
          date: m.date,
          stocks: [],
        });
      }
      map.get(m.videoId)!.stocks.push({
        ticker,
        action: m.action,
        price: m.price,
        note: m.note,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export const ACTION_META: Record<Action, { color: string; dim: string; label: string }> = {
  "ซื้อ":       { color: "#22c55e", dim: "#166534", label: "BUY"   },
  "ซื้อเพิ่ม":  { color: "#86efac", dim: "#14532d", label: "ADD"   },
  "ถือ":        { color: "#eab308", dim: "#713f12", label: "HOLD"  },
  "ขาย":        { color: "#ef4444", dim: "#7f1d1d", label: "SELL"  },
  "หลีกเลี่ยง": { color: "#6b7280", dim: "#1f2937", label: "AVOID" },
};
