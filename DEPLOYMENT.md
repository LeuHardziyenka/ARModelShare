# ARModelShare - Google Cloud Deployment Guide

This guide covers deploying ARModelShare to Google Cloud Run using Docker containers.

## 📋 Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and configured ([Installation Guide](https://cloud.google.com/sdk/docs/install))
3. **Supabase Project** with the following ready:
   - Supabase URL
   - Supabase Anon Key
   - Supabase Service Role Key
4. **Local `.env` file** configured (see Setup section)

## 🏗️ Architecture Overview

The deployment uses:
- **Cloud Build**: Builds Docker image from source
- **Container Registry**: Stores Docker images
- **Cloud Run**: Serverless container hosting
- **Secret Manager**: Secure environment variable storage
- **Cloud Storage**: Bucket `armodel_storage` for file storage

## 🚀 Quick Start

### 1. Initial Setup

```bash
# 1. Authenticate with Google Cloud
gcloud auth login

# 2. Set your project ID
gcloud config set project YOUR_PROJECT_ID

# 3. Create .env file from example
cp .env.example .env

# 4. Edit .env and add your Supabase credentials
nano .env
```

### 2. Configure Environment Variables

Your `.env` file should contain:

```env
# Frontend (Vite) variables - will be baked into the build
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Backend variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

PORT=5000
```

### 3. Create Secrets in Secret Manager

The deployment script checks for these secrets. Create them manually if needed:

```bash
# Set your project ID
PROJECT_ID="your-project-id"

# Create secrets
echo -n 'https://your-project.supabase.co' | \
  gcloud secrets create SUPABASE_URL --data-file=- --project=$PROJECT_ID

echo -n 'your_service_role_key' | \
  gcloud secrets create SUPABASE_SERVICE_KEY --data-file=- --project=$PROJECT_ID

echo -n 'your_anon_key' | \
  gcloud secrets create SUPABASE_ANON_KEY --data-file=- --project=$PROJECT_ID
```

### 4. Deploy

```bash
# Run the deployment script
./deploy.sh
```

The script will:
1. ✅ Validate gcloud CLI and authentication
2. ✅ Enable required Google Cloud APIs
3. ✅ Verify Secret Manager secrets exist
4. ✅ Build Docker image with frontend and backend
5. ✅ Push image to Container Registry
6. ✅ Deploy to Cloud Run with secrets attached
7. ✅ Provide your application URL

## 📝 Manual Deployment

If you prefer manual control:

```bash
# 1. Set variables
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export SERVICE_NAME="armodelshare"

# 2. Load VITE variables from .env
export $(grep "^VITE_" .env | xargs)

# 3. Build and deploy
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_VITE_SUPABASE_URL=$VITE_SUPABASE_URL,_VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  --project=$PROJECT_ID
```

## 🔧 Configuration Options

### Cloud Build Substitutions

Customize deployment in `cloudbuild.yaml` or via CLI:

| Variable | Default | Description |
|----------|---------|-------------|
| `_REGION` | `us-central1` | GCP region for deployment |
| `_MEMORY` | `512Mi` | Container memory limit |
| `_CPU` | `1` | Number of CPUs |
| `_MIN_INSTANCES` | `0` | Minimum running instances (0 = scale to zero) |
| `_MAX_INSTANCES` | `10` | Maximum instances for autoscaling |
| `_SERVICE_ACCOUNT` | `` | Custom service account (optional) |

Example custom deployment:

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=\
_REGION="us-east1",\
_MEMORY="1Gi",\
_CPU="2",\
_MIN_INSTANCES="1",\
_MAX_INSTANCES="20" \
  --project=$PROJECT_ID
```

## 🐳 Docker Build Details

### Multi-Stage Build Process

The `Dockerfile` uses a 3-stage build:

1. **deps**: Install dependencies
2. **builder**: Build frontend (Vite) and backend (esbuild)
3. **runner**: Production runtime with minimal footprint

### Build Arguments

Frontend environment variables must be provided at build time:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="https://your-project.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="your_anon_key" \
  -t armodelshare:latest .
```

### Local Docker Testing

```bash
# 1. Build the image
docker build -t armodelshare:test .

# 2. Run with secrets
docker run -p 8080:8080 \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_SERVICE_KEY="your_service_key" \
  -e SUPABASE_ANON_KEY="your_anon_key" \
  -e NODE_ENV="production" \
  -e PORT=8080 \
  armodelshare:test

# 3. Test health check
curl http://localhost:8080/api/health
```

## 🔍 Monitoring & Debugging

### View Logs

```bash
# Real-time logs
gcloud run logs tail --service=armodelshare --region=us-central1

# Last 100 lines
gcloud run logs read --service=armodelshare --region=us-central1 --limit=100

# Filter by severity
gcloud run logs read --service=armodelshare --region=us-central1 --log-filter="severity>=ERROR"
```

### Health Check Endpoint

```bash
# Check if service is healthy
curl https://your-service-url.run.app/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-11-14T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Common Issues

#### 1. Secrets Not Found

**Error**: `Secret 'SUPABASE_URL' NOT found`

**Solution**: Create the secret in Secret Manager:
```bash
echo -n 'your_value' | gcloud secrets create SUPABASE_URL --data-file=-
```

#### 2. Build Fails - Out of Memory

**Error**: Docker build runs out of memory

**Solution**: Increase Cloud Build machine type in `cloudbuild.yaml`:
```yaml
options:
  machineType: 'E2_HIGHCPU_8'  # or 'N1_HIGHCPU_32'
```

#### 3. Frontend Build Issues

**Error**: Vite build fails or produces incorrect output

**Solution**: Ensure `VITE_*` variables are passed as build args:
```bash
--build-arg VITE_SUPABASE_URL="..." \
--build-arg VITE_SUPABASE_ANON_KEY="..."
```

#### 4. Container Crashes on Startup

**Error**: Container exits immediately

**Solution**: Check logs and verify:
- All required secrets are created
- `dist/index.js` exists in container
- Node.js version compatibility (using Node 20)

```bash
gcloud run logs read --service=armodelshare --region=us-central1 --limit=50
```

## 🔐 Security Best Practices

1. **Never commit `.env`** - Already in `.gitignore`
2. **Use Secret Manager** - All sensitive data should be in Secret Manager
3. **Service Account Permissions** - Grant minimal required permissions
4. **HTTPS Only** - Cloud Run enforces HTTPS by default
5. **IAM Policies** - Restrict who can deploy and access secrets

### Grant Service Account Access to Secrets

```bash
# Get the Cloud Run service account
SERVICE_ACCOUNT=$(gcloud run services describe armodelshare \
  --region=us-central1 \
  --format='value(spec.template.spec.serviceAccountName)')

# Grant access to secrets
for SECRET in SUPABASE_URL SUPABASE_SERVICE_KEY SUPABASE_ANON_KEY; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
done
```

## 📊 Cost Optimization

Cloud Run pricing depends on:
- **CPU/Memory**: Only charged when handling requests
- **Requests**: First 2M requests/month free
- **Networking**: Outbound traffic charged

### Tips to Reduce Costs

1. **Scale to Zero**: Set `_MIN_INSTANCES=0` to avoid idle charges
2. **Right-Size Resources**: Start with 512Mi/1CPU, increase if needed
3. **Use Caching**: Implement HTTP caching headers
4. **Monitor Usage**: Enable Cloud Monitoring and set budget alerts

```bash
# Set budget alert
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="ARModelShare Budget" \
  --budget-amount=50
```

## 🔄 CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy
        run: |
          gcloud builds submit \
            --config=cloudbuild.yaml \
            --substitutions=_VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }},_VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Secret Manager Guide](https://cloud.google.com/secret-manager/docs)
- [Cloud Build Configuration](https://cloud.google.com/build/docs/build-config-file-schema)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🆘 Support

If you encounter issues:
1. Check logs: `gcloud run logs tail --service=armodelshare`
2. Verify secrets: `gcloud secrets list`
3. Review Cloud Console: https://console.cloud.google.com/run
4. Check this guide's troubleshooting section above
