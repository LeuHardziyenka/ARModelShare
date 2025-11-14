# Environment Variables Configuration

This document explains how environment variables are configured for ARModelShare deployment.

## Environment Variable Types

### 1. Frontend Build-Time Variables (Baked into Bundle)
These are **baked into the frontend JavaScript bundle** during the Docker build process.

**Variables:**
- `VITE_SUPABASE_URL` - Supabase project URL (public, safe for frontend)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (public, safe for frontend)

**How they work:**
- Passed as `--build-arg` during Docker build
- Declared as `ARG` in Dockerfile
- Set as `ENV` during build stage
- Vite reads them and replaces `import.meta.env.VITE_*` in the code
- Final bundle contains the actual values (not variable references)

**Source:** `.env` file → `deploy.sh` → Cloud Build substitutions → Docker build args

### 2. Backend Runtime Variables (Secret Manager)
These are **injected at runtime** from Google Secret Manager (secure, never in code).

**Variables:**
- `SUPABASE_URL` - Supabase project URL (for backend)
- `SUPABASE_SERVICE_KEY` - Supabase service role key (**SECRET**, full database access)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (for backend)

**How they work:**
- Stored in Google Cloud Secret Manager
- Cloud Run pulls them at container startup
- Available as environment variables to the Node.js process
- Accessed via `process.env.SUPABASE_URL`, etc.

**Configuration:** Cloud Run service → Secrets tab → Mounted from Secret Manager

### 3. Cloud Run Automatic Variables
These are **automatically set by Cloud Run** (do not configure manually).

**Variables:**
- `PORT` - The port Cloud Run expects the container to listen on
  - Cloud Run sets this automatically (usually 8080)
  - Your server must listen on `process.env.PORT`
  - **DO NOT** set via `--set-env-vars` (causes deployment error)

**How they work:**
- Cloud Run injects this variable
- Server code reads: `const port = parseInt(process.env.PORT || '5000', 10)`
- Fallback to 5000 only used for local development

### 4. Application Environment Variables
These are **set via Cloud Run deployment** (static configuration).

**Variables:**
- `NODE_ENV=production` - Tells the application it's running in production mode

**Configuration:** Set via `--set-env-vars` in `cloudbuild.yaml`

## Complete Flow

### Local Development
```env
# .env file (not committed to git)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
PORT=5000
```

### Cloud Build Process

1. **Build Time** (Dockerfile):
```dockerfile
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build  # Vite bakes these into bundle
```

2. **Deployment** (cloudbuild.yaml):
```yaml
--set-env-vars NODE_ENV=production
--set-secrets SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_KEY=...
--port 8080  # Cloud Run will set PORT=8080 automatically
```

### Runtime in Cloud Run

**Container receives:**
```bash
# From Cloud Run (automatic)
PORT=8080

# From --set-env-vars
NODE_ENV=production

# From Secret Manager (via --set-secrets)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...
```

**Frontend bundle already contains** (baked in at build time):
- `VITE_SUPABASE_URL` → replaced with actual URL in JavaScript
- `VITE_SUPABASE_ANON_KEY` → replaced with actual key in JavaScript

## Security Model

### Frontend (Public - OK to Expose)
- `VITE_SUPABASE_URL` ✅ Public URL
- `VITE_SUPABASE_ANON_KEY` ✅ Anonymous key (Row Level Security protects data)

These are sent to users' browsers, so they must be non-sensitive.

### Backend (Private - Never Expose)
- `SUPABASE_SERVICE_KEY` 🔒 **CRITICAL SECRET**
  - Bypasses Row Level Security
  - Full database access
  - Must never be exposed to frontend
  - Stored only in Secret Manager

## Verification

### Check Build Args Were Used
Look for in build logs:
```
Step 26/X : ARG VITE_SUPABASE_URL
Step 27/X : ARG VITE_SUPABASE_ANON_KEY
```

**Should NOT see:**
```
[Warning] One or more build-args [VITE_SUPABASE_ANON_KEY VITE_SUPABASE_URL] were not consumed
```

### Check Runtime Secrets
After deployment:
```bash
gcloud run services describe armodelshare --region=europe-west3 --format=yaml | grep -A 10 secrets
```

### Check Frontend Bundle
After deployment, check browser DevTools → Network → index.js:
- Should contain actual Supabase URL (not `import.meta.env.VITE_SUPABASE_URL`)
- Should contain actual anon key value

## Troubleshooting

### Problem: "Build args not consumed"
**Cause:** Missing `ARG` declarations in Dockerfile
**Fix:** Add `ARG VITE_*` declarations before `ENV` in builder stage

### Problem: "Reserved env names: PORT"
**Cause:** Setting `PORT` via `--set-env-vars`
**Fix:** Remove `PORT` from `--set-env-vars`, Cloud Run sets it automatically

### Problem: "Cannot read import.meta.env.VITE_*"
**Cause:** Build args not passed to Docker build
**Fix:** Ensure `--build-arg VITE_SUPABASE_URL=...` in Cloud Build

### Problem: "SUPABASE_SERVICE_KEY not found"
**Cause:** Secret not created or not accessible
**Fix:**
```bash
gcloud secrets create SUPABASE_SERVICE_KEY --data-file=-
# Grant access to Cloud Run service account
```

## Adding New Environment Variables

### For Frontend (Build Time)
1. Add to `.env` with `VITE_` prefix
2. Add `ARG` and `ENV` to Dockerfile
3. Add to `--build-arg` in `cloudbuild.yaml`
4. Update `deploy.sh` to read from `.env`

### For Backend (Runtime - Public)
1. Add to `--set-env-vars` in `cloudbuild.yaml`

### For Backend (Runtime - Secret)
1. Create in Secret Manager
2. Add to `--set-secrets` in `cloudbuild.yaml`
3. Grant service account access

## References
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Docker Build Args](https://docs.docker.com/engine/reference/builder/#arg)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
