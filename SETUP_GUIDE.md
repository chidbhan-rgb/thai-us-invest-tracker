# Thai-US Stock Tracker - Setup & Continuation Guide

## 📊 Project Status
- **Live Dashboard:** https://thai-us-invest-tracker.vercel.app/
- **GitHub:** https://github.com/chidbhan-rgb/thai-us-invest-tracker
- **Current Stats:** 20 videos · 133 tickers
- **Last Updated:** 2026-06-05

## 🚀 How It Works

### Automated Daily Workflow
1. **Daily Pipeline** (4:00 AM Bangkok time = 21:00 UTC)
   - Fetches latest videos from YouTube channel RSS
   - Extracts transcripts (Thai or auto-generated)
   - Uses Claude API to extract stock mentions
   - Commits to GitHub → Vercel auto-deploys

2. **Weekly Keepalive** (Monday 00:00 UTC)
   - Makes empty commit to keep scheduled workflows active
   - Prevents GitHub from disabling workflows

### Manual Transcript Fallback System
When YouTube videos have **disabled transcripts**:
1. You provide the transcript/summary
2. Save to: `data/transcripts/{videoID}.txt`
3. Pipeline automatically uses it next run
4. Claude extracts stocks from your summary

## 🔧 Local Development

### Setup
```bash
cd C:\xampp\htdocs\thai-us-invest-tracker

# Install dependencies
npm install

# Start dev server (runs on port 3000 or next available)
npm run dev
```

### Run Pipeline Manually
```bash
ANTHROPIC_API_KEY="your-key-from-github-secrets" node scripts/pipeline.mjs
```

## 📝 Common Tasks

### 1. Add Manual Transcript for Disabled-Transcript Video
When pipeline shows: `⚠️ Transcript is disabled on this video`

**Steps:**
1. Get transcript text from YouTube or video summary
2. Save to: `data/transcripts/{VIDEO_ID}.txt`
3. Commit and push
4. Run pipeline manually (or wait for next 4am run)

**Example:**
```
Video: https://www.youtube.com/watch?v=-XO-0FlwDAo
VideoID: -XO-0FlwDAo
File: data/transcripts/-XO-0FlwDAo.txt
```

### 2. View Dashboard
- **Local:** `http://localhost:3000` (or 3003, 3004, etc if port busy)
- **Live:** https://thai-us-invest-tracker.vercel.app/

### 3. Check Workflow Status
```bash
gh run list -R chidbhan-rgb/thai-us-invest-tracker --workflow=daily-pipeline.yml --limit=10
```

### 4. Trigger Workflow Manually
```bash
gh workflow run daily-pipeline.yml -R chidbhan-rgb/thai-us-invest-tracker
```

## 🐛 Troubleshooting

### Dashboard Shows Old Data
1. Hard refresh: `Ctrl + Shift + R`
2. Or restart dev server:
   ```bash
   # Kill all node processes
   taskkill /F /IM node.exe
   # Restart
   npm run dev
   ```

### Workflow Never Runs (Scheduled)
- GitHub disables workflows if repo inactive 60+ days
- Keepalive workflow prevents this (runs every Monday)
- If still broken, manually trigger via GitHub Actions UI

### Workflow Runs but No New Videos
- Check YouTube channel for new videos
- Videos with disabled transcripts are skipped (need manual transcript)
- Search for `⚠️ Transcript is disabled` in workflow logs

### API Key Issues
- Key stored in: GitHub Secrets (ANTHROPIC_API_KEY)
- Reach out to repo maintainer for current key

## 📂 Key Files

```
data/
  stocks.json           # Main database (videos, mentions, sectors)
  transcripts/
    {videoID}.txt      # Manual transcripts for disabled-transcript videos

scripts/
  pipeline.mjs         # Main extraction pipeline

src/
  app/
    page.tsx           # Dashboard page (uses readFileSync for fresh data)
    error.tsx          # Error boundary
  components/
    Dashboard.tsx      # Main UI component
  lib/
    types.ts           # TypeScript types

.github/workflows/
  daily-pipeline.yml   # Daily 4am Bangkok time execution
  keepalive.yml        # Weekly Monday keepalive
```

## 💡 Next Steps for New Chat

When starting a new chat session:
1. **Reference this file:** "See SETUP_GUIDE.md for context"
2. **Ask about new videos:** "Any new videos from the channel?"
3. **Check workflow status:** "Did the workflow run today?"
4. **Provide transcripts:** If disabled-transcript videos exist

## 📊 Data Schema

### stocks.json Structure
```json
{
  "lastUpdated": "2026-06-05",
  "processedVideos": ["Cz1g9ANsZIk", "..."],
  "mentions": {
    "NVDA": [
      {
        "date": "2026-06-01",
        "videoId": "XeAYFVds2S4",
        "videoTitle": "...",
        "action": "ซื้อ",
        "price": 227,
        "note": "AI demand..."
      }
    ]
  },
  "sectors": {
    "NVDA": "AI/Chip",
    "GOOGL": "Software/Cloud"
  }
}
```

## 🎯 Success Checklist

✅ Workflow runs daily at 4am Bangkok time  
✅ Manual transcripts work for disabled videos  
✅ Dashboard updates automatically via Vercel  
✅ GitHub syncs with Claude API extraction  
✅ Weekly keepalive prevents workflow disabling  

---

**Questions?** Check the workflow logs or run pipeline manually to diagnose.
