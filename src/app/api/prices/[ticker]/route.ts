import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import type { PricePoint } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params;

  try {
    const result = await yahooFinance.historical(ticker, {
      period1: "2026-01-01",
      period2: new Date().toISOString().slice(0, 10),
      interval: "1d",
    });

    console.log(`[prices/${ticker}] fetched ${result.length} rows`);

    const prices: PricePoint[] = result
      .filter((r) => r.close != null)
      .map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        price: Math.round(r.close! * 100) / 100,
      }));

    return NextResponse.json(prices);
  } catch (err) {
    console.error(`[prices/${ticker}] fetch failed:`, err);
    return NextResponse.json([], { status: 200 });
  }
}
