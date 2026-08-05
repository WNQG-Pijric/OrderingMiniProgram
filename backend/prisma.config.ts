// Prisma 配置（Prisma 6.19+ / 7 推荐方式）
// 提供 seed 命令配置与数据源连接 URL
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('缺少环境变量 DATABASE_URL，请检查 backend/.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
