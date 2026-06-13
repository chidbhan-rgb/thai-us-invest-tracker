# Thai-US Stock Tracker - Setup Guide

## 📊 Project Status
- **Live Dashboard:** https://thai-us-invest-tracker.vercel.app/
- **GitHub:** https://github.com/chidbhan-rgb/thai-us-invest-tracker

## 🚀 How It Works (Manual Workflow)

ข้อมูลทั้งหมดถูกเพิ่มด้วยมือ (manual) โดยไม่มี automated pipeline

### ขั้นตอนการเพิ่มวิดีโอใหม่

1. ดูคลิปและสรุปหุ้นพร้อม Action/ราคาแนวรับ-แนวต้าน
2. แจ้ง Claude Code พร้อมส่ง URL คลิป + สรุปเนื้อหา
3. Claude เพิ่มข้อมูลเข้า `data/stocks.json` และสร้างไฟล์ transcript
4. Commit + Push → Vercel auto-deploy

### ข้อมูลที่ต้องส่งให้ Claude
- URL วิดีโอ (`https://www.youtube.com/watch?v=XXXXXXXX`)
- สรุปหุ้นแต่ละตัว: ticker / action (ซื้อ/ขาย/ถือ/ซื้อเพิ่ม/หลีกเลี่ยง) / ราคา / note

---

## 🔧 Local Development

```bash
cd C:\Users\User\Desktop\thai-us-invest-tracker
npm install
npm run dev
# เปิด http://localhost:3000
```

---

## 📂 Key Files

```
data/
  stocks.json           # Main database (videos, mentions, sectors)
  transcripts/
    {videoID}.txt       # สรุป transcript ของแต่ละคลิป

src/
  app/page.tsx          # Dashboard page
  components/
    Dashboard.tsx       # Main UI component
    TickerSelector.tsx  # Ticker list grouped by sector
    MentionList.tsx     # Mention history per ticker
    VideoList.tsx       # By Video tab
  lib/types.ts          # TypeScript types + ACTION_META

```

---

## 📊 Data Schema

### stocks.json
```json
{
  "lastUpdated": "YYYY-MM-DD",
  "processedVideos": ["videoId1", "..."],
  "mentions": {
    "NVDA": [
      {
        "date": "YYYY-MM-DD",
        "videoId": "XeAYFVds2S4",
        "videoTitle": "...",
        "action": "ซื้อ",
        "price": 227,
        "note": "สรุปสั้นๆ ไม่เกิน 80 ตัวอักษร"
      }
    ]
  },
  "sectors": {
    "NVDA": "AI/Chip"
  }
}
```

### Actions
| Action | Label | ความหมาย |
|---|---|---|
| ซื้อ | BUY | แนะนำซื้อ |
| ซื้อเพิ่ม | ADD | เพิ่มไม้ |
| ถือ | HOLD | ถือต่อ |
| ขาย | SELL | ขายทำกำไร |
| หลีกเลี่ยง | AVOID | ไม่แนะนำ |

### Sectors
`AI/Chip` · `Defense/Drone` · `Software/Cloud` · `Fintech` · `Healthcare` · `Energy` · `Consumer` · `Other`
