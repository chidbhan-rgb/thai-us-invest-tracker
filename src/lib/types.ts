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

export const ACTION_META: Record<Action, { bg: string; text: string; label: string }> = {
  "ซื้อ":       { bg: "#10b981", text: "#fff", label: "BUY" },
  "ซื้อเพิ่ม":  { bg: "#34d399", text: "#000", label: "ADD" },
  "ถือ":        { bg: "#f59e0b", text: "#000", label: "HOLD" },
  "ขาย":        { bg: "#ef4444", text: "#fff", label: "SELL" },
  "หลีกเลี่ยง": { bg: "#6b7280", text: "#fff", label: "AVOID" },
};
