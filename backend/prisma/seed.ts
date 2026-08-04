// 数据库初始化种子数据（模块 00）
// 用法：npx prisma db seed
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 默认管理员账号（上线前务必修改密码）
  const password = await bcrypt.hash('admin123456', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password,
      nickname: '系统管理员',
      status: 1,
    },
  });
  console.log('✅ 默认管理员已创建：admin / admin123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
