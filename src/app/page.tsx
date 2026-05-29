import Dashboard from "@/components/Dashboard";
import type { StocksData } from "@/lib/types";

// Import directly — bundled at deploy time. Vercel redeploys on every
// git push, so the data is always fresh after the pipeline commits stocks.json.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const stocksData = require("../../data/stocks.json") as StocksData;

export default function Page() {
  if (!stocksData.sectors) stocksData.sectors = {};
  return <Dashboard initialData={stocksData} />;
}
