import Dashboard from "@/components/Dashboard";
import { readFileSync } from "fs";
import { join } from "path";
import type { StocksData } from "@/lib/types";

export const revalidate = 3600; // revalidate every hour

async function getStocksData(): Promise<StocksData> {
  try {
    const filePath = join(process.cwd(), "data", "stocks.json");
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { lastUpdated: null, processedVideos: [], mentions: {} };
  }
}

export default async function Page() {
  const data = await getStocksData();
  return <Dashboard initialData={data} />;
}
