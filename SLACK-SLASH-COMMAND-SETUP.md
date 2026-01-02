# Slack Slash Command Setup

Enable users to log steps directly from Slack using `/logsteps`!

---

## How It Works

Users can log steps from anywhere in Slack:

```
/logsteps 5000
/logsteps 5000 Running
/logsteps 3000 Bonus: Hydration
```

The command will:
1. ✅ Add steps to the database
2. ✅ Update user's total
3. ✅ Post notification to the channel (just like the web app)
4. ✅ Send private confirmation to the user

---

## Setup Instructions

### Step 1: Create Slash Command in Slack

1. Go to https://api.slack.com/apps
2. Click your **"Recess Team Trek"** app
3. Click **"Slash Commands"** in the sidebar
4. Click **"Create New Command"**

### Step 2: Configure the Command

Fill in these details:

| Field | Value |
|-------|-------|
| **Command** | `/logsteps` |
| **Request URL** | `https://teamtrek-1024587728322.us-central1.run.app/api/slack/logsteps` |
| **Short Description** | Log your daily steps |
| **Usage Hint** | `[number of steps] [optional: activity type]` |

**Example:**
- Command: `/logsteps`
- Request URL: `https://teamtrek-1024587728322.us-central1.run.app/api/slack/logsteps`
- Short Description: `Log your daily steps`
- Usage Hint: `5000 Running`

### Step 3: Save and Reinstall

1. Click **"Save"**
2. Go to **"Install App"** in the sidebar
3. Click **"Reinstall to Workspace"**
4. Authorize the app

---

## Usage Examples

### Basic Usage
```
/logsteps 5000
```
Response (only you see):
```
✅ Logged 5,000 steps (Walking)!
📊 Your total: 15,000 steps
```

### With Activity Type
```
/logsteps 3000 Running
```

### Bonus Activity
```
/logsteps 500 Bonus: Hydration
```

---

## What Happens When You Use It?

### 1. Private Response (Only You See)
```
✅ Logged 5,000 steps (Walking)!
📊 Your total: 15,000 steps
```

### 2. Channel Notification (Everyone Sees)
Just like logging from the web app:
```
👟 Deuce (The Mood Lifters) just logged 5,000 steps!
Activity: Walking | Monthly Total: 15,000
```

---

## Error Messages

### Not Registered
```
❌ Sorry, I couldn't find your account! Please make sure you're registered in the TeamTrek app first.

Your Slack ID: U09UQA689HT
```

**Solution:** The user needs to be added to the database with their Slack User ID.

### Invalid Input
```
❌ Invalid steps! Usage: `/logsteps 5000` or `/logsteps 5000 Running`
```

**Solution:** Enter a valid number.

### Too Many Steps
```
🤔 That seems like a lot of steps! Please enter a reasonable number (max 50,000).
```

**Solution:** Enter a number under 50,000.

---

## How User Matching Works

The command uses your **Slack User ID** to find your account in the database. This is why everyone needed their Slack User IDs added to the system.

When you type `/logsteps`, Slack sends your User ID (e.g., `U09UQA689HT`) to our server, and we match it to your account.

---

## Testing

After setting up the command, test it:

1. Go to any channel (or DM the bot)
2. Type: `/logsteps 100`
3. You should see:
   - Private message: "✅ Logged 100 steps!"
   - Channel notification: "👟 [Your Name] just logged 100 steps!"

---

## Benefits

✅ **Faster** - Log steps without opening the web app
✅ **Mobile-friendly** - Works from Slack mobile app
✅ **Notifications** - Same channel notifications as web app
✅ **Flexible** - Supports all activity types
✅ **Private feedback** - Only you see the confirmation

---

## Additional Commands You Could Add

### `/mystats` - View Your Stats
Shows your current totals and qualifications

### `/teamstats` - View Team Stats
Shows team leaderboard

### `/leaderboard` - Global Leaderboard
Shows top performers

Let me know if you want me to add any of these!

---

## Current Endpoint

**URL:** `https://teamtrek-1024587728322.us-central1.run.app/api/slack/logsteps`

**Method:** POST

**Required Slack Scopes:**
- ✅ `commands` (automatically added when you create a slash command)
- ✅ `chat:write` (already have this)
- ✅ `chat:write.public` (already have this)

---

## Troubleshooting

### Command not appearing
- Make sure you reinstalled the app after creating the command
- Try typing `/log` and see if autocomplete shows `/logsteps`

### "dispatch_failed" error
- Check that the Request URL is correct
- Make sure the service is running: https://teamtrek-1024587728322.us-central1.run.app

### Steps not saving
- Check Cloud Run logs: `gcloud run services logs read teamtrek --region us-central1`
- Verify user has correct Slack User ID in database
