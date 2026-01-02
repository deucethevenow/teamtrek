# TeamTrek Daily Slack Digest

Your TeamTrek app automatically sends a daily recap to Slack with team progress, stats, and motivation!

---

## 📅 Schedule

**Automatic Daily Digest**
- **Time**: 5:00 PM Mountain Time (17:00 MT)
- **Frequency**: Every day
- **Timezone**: America/Denver
- **Cron Expression**: `0 17 * * *`

The digest is sent automatically - no manual action needed!

---

## 📊 What's Included in the Daily Digest

The daily recap includes:

### 1. **Global Progress** 🌍
- Progress percentage toward the global goal
- Visual progress bar
- Total steps walked by the entire team

### 2. **Team Leaderboard** 🏆
- Which team is currently in the lead (by average steps per member)

### 3. **Weekly Raffle Status** 🎟️
- How many people have qualified for the weekly raffle
- Qualification: 35,000 steps in the last 7 days

### 4. **Grand Prize Qualifiers** 👑
- How many people have unlocked the grand prize
- Qualification: 100,000 total steps

### 5. **Call to Action** 🚀
- Link to open the app and log more steps

---

## 📱 Example Daily Digest Message

Here's what the daily digest looks like in Slack:

```
🌞 Recess Daily Vibe Check
━━━━━━━━━━━━━━━━━━━━━━

Global Progress: 47%
[▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░]
We have walked 1,105,504 steps together!

🏆 Top Squad: The Cloud Walkers
👑 Grand Prize Legends: 8 unlocked

🎟️ Weekly Raffle: 6 people have qualified for this week's draw!

Log your steps to keep the momentum going! Open App
```

---

## 🧪 Testing the Daily Digest

You can manually trigger the digest anytime for testing:

### Via API
```bash
curl -X POST https://teamtrek-1024587728322.us-central1.run.app/api/test-daily-digest
```

### Expected Response
```json
{"success": true, "message": "Daily digest sent to Slack!"}
```

The digest will be posted immediately to your Slack channel!

---

## ⚙️ Configuration

### Current Settings

| Setting | Value |
|---------|-------|
| **Time** | 5:00 PM MT (17:00) |
| **Timezone** | America/Denver |
| **Channel** | C09UM5HN0M8 |
| **Bot Name** | Recess Team Trek |
| **Frequency** | Daily |

### Customize the Time

To change when the digest is sent, edit `server.ts` (line 71):

**Current (5:00 PM MT):**
```typescript
cron.schedule('0 17 * * *', () => {
```

**Change to 9:00 AM MT:**
```typescript
cron.schedule('0 9 * * *', () => {
```

**Change to 12:00 PM (Noon) MT:**
```typescript
cron.schedule('0 12 * * *', () => {
```

**Cron Format:** `minute hour day month weekday`
- `0 17 * * *` = 5:00 PM every day
- `0 9 * * 1-5` = 9:00 AM Monday-Friday only
- `0 12 * * 1,3,5` = Noon on Monday, Wednesday, Friday

After changing, rebuild and redeploy:
```bash
gcloud builds submit --tag gcr.io/gen-lang-client-0271258032/teamtrek:latest --project=gen-lang-client-0271258032
gcloud run services update teamtrek --image gcr.io/gen-lang-client-0271258032/teamtrek:latest --region us-central1 --project=gen-lang-client-0271258032
```

### Customize the Message

To change the content, edit `services/slackService.ts` function `sendSlackDailyUpdate()`:

**Add your own sections:**
```typescript
const blocks = [
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "🌞 Your Custom Title Here",
      emoji: true
    }
  },
  // ... add more blocks
];
```

---

## 📈 Progress Thresholds

The digest uses these thresholds from `constants.ts`:

| Metric | Threshold |
|--------|-----------|
| **Global Goal** | 1,000,000 steps |
| **Weekly Raffle** | 35,000 steps (last 7 days) |
| **Grand Prize** | 100,000 total steps |
| **Daily Goal** | 10,000 steps |

---

## 🔔 Notification Types

Your app sends **3 types** of Slack notifications:

### 1. Real-time Activity (Immediate)
Posted when someone logs steps:
```
👟 Deuce (The Mood Lifters) just logged 5,000 steps!
Activity: Walking | Monthly Total: 152,267
```

### 2. Bonus Activity (Immediate)
Posted when someone logs a bonus activity:
```
🌟 Claire (The Mood Lifters) just logged 500 steps!
Activity: Bonus: Hydration | Monthly Total: 126,163
```

### 3. Daily Digest (5pm MT)
Comprehensive daily recap (shown above)

---

## 🎯 What Gets Calculated

The daily digest performs these calculations:

1. **Global Steps**: Sum of ALL activity logs
2. **Global Progress**: `(totalSteps / GLOBAL_GOAL) * 100`
3. **Progress Bar**: Visual representation using `▓` and `░`
4. **Leading Team**: Team with highest average steps per member
5. **Weekly Qualifiers**: Users with 35k+ steps in last 7 days
6. **Grand Prize Qualifiers**: Users with 100k+ total steps

---

## 🐛 Troubleshooting

### Digest not appearing at 5pm

1. **Check server logs**:
   ```bash
   gcloud run services logs read teamtrek --region us-central1 --project=gen-lang-client-0271258032 --limit 50 | grep "Daily Slack Digest"
   ```

2. **Verify cron is running**:
   Look for: `"Running Daily Slack Digest Cron (17:00 MT)..."`

3. **Check timezone**:
   The server uses `America/Denver`. If you're in a different timezone, 5pm MT might be a different local time for you.

### Digest sent but shows wrong data

1. **Test manually**:
   ```bash
   curl -X POST https://teamtrek-1024587728322.us-central1.run.app/api/test-daily-digest
   ```

2. **Check database has data**:
   ```bash
   curl https://teamtrek-1024587728322.us-central1.run.app/api/logs
   ```

### Want to skip weekends?

Change the cron to weekdays only:
```typescript
// Monday-Friday at 5pm MT
cron.schedule('0 17 * * 1-5', () => {
```

---

## 🎨 Customization Ideas

### Add More Metrics
- Top individual performer
- Team with most improvement
- Longest streak holder
- Most bonus activities

### Add Images
Include charts or graphs using Slack's image blocks

### Add Buttons
Use Slack's interactive components:
```typescript
{
  type: "actions",
  elements: [
    {
      type: "button",
      text: {
        type: "plain_text",
        text: "View Leaderboard"
      },
      url: "https://teamtrek-1024587728322.us-central1.run.app"
    }
  ]
}
```

---

## 📝 Logs

View digest execution logs:

```bash
# See last 50 lines mentioning Slack
gcloud run services logs read teamtrek --region us-central1 --project=gen-lang-client-0271258032 --limit 50 | grep -i slack

# See today's cron executions
gcloud run services logs read teamtrek --region us-central1 --project=gen-lang-client-0271258032 --limit 100 | grep "Cron"
```

---

## ✅ Summary

- ✅ **Automated**: Runs daily at 5pm MT without manual trigger
- ✅ **Comprehensive**: Shows global progress, teams, qualifiers
- ✅ **Customizable**: Easy to change time, message, metrics
- ✅ **Testable**: Manual trigger endpoint for testing
- ✅ **Bot-powered**: Posts as "Recess Team Trek" bot

Your daily digest is **live and running!** The next automatic post will be today at **5:00 PM Mountain Time**.

---

## Quick Reference

**Test now**: `curl -X POST https://teamtrek-1024587728322.us-central1.run.app/api/test-daily-digest`

**View logs**: `gcloud run services logs read teamtrek --region us-central1 --project=gen-lang-client-0271258032`

**Current time**: 5:00 PM MT daily

**Channel**: C09UM5HN0M8

**Bot**: Recess Team Trek
