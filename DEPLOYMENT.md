# TeamTrek - Google Cloud Deployment Guide

This guide walks you through deploying TeamTrek to Google Cloud Run with Cloud SQL (PostgreSQL).

---

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
3. **Docker** installed locally (optional, for local testing)

---

## Step 1: Set Up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create teamtrek-prod --name="TeamTrek Production"

# Set the project as default
gcloud config set project teamtrek-prod

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

---

## Step 2: Create Cloud SQL PostgreSQL Database

```bash
# Create PostgreSQL instance (this takes ~5-10 minutes)
gcloud sql instances create teamtrek-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_STRONG_PASSWORD_HERE

# Create the database
gcloud sql databases create teamtrek --instance=teamtrek-db

# Get the instance connection name (save this!)
gcloud sql instances describe teamtrek-db --format="value(connectionName)"
# Example output: teamtrek-prod:us-central1:teamtrek-db
```

**For Production**: Use a stronger tier like `db-n1-standard-1` instead of `db-f1-micro`

---

## Step 3: Store Secrets in Google Secret Manager

```bash
# Create DATABASE_URL secret
# Format: postgresql://postgres:PASSWORD@/teamtrek?host=/cloudsql/CONNECTION_NAME
gcloud secrets create DATABASE_URL \
  --data-file=- <<EOF
postgresql://postgres:YOUR_STRONG_PASSWORD_HERE@/teamtrek?host=/cloudsql/teamtrek-prod:us-central1:teamtrek-db
EOF

# Create Gemini API Key secret (optional)
gcloud secrets create GEMINI_API_KEY \
  --data-file=- <<EOF
YOUR_GEMINI_API_KEY_HERE
EOF

# Create Slack Bot Token secret (optional)
gcloud secrets create SLACK_BOT_TOKEN \
  --data-file=- <<EOF
YOUR_SLACK_BOT_TOKEN_HERE
EOF

# Create Slack Channel ID secret (optional)
gcloud secrets create SLACK_CHANNEL_ID \
  --data-file=- <<EOF
YOUR_SLACK_CHANNEL_ID_HERE
EOF
```

---

## Step 4: Build and Deploy to Cloud Run

```bash
# Build the container image using Cloud Build
gcloud builds submit --tag gcr.io/teamtrek-prod/teamtrek:latest

# Deploy to Cloud Run with Cloud SQL connection
gcloud run deploy teamtrek \
  --image gcr.io/teamtrek-prod/teamtrek:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --add-cloudsql-instances teamtrek-prod:us-central1:teamtrek-db \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,SLACK_BOT_TOKEN=SLACK_BOT_TOKEN:latest,SLACK_CHANNEL_ID=SLACK_CHANNEL_ID:latest" \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0

# Get the service URL
gcloud run services describe teamtrek --region us-central1 --format="value(status.url)"
```

Your app is now live! 🎉

---

## Step 5: Initial Database Setup

The database tables will be created automatically when the server starts (see `initDB()` in server.ts).

To verify:

```bash
# Connect to Cloud SQL via Cloud SQL Proxy
gcloud sql connect teamtrek-db --user=postgres

# Inside psql prompt:
\c teamtrek
\dt
# Should show: teams, users, activity_logs

# Exit psql
\q
```

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string for Cloud SQL | Yes |
| `GEMINI_API_KEY` | Google Gemini API key for health tips | No |
| `SLACK_BOT_TOKEN` | Slack bot token for notifications | No |
| `SLACK_CHANNEL_ID` | Slack channel ID for daily updates | No |
| `NODE_ENV` | Set to `production` | Yes |
| `PORT` | Server port (Cloud Run uses 8080) | Yes |

---

## Updating Your Deployment

After making code changes:

```bash
# Rebuild and redeploy
gcloud builds submit --tag gcr.io/teamtrek-prod/teamtrek:latest
gcloud run deploy teamtrek --image gcr.io/teamtrek-prod/teamtrek:latest --region us-central1
```

---

## Cost Optimization Tips

1. **Cloud Run**: Free tier includes 2 million requests/month. With `--min-instances 0`, you only pay when the app is used.

2. **Cloud SQL**:
   - Use `db-f1-micro` for development (~$7/month)
   - Upgrade to `db-n1-standard-1` for production (~$25/month)
   - Consider stopping the instance when not in use for development

3. **Secret Manager**: First 6 secret versions are free, then $0.06/version/month

**Estimated Monthly Cost**: $7-30 depending on usage and database tier

---

## Monitoring & Logs

```bash
# View Cloud Run logs
gcloud run services logs read teamtrek --region us-central1 --limit 50

# View Cloud SQL logs
gcloud sql operations list --instance teamtrek-db

# Monitor metrics in Cloud Console
open https://console.cloud.google.com/run/detail/us-central1/teamtrek/metrics
```

---

## Troubleshooting

### App won't start
- Check logs: `gcloud run services logs read teamtrek --region us-central1`
- Verify DATABASE_URL secret is correct
- Ensure Cloud SQL instance is running

### Database connection fails
- Verify Cloud SQL connection name is correct in DATABASE_URL
- Check that Cloud Run service has `--add-cloudsql-instances` configured
- Test connection with Cloud SQL Proxy locally

### Build fails
- Ensure all dependencies are in package.json
- Check Dockerfile syntax
- Verify you have enough billing quota

---

## Local Testing with Docker

Test the production build locally before deploying:

```bash
# Build the Docker image
docker build -t teamtrek:local .

# Run with local environment variables
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  -e NODE_ENV=production \
  -e PORT=8080 \
  teamtrek:local

# Open http://localhost:8080
```

---

## Security Best Practices

1. ✅ Use Secret Manager for sensitive data (not hardcoded)
2. ✅ Enable SSL for Cloud SQL connections
3. ✅ Use IAM roles with least privilege
4. ✅ Enable Cloud Armor for DDoS protection (optional)
5. ✅ Set up Cloud Monitoring alerts

---

## Next Steps

- Set up custom domain: [Cloud Run Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains)
- Configure CI/CD with Cloud Build triggers
- Enable Cloud CDN for faster static asset delivery
- Set up Cloud Monitoring dashboards

---

## Support

For issues:
- Check Cloud Run docs: https://cloud.google.com/run/docs
- Check Cloud SQL docs: https://cloud.google.com/sql/docs
- Review application logs for errors
