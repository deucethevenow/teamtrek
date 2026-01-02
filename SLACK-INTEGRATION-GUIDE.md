# TeamTrek Slack Integration Guide

This guide will help you set up Slack notifications for TeamTrek.

---

## Features

Your TeamTrek app already has Slack integration code that sends:

1. **Real-time Activity Notifications** 👟
   - Sent when someone logs steps via the API
   - Shows username, team, steps logged, and total

2. **Daily Digest** 🌞
   - Automatically sent at 5:00 PM Mountain Time
   - Includes:
     - Global progress percentage
     - Total steps walked
     - Leading team
     - Weekly raffle qualifiers
     - Grand prize qualifiers

---

## Setup Steps

### Step 1: Create a Slack Incoming Webhook

1. **Go to Slack App Directory**
   - Visit: https://api.slack.com/apps
   - Click **"Create New App"** → **"From scratch"**

2. **Configure Your App**
   - **App Name**: `TeamTrek`
   - **Workspace**: Select your workspace
   - Click **"Create App"**

3. **Enable Incoming Webhooks**
   - In the left sidebar, click **"Incoming Webhooks"**
   - Toggle **"Activate Incoming Webhooks"** to **ON**
   - Click **"Add New Webhook to Workspace"**

4. **Select Channel**
   - Choose the channel where you want notifications (e.g., `#teamtrek` or `#general`)
   - Click **"Allow"**

5. **Copy Webhook URL**
   - You'll see a webhook URL like:
     ```
     https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
     ```
   - **Copy this URL** - you'll need it next

---

## Step 2: Add Webhook to Google Cloud Secret Manager

Run these commands to add your Slack webhook URL as a secret:

```bash
# Replace YOUR_WEBHOOK_URL with the URL you copied
echo "YOUR_WEBHOOK_URL" | gcloud secrets create SLACK_WEBHOOK_URL \
  --data-file=- \
  --project=gen-lang-client-0271258032

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding SLACK_WEBHOOK_URL \
  --member="serviceAccount:1024587728322-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=gen-lang-client-0271258032
```

**Example:**
```bash
echo "https://hooks.slack.com/services/T1234567890/B1234567890/1234567890abcdefghijk" | gcloud secrets create SLACK_WEBHOOK_URL \
  --data-file=- \
  --project=gen-lang-client-0271258032
```

---

## Step 3: Update Cloud Run Service

Update your Cloud Run service to use the new secret:

```bash
gcloud run services update teamtrek \
  --region us-central1 \
  --update-secrets "SLACK_WEBHOOK_URL=SLACK_WEBHOOK_URL:latest" \
  --project=gen-lang-client-0271258032
```

---

## Step 4: Test the Integration

### Test Daily Digest Manually

You can trigger the daily digest by calling the cron endpoint (if you expose it) or by temporarily modifying the cron schedule in server.ts.

### Test Activity Notifications

Log some steps through the app or API:

```bash
curl -X POST https://teamtrek-1024587728322.us-central1.run.app/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 6,
    "step_count": 5000,
    "activity_type": "Walking",
    "date_logged": "2025-11-24"
  }'
```

You should see a message in your Slack channel!

---

## Notification Examples

### Activity Notification
```
👟 Deuce (The Mood Lifters) just logged 5,000 steps!
Activity: Walking | Monthly Total: 152,267
```

### Daily Digest
```
🌞 Recess Daily Vibe Check
━━━━━━━━━━━━━━━━━━━━━━
Global Progress: 45%
[▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░]
We have walked 450,000 steps together!

🏆 Top Squad: The Cloud Walkers
👑 Grand Prize Legends: 3 unlocked
🎟️ Weekly Raffle: 6 people have qualified for this week's draw!

Log your steps to keep the momentum going! Open App
```

---

## Customizing Notifications

### Change Daily Digest Time

Edit `server.ts` (line ~50):

```typescript
// Current: 5:00 PM MT
cron.schedule('0 17 * * *', () => {

// Change to 9:00 AM MT
cron.schedule('0 9 * * *', () => {
```

### Change Messages

Edit `services/slackService.ts`:
- `sendSlackLog()` - Activity notifications (line 28)
- `sendSlackDailyUpdate()` - Daily digest (line 55)

After changes, rebuild and redeploy:
```bash
gcloud builds submit --tag gcr.io/gen-lang-client-0271258032/teamtrek:latest --project=gen-lang-client-0271258032
gcloud run services update teamtrek --image gcr.io/gen-lang-client-0271258032/teamtrek:latest --region us-central1 --project=gen-lang-client-0271258032
```

---

## Troubleshooting

### No notifications appearing

1. **Check logs**:
   ```bash
   gcloud run services logs read teamtrek --region us-central1 --project=gen-lang-client-0271258032 --limit 50 | grep -i slack
   ```

2. **Verify secret is set**:
   ```bash
   gcloud secrets list --project=gen-lang-client-0271258032
   ```

3. **Check webhook URL is valid**:
   ```bash
   # Test webhook directly
   curl -X POST YOUR_WEBHOOK_URL \
     -H 'Content-Type: application/json' \
     -d '{"text": "Test message from TeamTrek!"}'
   ```

### "No SLACK_WEBHOOK_URL configured" in logs

The secret wasn't mounted properly. Re-run Step 3 to update the service.

### Webhook returns 404

The webhook URL expired or was revoked. Create a new one in Slack and update the secret:

```bash
echo "NEW_WEBHOOK_URL" | gcloud secrets versions add SLACK_WEBHOOK_URL --data-file=- --project=gen-lang-client-0271258032
gcloud run services update teamtrek --region us-central1 --project=gen-lang-client-0271258032 --update-env-vars DEPLOYMENT_VERSION=3
```

---

## Advanced: Custom Slack App

If you want more control (custom bot name, avatar, etc.):

1. Create a Slack App at https://api.slack.com/apps
2. Add "Incoming Webhooks" feature
3. Customize bot name and icon
4. Use the webhook URL in Secret Manager

---

## Current Cron Schedule

**Daily Digest**: Every day at 5:00 PM Mountain Time
- Timezone: `America/Denver`
- Cron: `0 17 * * *`

---

## Environment Variables

| Variable | Description | Status |
|----------|-------------|--------|
| `SLACK_WEBHOOK_URL` | Incoming webhook URL from Slack | ⚠️ **Required for notifications** |
| `DATABASE_URL` | PostgreSQL connection (already set) | ✅ Set |
| `GEMINI_API_KEY` | Google Gemini API key (optional) | ✅ Set |

---

## Quick Reference Commands

```bash
# View all secrets
gcloud secrets list --project=gen-lang-client-0271258032

# Update webhook URL
echo "NEW_URL" | gcloud secrets versions add SLACK_WEBHOOK_URL --data-file=- --project=gen-lang-client-0271258032

# Restart service to pick up changes
gcloud run services update teamtrek --region us-central1 --project=gen-lang-client-0271258032 --update-env-vars DEPLOYMENT_VERSION=$(date +%s)

# View recent Slack-related logs
gcloud run services logs read teamtrek --region us-central1 --limit 100 | grep -i "slack"
```

---

**Ready to integrate?** Follow Steps 1-3 above, then test with Step 4!
