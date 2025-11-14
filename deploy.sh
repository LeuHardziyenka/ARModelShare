#!/bin/bash

# ARModelShare - Google Cloud Deployment Script
# This script handles the complete deployment process to Google Cloud Run

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - MODIFY THESE VALUES
PROJECT_ID="armodelshare-478207"
REGION="europe-west3"
SERVICE_NAME="armodelshare"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ARModelShare - GCP Deployment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Validate gcloud CLI is installed
echo -e "${YELLOW}[1/7] Checking gcloud CLI...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi
echo -e "${GREEN}✓ gcloud CLI found${NC}\n"

# Step 2: Get project ID if not set
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}❌ No project ID found. Please set GCLOUD_PROJECT_ID or run: gcloud config set project YOUR_PROJECT_ID${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}[2/7] Using GCP Project: ${BLUE}$PROJECT_ID${NC}"
echo -e "${YELLOW}      Region: ${BLUE}$REGION${NC}\n"

# Step 3: Check authentication
echo -e "${YELLOW}[3/7] Verifying authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ Not authenticated. Please run: gcloud auth login${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated${NC}\n"

# Step 4: Enable required APIs
echo -e "${YELLOW}[4/7] Enabling required Google Cloud APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com \
    --project="$PROJECT_ID" \
    --quiet

echo -e "${GREEN}✓ APIs enabled${NC}\n"

# Step 5: Check and verify secrets
echo -e "${YELLOW}[5/7] Verifying Secret Manager secrets...${NC}"

check_secret() {
    local SECRET_NAME=$1
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${GREEN}  ✓ Secret '$SECRET_NAME' exists${NC}"
        return 0
    else
        echo -e "${RED}  ✗ Secret '$SECRET_NAME' NOT found${NC}"
        return 1
    fi
}

SECRETS_OK=true
for SECRET in SUPABASE_URL SUPABASE_SERVICE_KEY SUPABASE_ANON_KEY; do
    if ! check_secret "$SECRET"; then
        SECRETS_OK=false
    fi
done

if [ "$SECRETS_OK" = false ]; then
    echo -e "\n${RED}❌ Some secrets are missing. Please create them:${NC}"
    echo -e "${YELLOW}Example:${NC}"
    echo -e "  echo -n 'your_value_here' | gcloud secrets create SUPABASE_URL --data-file=- --project=$PROJECT_ID"
    echo -e "  echo -n 'your_value_here' | gcloud secrets create SUPABASE_SERVICE_KEY --data-file=- --project=$PROJECT_ID"
    echo -e "  echo -n 'your_value_here' | gcloud secrets create SUPABASE_ANON_KEY --data-file=- --project=$PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✓ All secrets verified${NC}\n"

# Step 6: Load VITE environment variables from .env for build
echo -e "${YELLOW}[6/7] Loading frontend build variables...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found. Please create it from .env.example${NC}"
    exit 1
fi

# Source the .env file and extract VITE variables
export $(grep "^VITE_" .env | xargs)

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend build variables loaded${NC}\n"

# Step 7: Deploy using Cloud Build
echo -e "${YELLOW}[7/7] Starting Cloud Build deployment...${NC}"
echo -e "${BLUE}This will:${NC}"
echo -e "  1. Build Docker image with Vite frontend and Express backend"
echo -e "  2. Push to Google Container Registry"
echo -e "  3. Deploy to Cloud Run with secrets from Secret Manager\n"

gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=\
_REGION="$REGION",\
_VITE_SUPABASE_URL="$VITE_SUPABASE_URL",\
_VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY",\
_MEMORY="512Mi",\
_CPU="1",\
_MIN_INSTANCES="0",\
_MAX_INSTANCES="10" \
    --project="$PROJECT_ID"

# Step 8: Get the service URL
echo -e "\n${YELLOW}Fetching service URL...${NC}"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)" 2>/dev/null || echo "")

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

if [ -n "$SERVICE_URL" ]; then
    echo -e "${BLUE}Your application is live at:${NC}"
    echo -e "${GREEN}$SERVICE_URL${NC}\n"
else
    echo -e "${YELLOW}Service URL not available yet. Check Cloud Console:${NC}"
    echo -e "https://console.cloud.google.com/run?project=$PROJECT_ID\n"
fi

echo -e "${BLUE}Next steps:${NC}"
echo -e "  • Test your application at the URL above"
echo -e "  • View logs: ${YELLOW}gcloud run logs read --service=$SERVICE_NAME --region=$REGION --project=$PROJECT_ID${NC}"
echo -e "  • Monitor: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID\n"
