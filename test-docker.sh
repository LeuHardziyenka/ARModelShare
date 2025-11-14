#!/bin/bash

# Local Docker Test Script for ARModelShare

set -e

echo "=========================================="
echo "  Local Docker Build & Test"
echo "=========================================="
echo ""

# Load environment variables
if [ -f ".env" ]; then
    export $(grep "^VITE_" .env | xargs)
    echo "✓ Loaded VITE environment variables"
else
    echo "❌ .env file not found"
    exit 1
fi

# Clean up old containers/images
echo ""
echo "[1/4] Cleaning up old containers..."
docker stop armodelshare-test 2>/dev/null || true
docker rm armodelshare-test 2>/dev/null || true

# Build the Docker image
echo ""
echo "[2/4] Building Docker image..."
docker build \
    --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
    --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
    -t armodelshare:local \
    .

echo ""
echo "[3/4] Starting container..."

# Get secrets from .env
SUPABASE_URL=$(grep "^SUPABASE_URL=" .env | cut -d'=' -f2-)
SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_KEY=" .env | cut -d'=' -f2-)
SUPABASE_ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" .env | cut -d'=' -f2-)

# Run the container
docker run -d \
    --name armodelshare-test \
    -p 8080:8080 \
    -e NODE_ENV=production \
    -e PORT=8080 \
    -e SUPABASE_URL="$SUPABASE_URL" \
    -e SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" \
    -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
    armodelshare:local

echo ""
echo "[4/4] Waiting for container to start (10 seconds)..."
sleep 10

# Check if container is running
if docker ps | grep -q armodelshare-test; then
    echo ""
    echo "✓ Container is running!"
    echo ""
    echo "Container logs:"
    echo "----------------------------------------"
    docker logs armodelshare-test
    echo "----------------------------------------"
    echo ""
    echo "Testing health endpoint..."
    if curl -f http://localhost:8080/api/health 2>/dev/null; then
        echo ""
        echo "=========================================="
        echo "  ✓ SUCCESS! Server is healthy"
        echo "=========================================="
        echo ""
        echo "Access your app at: http://localhost:8080"
        echo ""
        echo "To view logs: docker logs -f armodelshare-test"
        echo "To stop: docker stop armodelshare-test"
    else
        echo ""
        echo "❌ Health check failed"
        echo ""
        echo "Full logs:"
        docker logs armodelshare-test
        exit 1
    fi
else
    echo ""
    echo "❌ Container failed to start"
    echo ""
    echo "Container logs:"
    docker logs armodelshare-test 2>&1
    exit 1
fi
