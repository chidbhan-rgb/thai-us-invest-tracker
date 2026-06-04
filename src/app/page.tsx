import Dashboard from "@/components/Dashboard";
import type { StocksData } from "@/lib/types";
import { readFileSync } from "fs";
import { join } from "path";

export default function Page() {
  // Read stocks.json fresh on every request (dev mode) or build (production)
  const filePath = join(process.cwd(), "data", "stocks.json");
  const fileContent = readFileSync(filePath, "utf-8");
  const stocksData = JSON.parse(fileContent) as StocksData;

  if (!stocksData.sectors) stocksData.sectors = {};
  return <Dashboard initialData={stocksData} />;
}
