# How to Check Your Google Cloud Run & Database Setup

There are two main ways to check your deployment: via the **Google Cloud Console (Web UI)** or **gcloud CLI**.

---

## Option 1: Check via Google Cloud Console (Web UI)

This is the easiest way if you don't have gcloud CLI installed yet.

### Check Cloud Run Service

1. **Go to Cloud Run Console**
   - Open: https://console.cloud.google.com/run
   - Select your project from the dropdown at the top

2. **Look for your service**
   - You should see a service named "teamtrek" or similar
   - Status should show a green checkmark (✓) if deployed
   - Click on the service name to see details

3. **Service Details Page shows**:
   - **URL**: Your live app URL (click to open)
   - **Status**: Running, failed, or not deployed
   - **Revisions**: Deployment history
   - **Logs**: Recent application logs
   - **Metrics**: Request count, latency, errors

### Check Cloud SQL Database

1. **Go to Cloud SQL Console**
   - Open: https://console.cloud.google.com/sql/instances
   - Select your project

2. **Look for your database instance**
   - Instance name: "teamtrek-db" or similar
   - Status should show green "RUNNABLE" if active
   - Click on the instance name for details

3. **Instance Details Page shows**:
   - **Connection name**: Format `project:region:instance-name`
   - **Database version**: PostgreSQL 15 (or your version)
   - **Status**: RUNNABLE, STOPPED, or CREATING
   - **Connections**: Shows if Cloud Run is connected
   - **Databases**: Click "Databases" tab to see "teamtrek" database

4. **Check if Cloud Run is connected to SQL**:
   - In Cloud Run service details, scroll to **Connections** section
   - Should show: Cloud SQL instance connection name
   - Example: `project-name:us-central1:teamtrek-db`

### Check Environment Variables & Secrets

1. **In Cloud Run Service Details**:
   - Scroll to **Variables & Secrets** section
   - Should see:
     - `DATABASE_URL` → Secret reference
     - `GEMINI_API_KEY` → Secret reference (optional)
     - `SLACK_BOT_TOKEN` → Secret reference (optional)
     - `NODE_ENV` → "production"
     - `PORT` → "8080"

2. **Check Secret Manager**:
   - Open: https://console.cloud.google.com/security/secret-manager
   - Should see secrets:
     - `DATABASE_URL`
     - `GEMINI_API_KEY` (optional)
     - `SLACK_BOT_TOKEN` (optional)
     - `SLACK_CHANNEL_ID` (optional)

### Check Logs

1. **Cloud Run Logs**:
   - In Cloud Run service details, click **LOGS** tab
   - Look for:
     - ✅ "Server running on port 8080"
     - ✅ "Database Seeding Complete"
     - ❌ Any error messages

2. **Filter logs**: Use the query builder
   ```
   severity="ERROR"
   ```

---

## Option 2: Check via gcloud CLI

If you have gcloud CLI installed (or want to install it):

### Install gcloud CLI

**macOS**:
```bash
# Using Homebrew
brew install --cask google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

**After installation**:
```bash
# Initialize and login
gcloud init
gcloud auth login
```

### CLI Commands to Check Deployment

```bash
# 1. Check current project
gcloud config get-value project

# 2. List all Cloud Run services
gcloud run services list --platform managed

# 3. Get details of your service
gcloud run services describe teamtrek --region us-central1 --format=yaml

# 4. Get the service URL
gcloud run services describe teamtrek --region us-central1 --format="value(status.url)"

# 5. Check Cloud SQL instances
gcloud sql instances list

# 6. Get database details
gcloud sql instances describe teamtrek-db

# 7. Check database connection name
gcloud sql instances describe teamtrek-db --format="value(connectionName)"

# 8. List databases in the instance
gcloud sql databases list --instance=teamtrek-db

# 9. Check secrets
gcloud secrets list

# 10. View recent Cloud Run logs
gcloud run services logs read teamtrek --region us-central1 --limit 50

# 11. Check if Cloud Run can connect to SQL
gcloud run services describe teamtrek --region us-central1 --format="value(spec.template.spec.containers[0].env)"
```

---

## Quick Checklist

Use this to verify your deployment is complete:

- [ ] **Cloud Run service exists** (check console or `gcloud run services list`)
- [ ] **Service is RUNNING** (green checkmark in console)
- [ ] **Service URL is accessible** (click and test in browser)
- [ ] **Cloud SQL instance exists** (check console or `gcloud sql instances list`)
- [ ] **SQL instance is RUNNABLE** (active and ready)
- [ ] **Database "teamtrek" exists** in the SQL instance
- [ ] **Cloud Run is connected to SQL** (connection name shown in Cloud Run details)
- [ ] **Environment variables are set** (DATABASE_URL, NODE_ENV, PORT)
- [ ] **Secrets are created** (DATABASE_URL at minimum)
- [ ] **Logs show no errors** (check "Server running" and "Database Seeding Complete")
- [ ] **App loads in browser** (visit the Cloud Run URL)

---

## Common Issues & Solutions

### Issue: "Service not found"
**Solution**: You haven't deployed yet. Run the deployment commands from DEPLOYMENT.md

### Issue: SQL instance shows "STOPPED"
**Solution**:
```bash
gcloud sql instances patch teamtrek-db --activation-policy=ALWAYS
```

### Issue: "Database not connected"
**Solution**: Check Cloud Run has `--add-cloudsql-instances` flag:
```bash
gcloud run services describe teamtrek --region us-central1 --format="value(metadata.annotations)"
```

### Issue: App loads but shows "Database not connected" error
**Solution**:
1. Verify DATABASE_URL secret is correct
2. Check Cloud SQL connection name matches in DATABASE_URL
3. Ensure Cloud Run service account has Cloud SQL Client role

### Issue: Can't see logs
**Solution**: Logs may take a few minutes to appear. Refresh the Logs tab.

---

## Testing Your Database Connection

### Option A: Via Cloud Shell (no installation needed)

1. Open Cloud Shell: https://console.cloud.google.com/cloudshell
2. Run:
```bash
gcloud sql connect teamtrek-db --user=postgres
```
3. Enter your database password
4. Once connected:
```sql
\c teamtrek
\dt
SELECT * FROM teams;
SELECT * FROM users;
SELECT COUNT(*) FROM activity_logs;
\q
```

### Option B: Via your deployed app

Visit your Cloud Run URL and:
1. Try to login with a user (e.g., "Deuce" from team "The Mood Lifters")
2. If login works → Database is connected ✅
3. If you see "Database not connected" → Check DATABASE_URL secret

---

## Next Steps After Verification

Once everything is confirmed:
- ✅ Save your Cloud Run URL
- ✅ Share with your team
- ✅ Set up monitoring alerts
- ✅ Consider custom domain setup
- ✅ Review cost monitoring dashboard

---

## Quick Links

- **Cloud Run Console**: https://console.cloud.google.com/run
- **Cloud SQL Console**: https://console.cloud.google.com/sql
- **Secret Manager**: https://console.cloud.google.com/security/secret-manager
- **Logs Explorer**: https://console.cloud.google.com/logs
- **Billing**: https://console.cloud.google.com/billing
