#!/bin/bash
# deploy-with-docker.sh
set -e

ENVIRONMENT=${1:-dev}

echo "Building Docker image..."
npm run docker:build:${ENVIRONMENT}

echo "Deploying CDK stack..."
npm run deploy:${ENVIRONMENT} 