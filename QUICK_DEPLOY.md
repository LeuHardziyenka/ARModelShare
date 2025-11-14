# 🚀 Quick Deploy - ARModelShare to Google Cloud

## Prerequisites Checklist
- [ ] Google Cloud account with billing enabled
- [ ] gcloud CLI installed: `gcloud --version`
- [ ] Authenticated: `gcloud auth list`
- [ ] Project set: `gcloud config get-value project`
- [ ] `.env` file configured with Supabase credentials

## 3-Step Deployment

### Step 1: Set Up Secrets (One-time)

```bash
# Replace with your actual values
PROJECT_ID="your-gcp-project-id"

echo -n 'https://xxxxx.supabase.co' | \
  gcloud secrets create SUPABASE_URL --data-file=- --project=$PROJECT_ID

echo -n 'your_service_role_key_here' | \
  gcloud secrets create SUPABASE_SERVICE_KEY --data-file=- --project=$PROJECT_ID

echo -n 'your_anon_key_here' | \
  gcloud secrets create SUPABASE_ANON_KEY --data-file=- --project=$PROJECT_ID
```

### Step 2: Configure `.env`

```bash
cp .env.example .env
nano .env
```

Add your values:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
PORT=5000
```

### Step 3: Deploy

```bash
./deploy.sh
```

That's it! 🎉

## Expected Output

```
========================================
  ARModelShare - GCP Deployment
========================================

[1/7] Checking gcloud CLI...
✓ gcloud CLI found

[2/7] Using GCP Project: your-project-id
      Region: us-central1

[3/7] Verifying authentication...
✓ Authenticated

[4/7] Enabling required Google Cloud APIs...
✓ APIs enabled

[5/7] Verifying Secret Manager secrets...
  ✓ Secret 'SUPABASE_URL' exists
  ✓ Secret 'SUPABASE_SERVICE_KEY' exists
  ✓ Secret 'SUPABASE_ANON_KEY' exists
✓ All secrets verified

[6/7] Loading frontend build variables...
✓ Frontend build variables loaded

[7/7] Starting Cloud Build deployment...
This will:
  1. Build Docker image with Vite frontend and Express backend
  2. Push to Google Container Registry
  3. Deploy to Cloud Run with secrets from Secret Manager

[Build logs...]

========================================
  ✓ Deployment Complete!
========================================

Your application is live at:
https://armodelshare-xxxxx.run.app
```

## Quick Commands

### View Logs
```bash
gcloud run logs tail --service=armodelshare --region=us-central1
```

### Test Health
```bash
curl https://your-service-url.run.app/api/health
```

### Update Deployment
```bash
# Make your code changes, then:
./deploy.sh
```

### Rollback
```bash
gcloud run services update-traffic armodelshare \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1
```

## Troubleshooting

### Secret Not Found
```bash
# List all secrets
gcloud secrets list

# Create missing secret
echo -n 'value' | gcloud secrets create SECRET_NAME --data-file=-
```

### Build Fails
```bash
# Check build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log BUILD_ID
```

### Service Won't Start
```bash
# Check recent logs
gcloud run logs read --service=armodelshare --limit=100

# Verify secrets are accessible
gcloud secrets versions access latest --secret=SUPABASE_URL
```

## Resource URLs

- **Cloud Console**: https://console.cloud.google.com/run
- **Logs**: https://console.cloud.google.com/logs
- **Secrets**: https://console.cloud.google.com/security/secret-manager
- **Full Docs**: See `DEPLOYMENT.md`

---

**Need Help?** Check `DEPLOYMENT.md` for detailed documentation.
