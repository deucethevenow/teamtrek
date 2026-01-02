# ✅ PostgreSQL Database Setup Complete!

Your Google Cloud SQL PostgreSQL database is now ready for TeamTrek.

---

## 📊 Database Details

### Cloud SQL Instance
- **Instance Name**: `teamtrek-db`
- **Database Version**: PostgreSQL 15
- **Region**: us-central1
- **Status**: ✅ RUNNABLE
- **Public IP**: 34.61.6.96
- **Connection Name**: `gen-lang-client-0271258032:us-central1:teamtrek-db`

### Database
- **Database Name**: `teamtrek`
- **Charset**: UTF8
- **Collation**: en_US.UTF8

### Authentication
- **User**: postgres
- **Password**: `TeamTrek2025!SecureDB#Pass` ⚠️ **Keep this secure!**

---

## 🔐 Secrets Created in Secret Manager

| Secret Name | Description | Status |
|-------------|-------------|--------|
| `DATABASE_URL` | Full PostgreSQL connection string for Cloud Run | ✅ Created |
| `GEMINI_API_KEY` | Google Gemini API key (placeholder - update with real key) | ✅ Created |

---

## 🔗 Database Connection String

Your app will use this connection string (stored in DATABASE_URL secret):

```
postgresql://postgres:TeamTrek2025!SecureDB#Pass@/teamtrek?host=/cloudsql/gen-lang-client-0271258032:us-central1:teamtrek-db
```

**Note**: When Cloud Run connects, it uses the Unix socket path `/cloudsql/...` which is automatically available inside Cloud Run containers.

---

## 🚀 Next Steps

Your database is ready! Now you can:

### 1. Build and Deploy to Cloud Run

```bash
# Build the Docker image using Cloud Build
gcloud builds submit --tag gcr.io/gen-lang-client-0271258032/teamtrek:latest --project=gen-lang-client-0271258032

# Deploy to Cloud Run
gcloud run deploy teamtrek \
  --image gcr.io/gen-lang-client-0271258032/teamtrek:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --add-cloudsql-instances gen-lang-client-0271258032:us-central1:teamtrek-db \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --project=gen-lang-client-0271258032
```

### 2. (Optional) Update Gemini API Key

If you have a real Gemini API key:

```bash
# Update the secret with your real API key
echo "YOUR_REAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=- --project=gen-lang-client-0271258032
```

### 3. (Optional) Add Slack Integration

If you want Slack notifications:

```bash
# Create Slack secrets
echo "YOUR_SLACK_BOT_TOKEN" | gcloud secrets create SLACK_BOT_TOKEN --data-file=- --project=gen-lang-client-0271258032
echo "YOUR_SLACK_CHANNEL_ID" | gcloud secrets create SLACK_CHANNEL_ID --data-file=- --project=gen-lang-client-0271258032

# Then redeploy with additional secrets
gcloud run deploy teamtrek \
  --image gcr.io/gen-lang-client-0271258032/teamtrek:latest \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,SLACK_BOT_TOKEN=SLACK_BOT_TOKEN:latest,SLACK_CHANNEL_ID=SLACK_CHANNEL_ID:latest" \
  --region us-central1 \
  --project=gen-lang-client-0271258032
```

---

## 🧪 Testing Database Connection

### Option 1: Using Cloud SQL Proxy (Recommended)

```bash
# Install Cloud SQL Proxy
brew install cloud-sql-proxy

# Connect to your instance
cloud-sql-proxy gen-lang-client-0271258032:us-central1:teamtrek-db

# In another terminal, connect with psql
psql "host=localhost port=5432 sslmode=disable user=postgres dbname=teamtrek"
# Password: TeamTrek2025!SecureDB#Pass
```

### Option 2: Using gcloud

```bash
gcloud sql connect teamtrek-db --user=postgres --project=gen-lang-client-0271258032
# Enter password when prompted
# Then: \c teamtrek
```

### Verify Tables After First Deploy

Once your app is deployed, the tables will be auto-created. You can verify:

```sql
\c teamtrek
\dt
-- Should show: teams, users, activity_logs

SELECT * FROM teams;
SELECT * FROM users;
```

---

## 📈 Monitoring & Management

### View Instance in Console
https://console.cloud.google.com/sql/instances/teamtrek-db?project=gen-lang-client-0271258032

### Check Secrets
https://console.cloud.google.com/security/secret-manager?project=gen-lang-client-0271258032

### View Logs
```bash
gcloud sql operations list --instance=teamtrek-db --project=gen-lang-client-0271258032 --limit=10
```

### Stop Instance (to save costs when not in use)
```bash
gcloud sql instances patch teamtrek-db --activation-policy=NEVER --project=gen-lang-client-0271258032
```

### Start Instance Again
```bash
gcloud sql instances patch teamtrek-db --activation-policy=ALWAYS --project=gen-lang-client-0271258032
```

---

## 💰 Cost Information

**Current Configuration**: db-f1-micro in us-central1
- **Estimated Cost**: ~$7-10/month (running continuously)
- **Cost when stopped**: ~$0-1/month (storage only)

**Tips to Reduce Costs**:
1. Stop the instance when not actively developing
2. Set automatic backups to retain only 7 days
3. Consider upgrading to db-n1-standard-1 (~$25/month) for production use

---

## 🔒 Security Best Practices

✅ **Already Implemented**:
- Password stored in Secret Manager (not in code)
- SSL connections enabled by default
- Unix socket connection from Cloud Run (more secure than TCP)

**Recommended**:
- [ ] Rotate database password every 90 days
- [ ] Enable automatic backups (see console)
- [ ] Set up Cloud Monitoring alerts
- [ ] Review IAM permissions regularly

---

## 🆘 Troubleshooting

### Can't connect from Cloud Run
- Verify `--add-cloudsql-instances` flag is set correctly
- Check DATABASE_URL secret matches the connection name
- Ensure Cloud Run service account has "Cloud SQL Client" role

### Database is slow
- db-f1-micro is good for dev, but consider upgrading for production
- Check active connections: `SELECT count(*) FROM pg_stat_activity;`

### Need to reset password
```bash
gcloud sql users set-password postgres \
  --instance=teamtrek-db \
  --password="NEW_PASSWORD_HERE" \
  --project=gen-lang-client-0271258032

# Update secret
echo "postgresql://postgres:NEW_PASSWORD_HERE@/teamtrek?host=/cloudsql/gen-lang-client-0271258032:us-central1:teamtrek-db" | \
  gcloud secrets versions add DATABASE_URL --data-file=- --project=gen-lang-client-0271258032
```

---

## ✅ Setup Checklist

- [x] Cloud SQL instance created
- [x] PostgreSQL 15 installed
- [x] Database "teamtrek" created
- [x] Postgres user password set
- [x] DATABASE_URL secret created
- [x] GEMINI_API_KEY secret created
- [ ] Deploy app to Cloud Run
- [ ] Verify tables are created
- [ ] Test login functionality
- [ ] Set up monitoring

---

**Created**: November 23, 2025
**Project**: gen-lang-client-0271258032
**Region**: us-central1
