import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import type { StocksData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "data", "stocks.json");
    const raw = readFileSync(filePath, "utf-8");
    const data: StocksData = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { lastUpdated: null, processedVideos: [], mentions: {} },
      { status: 200 }
    );
  }
}
