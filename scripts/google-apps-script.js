// ============================================================
// Thai-US Invest Tracker — Google Apps Script
// วาง script นี้ใน Google Apps Script แล้วตั้ง Trigger รายวัน
// ต้องเปิดใช้ YouTube Data API v3 ใน Services
// ============================================================

const GEMINI_API_KEY  = "ใส่_GEMINI_API_KEY_ที่นี่";
const CHANNEL_ID      = "UCcFtS_df5r0zxNZ_7JZgmZQ"; // ช่อง ลงทุนหุ้นอเมริกา

// ============================================================
// MAIN — รันทุกวัน ดึงคลิปใหม่ → transcript → Gemini → Sheet
// ============================================================
function dailyYouTubeStockTracker() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // 1. ดึงคลิปล่าสุด 3 อัน (ป้องกันกรณีคลิปล่าสุดไม่มีเนื้อหาหุ้น)
  const searchRes = YouTube.Search.list("id,snippet", {
    channelId: CHANNEL_ID,
    maxResults: 3,
    order: "date",
    type: "video"
  });

  if (!searchRes.items || searchRes.items.length === 0) {
    Logger.log("ไม่พบคลิปใหม่");
    return;
  }

  // ดึง URL ที่มีอยู่แล้วใน Sheet เพื่อตรวจ duplicate
  const lastRow = sheet.getLastRow();
  const existingUrls = lastRow > 0
    ? sheet.getRange(1, 1, lastRow, 1).getValues().flat()
    : [];

  let processed = 0;

  for (const item of searchRes.items) {
    const videoId  = item.id.videoId;
    const videoUrl = "https://www.youtube.com/watch?v=" + videoId;
    const title    = item.snippet.title;

    // ข้ามถ้าเคยบันทึกแล้ว
    if (existingUrls.includes(videoUrl)) {
      Logger.log("ข้าม (มีอยู่แล้ว): " + title);
      continue;
    }

    Logger.log("กำลังประมวลผล: " + title);

    // 2. ดึง transcript (หลายวิธี fallback)
    const transcript = fetchTranscript(videoId, title);

    // 3. ส่งให้ Gemini วิเคราะห์
    const analysis = analyzeWithGemini(transcript, title);

    // 4. เขียนลง Sheet
    sheet.appendRow([videoUrl, analysis]);
    Logger.log("บันทึกแล้ว: " + title);
    processed++;

    // Delay ป้องกัน rate limit
    Utilities.sleep(2000);
  }

  Logger.log("เสร็จ — บันทึก " + processed + " คลิป");
}

// ============================================================
// ดึง Transcript — ลอง 3 วิธีตามลำดับ
// ============================================================
function fetchTranscript(videoId, title) {
  // วิธีที่ 1: timedtext API (ภาษาไทย)
  try {
    const res = UrlFetchApp.fetch(
      "https://www.youtube.com/api/timedtext?v=" + videoId + "&lang=th&fmt=json3",
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() === 200) {
      const json = JSON.parse(res.getContentText());
      const text = extractTimedText(json);
      if (text.length > 200) {
        Logger.log("Transcript: timedtext ไทย (" + text.length + " chars)");
        return text;
      }
    }
  } catch(e) {}

  // วิธีที่ 2: timedtext API (auto-generated)
  try {
    const res = UrlFetchApp.fetch(
      "https://www.youtube.com/api/timedtext?v=" + videoId + "&lang=th&kind=asr&fmt=json3",
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() === 200) {
      const json = JSON.parse(res.getContentText());
      const text = extractTimedText(json);
      if (text.length > 200) {
        Logger.log("Transcript: timedtext auto (" + text.length + " chars)");
        return text;
      }
    }
  } catch(e) {}

  // วิธีที่ 3: ใช้ Description แทน (fallback)
  try {
    const videoRes = YouTube.Videos.list("snippet", { id: videoId });
    if (videoRes.items && videoRes.items.length > 0) {
      const desc = videoRes.items[0].snippet.description;
      if (desc && desc.length > 100) {
        Logger.log("Transcript: ใช้ Description fallback (" + desc.length + " chars)");
        return "[ใช้ Description แทน transcript]\n" + desc;
      }
    }
  } catch(e) {}

  Logger.log("Transcript: ไม่ได้ transcript ใช้แค่ชื่อคลิป");
  return "[ไม่มี transcript — วิเคราะห์จากชื่อคลิปเท่านั้น]\nชื่อคลิป: " + title;
}

function extractTimedText(json) {
  if (!json || !json.events) return "";
  return json.events
    .filter(e => e.segs)
    .map(e => e.segs.map(s => s.utf8 || "").join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// Gemini Analysis — output structured text พร้อม import
// ============================================================
function analyzeWithGemini(transcript, title) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;

  const prompt = `คุณเป็นผู้เชี่ยวชาญวิเคราะห์หุ้น US จากรายการ YouTube ภาษาไทย

วิเคราะห์เนื้อหาต่อไปนี้แล้วสรุปหุ้น US ทุกตัวที่มีคำแนะนำชัดเจน

สำหรับแต่ละหุ้นให้ระบุ:
[TICKER] ชื่อบริษัท
• Action: ซื้อ / ซื้อเพิ่ม / ถือ / ขาย / หลีกเลี่ยง
• ราคาแนวรับ: (ถ้ามี)
• ราคาเป้าหมาย: (ถ้ามี)
• สรุปเหตุผล: (1-2 ประโยค)

กฎ:
- เฉพาะหุ้น US เท่านั้น ไม่รวมหุ้นไทย (SET)
- ต้องมีคำแนะนำ Action ชัดเจน ถ้าแค่พูดถึงอย่างเดียวโดยไม่แนะนำให้ข้าม
- ถ้าไม่มีข้อมูลเพียงพอให้ตอบว่า "ไม่พบหุ้นที่มีคำแนะนำชัดเจนในคลิปนี้"

ชื่อคลิป: ${title}

เนื้อหา:
${transcript.slice(0, 12000)}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 }
  };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() !== 200) {
      Logger.log("Gemini error: " + res.getContentText());
      return "⚠️ Gemini API error: " + res.getResponseCode();
    }

    const json = JSON.parse(res.getContentText());
    return json.candidates[0].content.parts[0].text;

  } catch(e) {
    Logger.log("Gemini exception: " + e.toString());
    return "⚠️ วิเคราะห์ไม่สำเร็จ: " + e.toString();
  }
}

// ============================================================
// MANUAL — รันด้วยตัวเองสำหรับ videoId ที่ระบุ
// ใช้เมื่อต้องการเพิ่มคลิปนอกรอบอัตโนมัติ
// ============================================================
function runManual() {
  const VIDEO_ID = "ใส่_VIDEO_ID_ที่นี่"; // เช่น "THQeVCYpPBI"
  const sheet    = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const videoUrl = "https://www.youtube.com/watch?v=" + VIDEO_ID;

  const videoRes = YouTube.Videos.list("snippet", { id: VIDEO_ID });
  const title    = videoRes.items?.[0]?.snippet?.title || VIDEO_ID;

  const transcript = fetchTranscript(VIDEO_ID, title);
  const analysis   = analyzeWithGemini(transcript, title);

  sheet.appendRow([videoUrl, analysis]);
  Logger.log("Manual บันทึกแล้ว: " + title);
}
