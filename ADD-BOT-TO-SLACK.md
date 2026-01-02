# How to Add the Bot to Your Slack Channel

Your bot can't post to a channel until it's been invited/added to that channel!

---

## Quick Fix: Add Bot to Channel

### Option 1: Via Slack App (Easiest)

1. **Open your Slack workspace**
2. **Go to the channel** where you want the bot to post (the one with ID `C09UM5HN0M8`)
3. **Click the channel name** at the top to open channel details
4. **Click the "Integrations" tab**
5. **Click "Add apps"**
6. **Search for "Recess Team Trek"** (your bot name)
7. **Click "Add"**

### Option 2: Via @ Mention

1. **Open the channel** where you want the bot
2. **Type**: `@Recess Team Trek`
3. Slack will prompt you to **invite the bot**
4. **Click "Invite to Channel"**

### Option 3: Via /invite Command

1. **In the channel**, type:
   ```
   /invite @Recess Team Trek
   ```
2. Press **Enter**

---

## Verify It Worked

After adding the bot, test it immediately:

```bash
curl -X POST https://teamtrek-1024587728322.us-central1.run.app/api/test-daily-digest
```

You should now see the daily digest appear in your channel!

---

## Check Bot Permissions

Make sure your bot has these OAuth scopes in the Slack App settings:

1. Go to: https://api.slack.com/apps
2. Click your **"Recess Team Trek"** app
3. Click **"OAuth & Permissions"** in the sidebar
4. Under **"Bot Token Scopes"**, verify you have:
   - ✅ `chat:write` - Post messages
   - ✅ `chat:write.public` - Post to channels the bot isn't in

If missing, add them and **reinstall the app to your workspace**.

---

## Still Not Working?

Try posting to a public channel first to test:

1. **Change the channel temporarily** to test in a public channel like `#general`
2. Update the secret:
   ```bash
   echo "general" | gcloud secrets versions add SLACK_CHANNEL_ID --data-file=- --project=gen-lang-client-0271258032
   ```
3. Restart the service:
   ```bash
   gcloud run services update teamtrek --region us-central1 --project=gen-lang-client-0271258032 --update-env-vars DEPLOYMENT_VERSION=$(date +%s)
   ```
4. Test again:
   ```bash
   curl -X POST https://teamtrek-1024587728322.us-central1.run.app/api/test-daily-digest
   ```

---

## Common Issues

### Bot not in workspace
- Go to https://api.slack.com/apps
- Click your app → **"Install App"**
- Click **"Reinstall to Workspace"**

### Private channel
- Private channels require the bot to be explicitly invited
- The bot owner must invite it

### Wrong channel ID
- Get the correct channel ID:
  1. Right-click the channel in Slack
  2. Click **"Copy link"**
  3. The ID is at the end: `.../archives/C09UM5HN0M8`
