#!/bin/sh
set -e

# 微信云托管出网 HTTPS 被平台自签名证书代理拦截（self-signed certificate），
# 导致 fetch 微信接口失败。个人项目务实处理：关闭 Node TLS 证书校验。
export NODE_TLS_REJECT_UNAUTHORIZED=0

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Add it to the CloudRun service environment variables, then redeploy."
  exit 1
fi

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Seeding default admin (upsert, existing password untouched)..."
npx prisma db seed

echo "Starting NestJS..."
node dist/main
