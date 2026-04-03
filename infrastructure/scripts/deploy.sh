#!/bin/bash
# Smart Office Resource Hub — AWS Deployment Script
set -e

# ========== Config ==========
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"
PROJECT="smart-office"

BACKEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}-backend"
FRONTEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}-frontend"

echo "🚀 Deploying Smart Office Resource Hub"
echo "   Region: ${AWS_REGION}"
echo "   Account: ${AWS_ACCOUNT_ID}"
echo "   Image tag: ${IMAGE_TAG}"

# ========== ECR Login ==========
echo "📦 Logging in to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin \
  "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# ========== Build & Push Backend ==========
echo "🔨 Building backend..."
docker build \
  --target production \
  -t "${BACKEND_REPO}:${IMAGE_TAG}" \
  -t "${BACKEND_REPO}:latest" \
  ./backend

docker push "${BACKEND_REPO}:${IMAGE_TAG}"
docker push "${BACKEND_REPO}:latest"

# ========== Build & Push Frontend ==========
echo "🔨 Building frontend..."
docker build \
  --target production \
  --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
  --build-arg NEXT_PUBLIC_WS_URL="${WS_URL}" \
  -t "${FRONTEND_REPO}:${IMAGE_TAG}" \
  -t "${FRONTEND_REPO}:latest" \
  ./frontend

docker push "${FRONTEND_REPO}:${IMAGE_TAG}"
docker push "${FRONTEND_REPO}:latest"

# ========== Update ECS Services ==========
echo "🔄 Updating ECS services..."
aws ecs update-service \
  --cluster "${PROJECT}-cluster" \
  --service "${PROJECT}-backend" \
  --force-new-deployment \
  --region "${AWS_REGION}" > /dev/null

aws ecs update-service \
  --cluster "${PROJECT}-cluster" \
  --service "${PROJECT}-frontend" \
  --force-new-deployment \
  --region "${AWS_REGION}" > /dev/null

echo "✅ Deployment initiated! Monitor progress:"
echo "   https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${PROJECT}-cluster"
