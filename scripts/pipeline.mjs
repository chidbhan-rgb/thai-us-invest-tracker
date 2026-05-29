/**
 * Daily pipeline: YouTube RSS → transcript → Claude → data/stocks.json
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/pipeline.mjs
 *
 * On first run (empty processedVideos), backfills the last 3 months of videos.
 */

import { XMLParser } from "fast-xml-parser";
import { YoutubeTranscript } from "youtube-transcript";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "../data/stocks.json");
const CHANNEL_RSS =
  "https://www.youtube.com/feeds/videos.xml?channel_id=UCcFtS_df5r0zxNZ_7JZgmZQ";
const BACKFILL_MONTHS = 3;
const DELAY_MS = 2000; // polite delay between API calls

// ─── Load / save stocks.json ──────────────────────────────────

function loadData() {
  if (!existsSync(DATA_FILE)) {
    mkdirSync(join(__dirname, "../data"), { recursive: true });
    return { lastUpdated: null, processedVideos: [], mentions: {} };
  }
  return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
}

function saveData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  console.log("✅ Saved data/stocks.json");
}

// ─── Fetch RSS feed ───────────────────────────────────────────

async function fetchRSS() {
  const res = await fetch(CHANNEL_RSS);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const entries = doc.feed?.entry ?? [];
  const videos = (Array.isArray(entries) ? entries : [entries]).map((e) => ({
    id: e["yt:videoId"],
    title: e.title,
    published: e.published?.slice(0, 10) ?? "",
    url: `https://www.youtube.com/watch?v=${e["yt:videoId"]}`,
  }));

  return videos;
}

// ─── Fetch YouTube transcript ─────────────────────────────────

async function fetchTranscript(videoId) {
  try {
    // Try Thai first, fall back to auto-generated
    const segments = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "th",
    }).catch(() => YoutubeTranscript.fetchTranscript(videoId));

    return segments.map((s) => s.text).join(" ");
  } catch (err) {
    console.warn(`  ⚠️  No transcript for ${videoId}: ${err.message}`);
    return null;
  }
}

// ─── Extract stock mentions via Claude ────────────────────────

const client = new Anthropic();

const SYSTEM_PROMPT = `You analyze Thai YouTube video transcripts about US stock investing.
Extract every US stock mentioned with a clear recommendation.

For each stock return JSON with:
- ticker: US stock ticker symbol (e.g. NVDA, AAPL, TSLA)
- action: one of "ซื้อ" | "ซื้อเพิ่ม" | "ถือ" | "ขาย" | "หลีกเลี่ยง"
- price: price in USD if explicitly mentioned (number or null)
- note: concise Thai summary of what was said, max 80 characters

Rules:
- Only include stocks with an explicit buy/sell/hold/avoid opinion
- If the same ticker is mentioned multiple times with different opinions, include only the strongest/clearest one
- Return a JSON array. If no stocks found, return []
- Do not include Thai stocks (SET market), only US stocks`;

async function extractMentions(transcript, videoTitle) {
  if (!transcript || transcript.length < 100) return [];

  // Truncate very long transcripts (Claude has a context limit but we also want to keep cost down)
  const text = transcript.slice(0, 40000);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          // Cache the system prompt — it never changes between calls
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Video title: ${videoTitle}\n\nTranscript:\n${text}`,
        },
      ],
    });

    const raw = response.content[0].text.trim();

    // Extract JSON array from the response (handles markdown code blocks)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (m) =>
        m.ticker &&
        m.action &&
        ["ซื้อ", "ซื้อเพิ่ม", "ถือ", "ขาย", "หลีกเลี่ยง"].includes(m.action)
    );
  } catch (err) {
    console.error(`  ❌ Claude error: ${err.message}`);
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }

  console.log("🚀 Starting pipeline…");

  const data = loadData();
  const isFirstRun = data.processedVideos.length === 0;

  if (isFirstRun) {
    console.log(`📅 First run — will backfill last ${BACKFILL_MONTHS} months`);
  }

  // Fetch all videos from RSS
  console.log("📡 Fetching YouTube RSS…");
  const allVideos = await fetchRSS();
  console.log(`   Found ${allVideos.length} videos in feed`);

  // Filter: unprocessed + (if first run) within backfill window
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - BACKFILL_MONTHS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const toProcess = allVideos.filter((v) => {
    if (data.processedVideos.includes(v.id)) return false;
    if (isFirstRun && v.published < cutoffStr) return false;
    return true;
  });

  console.log(`   Processing ${toProcess.length} new video(s)`);

  if (toProcess.length === 0) {
    console.log("✅ Nothing new to process.");
    return;
  }

  // Process each video oldest-first
  const sorted = toProcess.sort((a, b) => a.published.localeCompare(b.published));

  for (const video of sorted) {
    console.log(`\n🎬 ${video.title} (${video.published})`);

    // Fetch transcript
    const transcript = await fetchTranscript(video.id);
    if (!transcript) {
      data.processedVideos.push(video.id);
      continue;
    }
    console.log(`   Transcript: ${transcript.length} chars`);

    // Extract stock mentions
    const mentions = await extractMentions(transcript, video.title);
    console.log(`   Claude found ${mentions.length} stock mention(s)`);

    // Merge into data
    for (const m of mentions) {
      const ticker = m.ticker.toUpperCase();
      if (!data.mentions[ticker]) data.mentions[ticker] = [];

      // Avoid duplicate entries for the same video+ticker
      const exists = data.mentions[ticker].some((x) => x.videoId === video.id);
      if (!exists) {
        data.mentions[ticker].push({
          date: video.published,
          videoId: video.id,
          videoTitle: video.title,
          action: m.action,
          price: m.price ?? null,
          note: m.note ?? "",
        });
        console.log(`   ✅ ${ticker} → ${m.action}`);
      }
    }

    data.processedVideos.push(video.id);

    // Polite delay between API calls
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  // Sort each ticker's mentions by date
  for (const ticker of Object.keys(data.mentions)) {
    data.mentions[ticker].sort((a, b) => a.date.localeCompare(b.date));
  }

  data.lastUpdated = new Date().toISOString().slice(0, 10);
  saveData(data);
  console.log("\n🎉 Pipeline complete.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
