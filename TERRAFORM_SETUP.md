# Terraform Setup Guide for ARModelShare

This guide will walk you through setting up Terraform-based deployment to Google Cloud Platform with GitHub Actions automation.

## 📋 Prerequisites

1. **Google Cloud Project** with billing enabled
2. **GitHub Repository** with admin access
3. **gcloud CLI** installed locally ([Installation Guide](https://cloud.google.com/sdk/docs/install))
4. **Terraform** installed locally ([Installation Guide](https://developer.hashicorp.com/terraform/install))
5. **Supabase Project** with credentials ready

## 🔧 One-Time Setup

### Step 1: Create GCS Bucket for Terraform State

Terraform needs a GCS bucket to store its state file remotely.

```bash
# Set your project ID
export PROJECT_ID="armodelshare-478207"

# Create the bucket for Terraform state
gsutil mb -p $PROJECT_ID -l europe-west3 gs://${PROJECT_ID}-terraform-state

# Enable versioning for safety
gsutil versioning set on gs://${PROJECT_ID}-terraform-state

# Verify bucket creation
gsutil ls -p $PROJECT_ID
```

### Step 2: Create Service Account for GitHub Actions

Create a service account that GitHub Actions will use to deploy your application.

```bash
# Create service account
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for GitHub Actions to deploy via Terraform" \
  --project=$PROJECT_ID

# Get the service account email
SA_EMAIL="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/serviceusage.serviceUsageAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudbuild.builds.builder"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=$SA_EMAIL \
  --project=$PROJECT_ID

echo "✅ Service account key saved to github-actions-key.json"
echo "⚠️  Keep this file secure! You'll need it for GitHub secrets."
```

### Step 3: Create Secrets in Secret Manager

Create the secrets that your application will use at runtime.

```bash
# Create secrets (these are just placeholders - you'll add values later)
gcloud secrets create SUPABASE_URL \
  --replication-policy="automatic" \
  --project=$PROJECT_ID

gcloud secrets create SUPABASE_SERVICE_KEY \
  --replication-policy="automatic" \
  --project=$PROJECT_ID

gcloud secrets create SUPABASE_ANON_KEY \
  --replication-policy="automatic" \
  --project=$PROJECT_ID

# Add the actual secret values
echo -n 'https://your-project.supabase.co' | \
  gcloud secrets versions add SUPABASE_URL --data-file=- --project=$PROJECT_ID

echo -n 'your_service_role_key_here' | \
  gcloud secrets versions add SUPABASE_SERVICE_KEY --data-file=- --project=$PROJECT_ID

echo -n 'your_anon_key_here' | \
  gcloud secrets versions add SUPABASE_ANON_KEY --data-file=- --project=$PROJECT_ID

echo "✅ Secrets created in Secret Manager"
```

### Step 4: Configure GitHub Secrets

Go to your GitHub repository settings and add the following secrets:

**Repository Settings → Secrets and variables → Actions → New repository secret**

#### Required GitHub Secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `GCP_SA_KEY` | Service account JSON key (entire file content) | `{"type": "service_account"...}` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |

#### How to add each secret:

1. **GCP_SA_KEY**:
   ```bash
   # Copy the entire content of github-actions-key.json
   cat github-actions-key.json
   # Paste this JSON into GitHub as GCP_SA_KEY secret
   ```

2. **VITE_SUPABASE_URL**:
   - Copy from your Supabase project settings → API → Project URL
   - Paste into GitHub secret

3. **VITE_SUPABASE_ANON_KEY**:
   - Copy from your Supabase project settings → API → Project API keys → `anon` `public`
   - Paste into GitHub secret

### Step 5: Initialize Terraform Locally

Before the first deployment, initialize Terraform locally to verify everything works.

```bash
# Navigate to terraform directory
cd terraform

# Initialize Terraform (this will configure the GCS backend)
terraform init

# Validate the configuration
terraform validate

# Check formatting
terraform fmt

# Review the plan (optional - won't deploy anything)
terraform plan

# Go back to project root
cd ..
```

## 🚀 Deploying Your Application

### First Deployment

For the first deployment, you can either:

**Option A: Use GitHub Actions (Recommended)**

1. Push your code to the `master` branch:
   ```bash
   git add .
   git commit -m "feat: add Terraform infrastructure"
   git push origin master
   ```

2. GitHub Actions will automatically:
   - Build Docker image with your frontend and backend
   - Push image to Google Container Registry
   - Deploy infrastructure with Terraform
   - Deploy Cloud Run service with the new image

3. Monitor the deployment in GitHub Actions tab

**Option B: Deploy Manually First**

```bash
# Build and push Docker image manually
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export VITE_SUPABASE_ANON_KEY="your_anon_key"

docker build \
  --build-arg VITE_SUPABASE_URL="${VITE_SUPABASE_URL}" \
  --build-arg VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}" \
  -t gcr.io/$PROJECT_ID/armodelshare:latest \
  .

gcloud auth configure-docker
docker push gcr.io/$PROJECT_ID/armodelshare:latest

# Apply Terraform
cd terraform
terraform apply -auto-approve
cd ..
```

### Subsequent Deployments

After the initial setup, every push to the `master` branch will automatically trigger deployment.

## 🔍 Verifying Deployment

### Check Terraform State

```bash
cd terraform
terraform show
terraform output
```

### Check Cloud Run Service

```bash
gcloud run services describe armodelshare \
  --region=europe-west3 \
  --project=$PROJECT_ID

# Get service URL
gcloud run services describe armodelshare \
  --region=europe-west3 \
  --format='value(status.url)' \
  --project=$PROJECT_ID
```

### View Logs

```bash
# View real-time logs
gcloud run logs tail --service=armodelshare --region=europe-west3

# View recent logs
gcloud run logs read --service=armodelshare --region=europe-west3 --limit=50
```

### Test Health Endpoint

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe armodelshare \
  --region=europe-west3 \
  --format='value(status.url)' \
  --project=$PROJECT_ID)

# Test health endpoint
curl $SERVICE_URL/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-11-17T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

## 🔄 Updating Infrastructure

### Modify Terraform Configuration

1. Edit files in `terraform/` directory
2. Commit and push changes to `master` branch
3. GitHub Actions will automatically apply changes

### Manual Terraform Updates

```bash
cd terraform

# Review changes
terraform plan

# Apply changes
terraform apply

cd ..
```

## 🗑️ Destroying Resources

**⚠️ WARNING: This will delete all resources including your application and data!**

```bash
cd terraform

# Review what will be deleted
terraform plan -destroy

# Destroy all resources
terraform destroy

cd ..
```

## 🔐 Security Best Practices

1. **Never commit `github-actions-key.json`** - Add to `.gitignore`
2. **Rotate service account keys regularly** - Every 90 days recommended
3. **Use least privilege principle** - Only grant necessary IAM roles
4. **Enable Secret Manager audit logs** - Track secret access
5. **Use separate environments** - Consider dev/staging/prod

## 🐛 Troubleshooting

### GitHub Actions Fails on Terraform Init

**Error**: `Backend configuration changed`

**Solution**:
```bash
# Delete Terraform lock file
rm terraform/.terraform.lock.hcl

# Commit and push
git add terraform/.terraform.lock.hcl
git commit -m "fix: remove terraform lock file"
git push
```

### Secret Access Denied

**Error**: `Permission denied accessing secret`

**Solution**:
```bash
# Grant Cloud Run service account access to secrets
SA_EMAIL=$(terraform output -raw service_account_email)

for SECRET in SUPABASE_URL SUPABASE_SERVICE_KEY SUPABASE_ANON_KEY; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID
done
```

### Container Image Not Found

**Error**: `Image 'gcr.io/...' not found`

**Solution**: Ensure Docker image was built and pushed before running Terraform:
```bash
# Build and push image manually first
docker build -t gcr.io/$PROJECT_ID/armodelshare:latest .
docker push gcr.io/$PROJECT_ID/armodelshare:latest
```

### Terraform State Lock

**Error**: `Error acquiring the state lock`

**Solution**: If a previous run crashed, release the lock:
```bash
cd terraform
terraform force-unlock <LOCK_ID>
cd ..
```

## 📊 Cost Estimation

Typical monthly costs for ARModelShare on GCP:

- **Cloud Run**: ~$5-20/month (depends on traffic)
  - First 2M requests free
  - 180K vCPU-seconds free
  - 360K GiB-seconds free

- **Storage (GCS)**: ~$1-5/month
  - First 5GB free
  - $0.02/GB for regional storage

- **Secret Manager**: ~$0.06/month
  - $0.06 per secret per month
  - 3 secrets = $0.18/month

- **Container Registry**: ~$1-10/month
  - Storage costs for Docker images

**Total estimated cost: $7-35/month** (depends on usage)

## 📚 Additional Resources

- [Terraform Google Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Secret Manager Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)

## 🆘 Getting Help

If you encounter issues:

1. Check GitHub Actions logs for error messages
2. Review Cloud Run logs: `gcloud run logs tail --service=armodelshare`
3. Verify secrets exist: `gcloud secrets list --project=$PROJECT_ID`
4. Check IAM permissions: `gcloud projects get-iam-policy $PROJECT_ID`
5. Validate Terraform: `cd terraform && terraform validate`
