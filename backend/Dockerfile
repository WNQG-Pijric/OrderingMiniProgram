FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/restaurant" npx prisma generate
RUN npm run build

FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY start.sh ./start.sh

EXPOSE 3000

CMD ["sh", "start.sh"]
