// Prisma 配置（Prisma 6.19+ / 7 推荐方式）
// 提供 seed 命令配置与数据源连接 URL
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
