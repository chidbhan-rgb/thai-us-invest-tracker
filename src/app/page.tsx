import Dashboard from "@/components/Dashboard";
import type { StocksData } from "@/lib/types";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

function getStocksData(): StocksData {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "stocks.json"), "utf-8");
    const data = JSON.parse(raw) as StocksData;
    if (!data.sectors) data.sectors = {};
    return data;
  } catch {
    return { lastUpdated: null, processedVideos: [], mentions: {}, sectors: {} };
  }
}

export default function Page() {
  const data = getStocksData();
  return <Dashboard initialData={data} />;
}
