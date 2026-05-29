import Dashboard from "@/components/Dashboard";
import type { StocksData } from "@/lib/types";
import rawData from "../../data/stocks.json";

// stocks.json is bundled at deploy time — Vercel redeploys on every git push
// so the data is always fresh after the pipeline commits stocks.json to git.
export default function Page() {
  const data = rawData as unknown as StocksData;
  return <Dashboard initialData={data} />;
}
