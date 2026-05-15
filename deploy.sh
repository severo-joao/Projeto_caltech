#!/bin/bash
set -e

echo "=== Deploy Caltech Faturas ==="

# Build do frontend
echo "-> Build do frontend..."
cd frontend
npm ci
npm run build
cd ..

# Build e sobe os containers (arquivo separado, não toca no n8n/crm)
echo "-> Subindo containers..."
docker compose -f docker-compose.yml down --remove-orphans
docker compose -f docker-compose.yml build --no-cache
docker compose -f docker-compose.yml up -d

echo ""
echo "=== Deploy concluido ==="
echo "App: https://faturas.srv1122212.hstgr.cloud"
