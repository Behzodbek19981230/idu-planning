#!/usr/bin/env bash
# Yangilash: bash deploy/deploy.sh   (/var/www/idu-planning ichida)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Kodni yangilash"
git pull --ff-only

echo "==> Backend bog'liqliklari va Prisma client"
npm --prefix server ci --include=dev

echo "==> Baza migratsiyalari"
npm --prefix server run db:migrate

echo "==> Frontend build"
npm --prefix client ci --include=dev
npm --prefix client run build

echo "==> API'ni qayta ishga tushirish"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "==> Tayyor"
PORT=$(grep -E '^PORT=' server/.env | cut -d= -f2 | tr -d '"\r')
sleep 2
curl -fsS "http://127.0.0.1:${PORT:-4010}/api/health" && echo || { echo "API javob bermadi:"; pm2 logs idu-planning-api --lines 15 --nostream; exit 1; }
