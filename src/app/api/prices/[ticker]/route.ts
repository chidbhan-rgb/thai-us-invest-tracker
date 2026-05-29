import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import type { PricePoint } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params;
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 4);

  try {
    const result = await yahooFinance.historical(ticker, {
      period1: from.toISOString().slice(0, 10),
      period2: to.toISOString().slice(0, 10),
      interval: "1d",
    });

    const prices: PricePoint[] = result
      .filter((r) => r.close != null)
      .map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        price: Math.round(r.close! * 100) / 100,
      }));

    return NextResponse.json(prices);
  } catch (err) {
    console.error(`Failed to fetch prices for ${ticker}:`, err);
    return NextResponse.json([], { status: 200 });
  }
}
