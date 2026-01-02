# How to Add Slack User IDs for @ Mentions

To make @ mentions work in the daily digest, you need to add Slack User IDs to the database.

## Quick Method: Copy Member ID in Slack

1. **In Slack Desktop App:**
   - Right-click on a user's name or avatar
   - Select "Copy Member ID"
   - You'll get an ID like `U09UQA689HT`

2. **Repeat for each team member**

3. **Update the database** using the API or directly in `server.ts`

---

## Method 1: Update via Database (Easiest)

Update `server.ts` with the User IDs:

```typescript
const INITIAL_USERS = [
  // Team 1
  { id: 1, username: "Pam", slack_username: "Pam", slack_user_id: "U12345ABCD", team_id: 1, ... },
  { id: 2, username: "Victoria", slack_username: "Victoria Newton", slack_user_id: "U67890EFGH", team_id: 1, ... },
  // ... etc
];
```

Then redeploy:
```bash
gcloud builds submit --tag gcr.io/gen-lang-client-0271258032/teamtrek:latest --project=gen-lang-client-0271258032
gcloud run services update teamtrek --image gcr.io/gen-lang-client-0271258032/teamtrek:latest --region us-central1 --project=gen-lang-client-0271258032
```

---

## Method 2: Update via API Endpoint

You can add a simple endpoint to update user Slack IDs:

```bash
curl -X POST https://teamtrek-1024587728322.us-central1.run.app/api/users/1/slack-id \
  -H "Content-Type: application/json" \
  -d '{"slack_user_id": "U09UQA689HT"}'
```

---

## Method 3: Get All User IDs Programmatically

**Note:** This requires adding `users:read` scope to your Slack bot.

1. Add `users:read` scope in https://api.slack.com/apps → OAuth & Permissions
2. Reinstall app to workspace
3. Use this API call:

```bash
curl -X POST "https://slack.com/api/users.list" \
  -H "Authorization: Bearer xoxb-YOUR-BOT-TOKEN" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool > slack_users.json
```

4. Find your team members in the JSON and copy their IDs

---

## Current User Mapping

| ID | Username | Slack Username | Slack User ID |
|----|----------|----------------|---------------|
| 1  | Pam      | Pam            | ❌ Not set    |
| 2  | Victoria | Victoria Newton| ❌ Not set    |
| 3  | Jack     | jackshannon    | ❌ Not set    |
| 4  | Francisco| Francisco Cazes| ❌ Not set    |
| 5  | Claire   | Claire         | ❌ Not set    |
| 6  | Deuce    | deuce          | ❌ Not set    |
| 7  | Courtney | Courtney Cook  | ❌ Not set    |
| 8  | Arb      | arb            | ❌ Not set    |

---

## Why User IDs?

Slack requires User IDs (not usernames) for @ mentions to work:

- ✅ `<@U09UQA689HT>` - **Works!** Notifies the user
- ❌ `<@deuce>` - Doesn't work, just displays as text
- ❌ `@deuce` - Just displays as text

---

## Testing

After adding User IDs, test with:

```bash
curl -X POST https://teamtrek-1024587728322.us-central1.run.app/api/test-daily-digest
```

Look for the "📣 Your Team Needs You!" section in Slack. The names should be clickable blue links and the users should get notifications.
