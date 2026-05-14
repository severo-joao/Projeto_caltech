#!/bin/bash
set -e

echo "=== Deploy Caltech Faturas ==="

# Build do frontend
echo "-> Build do frontend..."
cd frontend
npm ci
npm run build
cd ..

# Sobe os containers
echo "-> Subindo containers..."
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d

echo ""
echo "=== Deploy concluido ==="
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
