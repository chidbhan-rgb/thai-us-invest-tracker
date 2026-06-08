/**
 * Daily pipeline: YouTube RSS → transcript → Claude → data/stocks.json
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/pipeline.mjs
 *   ANTHROPIC_API_KEY=sk-... node scripts/pipeline.mjs --force   # reprocess all videos
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
const DELAY_MS = 5000; // delay between Claude API calls to avoid rate limiting

// ─── Load / save stocks.json ──────────────────────────────────

function loadData() {
  if (!existsSync(DATA_FILE)) {
    mkdirSync(join(__dirname, "../data"), { recursive: true });
    return { lastUpdated: null, processedVideos: [], mentions: {}, sectors: {} };
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
  // Check for manual transcript first
  const manualTranscriptPath = join(__dirname, `../data/transcripts/${videoId}.txt`);
  if (existsSync(manualTranscriptPath)) {
    try {
      const content = readFileSync(manualTranscriptPath, "utf-8");
      console.log(`   Using manual transcript from data/transcripts/${videoId}.txt`);
      return content;
    } catch (err) {
      console.warn(`  ⚠️  Failed to read manual transcript: ${err.message}`);
    }
  }

  // Fall back to YouTube transcript API
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
- price: the price in USD explicitly stated by the speaker as a buy price, target price, or entry price FOR THAT SPECIFIC TICKER — or null if not clearly stated
- note: concise Thai summary of what was said, max 80 characters
- sector: classify the ticker into exactly one of: "AI/Chip" | "Defense/Drone" | "Software/Cloud" | "Fintech" | "Healthcare" | "Energy" | "Consumer" | "Other"
  Examples: NVDA/ARM/AMD/AVGO/TSM/MU/ASML → "AI/Chip", KTOS/AVAV/RKLB/ONDS/AXON → "Defense/Drone",
  NOW/CRM/SNOW/ZS/CRWD/PANW/ADBE → "Software/Cloud", SOFI/V/MA/PYPL/MELI/NU → "Fintech",
  LLY/ISRG/TMDX/NVO/HIMS → "Healthcare", CEG/VST/OKLO/EOSE/IREN → "Energy",
  WMT/COST/AMZN/TSLA/MCD → "Consumer"

Price extraction rules (strict):
- Set price ONLY if the speaker directly says something like "ซื้อที่ $X", "ราคาเป้า $X", "แนวรับ $X", "เข้าที่ $X" for that exact ticker
- If the speaker mentions a price in a different context (e.g. current market price, another stock's price, a hypothetical), set price to null
- If you are not 100% certain the price refers to that ticker as a buy/target/entry price, set price to null
- Do NOT infer, guess, or carry over prices from context

General rules:
- Only include stocks with an explicit buy/sell/hold/avoid opinion
- If the same ticker is mentioned multiple times with different opinions, include only the strongest/clearest one
- Return a JSON array. If no stocks found, return []
- Do not include Thai stocks (SET market), only US stocks`;

const CHUNK_SIZE = 8000;
const VALID_ACTIONS = ["ซื้อ", "ซื้อเพิ่ม", "ถือ", "ขาย", "หลีกเลี่ยง"];

/** Split transcript into overlapping chunks so mentions near boundaries aren't cut off */
function chunkTranscript(text) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
    i += CHUNK_SIZE;
  }
  return chunks;
}

/** Send one chunk to Claude and return raw mention array */
async function callClaude(chunk, videoTitle, chunkIndex, totalChunks) {
  const label = totalChunks > 1 ? ` (chunk ${chunkIndex + 1}/${totalChunks})` : "";
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-7",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // cache system prompt across all chunks
        },
      ],
      messages: [
        {
          role: "user",
          content: `Video title: ${videoTitle}${label}\n\nTranscript:\n${chunk}`,
        },
      ],
    });

    const raw = response.content[0].text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (m) => m.ticker && m.action && VALID_ACTIONS.includes(m.action)
    );
  } catch (err) {
    console.error(`  ❌ Claude error${label}: ${err.message}`);
    return [];
  }
}

/** Merge mentions from all chunks — deduplicate by ticker, keeping the entry with a non-null price,
 *  or the last one seen if both/neither have a price */
function mergeMentions(allMentions) {
  const map = new Map();
  for (const m of allMentions) {
    const ticker = m.ticker.toUpperCase();
    if (!map.has(ticker)) {
      map.set(ticker, { ...m, ticker });
    } else {
      const existing = map.get(ticker);
      // Prefer entry with a real price; otherwise keep the later (more complete) one
      if (m.price != null && existing.price == null) {
        map.set(ticker, { ...m, ticker });
      }
    }
  }
  return [...map.values()];
}

async function extractMentions(transcript, videoTitle) {
  if (!transcript || transcript.length < 100) return [];

  const chunks = chunkTranscript(transcript);
  console.log(`   Splitting into ${chunks.length} chunk(s) of up to ${CHUNK_SIZE} chars`);

  const allMentions = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    const found = await callClaude(chunks[i], videoTitle, i, chunks.length);
    console.log(`   Chunk ${i + 1}/${chunks.length}: ${found.length} mention(s)`);
    allMentions.push(...found);
  }

  const merged = mergeMentions(allMentions);
  if (chunks.length > 1) {
    console.log(`   Merged → ${merged.length} unique ticker(s)`);
  }
  return merged;
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  console.log(`🚀 Starting pipeline…${force ? " (--force: reprocessing all)" : ""}`);

  const data = loadData();

  if (force) {
    data.processedVideos = [];
    data.mentions = {};
    data.sectors = {};
    console.log("⚠️  Force mode — cleared processed cache, mentions, and sectors");
  }

  const isFirstRun = data.processedVideos.length === 0;

  if (isFirstRun && !force) {
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
      console.log(`  ⏭️  Skipping (no transcript yet) — will retry next run`);
      continue; // do NOT mark as processed so we retry tomorrow
    }
    console.log(`   Transcript: ${transcript.length} chars`);

    // Extract stock mentions
    const mentions = await extractMentions(transcript, video.title);
    console.log(`   Claude found ${mentions.length} stock mention(s)`);

    // Merge into data
    if (!data.sectors) data.sectors = {};
    for (const m of mentions) {
      const ticker = m.ticker.toUpperCase();
      if (!data.mentions[ticker]) data.mentions[ticker] = [];

      // Save / update sector for this ticker
      if (m.sector) data.sectors[ticker] = m.sector;

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
        console.log(`   ✅ ${ticker} → ${m.action} [${m.sector ?? "Other"}]`);
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
