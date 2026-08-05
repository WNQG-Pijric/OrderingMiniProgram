import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from './../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/setup-app';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let config: ConfigService;

  const mockUser = {
    id: 1,
    openid: 'openid-e2e',
    nickname: '小食客',
    avatar: 'https://example.com/avatar.png',
    role: 'USER',
    balance: '10.00',
    status: 1,
    createdAt: new Date('2026-08-05T00:00:00Z'),
    updatedAt: new Date('2026-08-05T00:00:00Z'),
    deletedAt: null,
  };

  const mockLog = {
    id: 1,
    userId: 1,
    orderId: null,
    change: '-5.00',
    balanceAfter: '5.00',
    type: 'pay',
    remark: '订单消费',
    createdAt: new Date('2026-08-05T00:00:00Z'),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    walletLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();

    jwtService = app.get(JwtService);
    config = app.get(ConfigService);
    accessToken = await jwtService.signAsync(
      { userId: 1, openid: 'openid-e2e', role: 'USER', type: 'access' },
      { secret: config.getOrThrow<string>('JWT_SECRET'), expiresIn: '2h' },
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      nickname: '新昵称',
    });
    mockPrisma.walletLog.findMany.mockResolvedValue([mockLog]);
    mockPrisma.walletLog.count.mockResolvedValue(1);
    mockPrisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
  });

  describe('GET /users/profile', () => {
    it('未携带 token → 20001 未登录', async () => {
      const res = await request(app.getHttpServer()).get('/users/profile');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(20001);
    });

    it('携带非法 token → 40101', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer not-a-token');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(40101);
    });

    it('携带合法 token → 返回资料（不含 openid，balance 为字符串）', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.nickname).toBe('小食客');
      expect(res.body.data.balance).toBe('10.00');
      expect(res.body.data).not.toHaveProperty('openid');
    });

    it('用户不存在 → 30001', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(30001);
    });

    it('禁用用户（status=0）→ 20004', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, status: 0 });
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(20004);
    });
  });

  describe('PUT /users/profile', () => {
    it('未携带 token → 20001', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .send({ nickname: 'x' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(20001);
    });

    it('只改昵称 → 更新当前用户并返回新资料', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nickname: '新昵称' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.nickname).toBe('新昵称');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nickname: '新昵称' },
      });
    });

    it('昵称和头像都不传 → 10001 参数错误', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(10001);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('携带未声明字段 → 400 + 10001（forbidNonWhitelisted）', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nickname: 'x', userId: 2 });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(10001);
    });

    it('nickname 传 null → 400 + 10001（拒绝清空字段，不落库）', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nickname: null });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(10001);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('avatar 传 null → 400 + 10001', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ avatar: null });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(10001);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /users/wallet', () => {
    it('携带合法 token → 返回余额字符串', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/wallet')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toEqual({ balance: '10.00' });
    });

    it('用户不存在 → 30001', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app.getHttpServer())
        .get('/users/wallet')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(30001);
    });
  });

  describe('GET /users/wallet/logs', () => {
    it('携带合法 token → 倒序分页流水（金额为字符串）', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/wallet/logs')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(10);
      expect(res.body.data.list[0].change).toBe('-5.00');
      expect(res.body.data.list[0].balanceAfter).toBe('5.00');
      expect(mockPrisma.walletLog.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('page=0 → 400 + 10001', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/wallet/logs?page=0')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(10001);
    });

    it('pageSize=100 超过上限 → 400 + 10001', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/wallet/logs?pageSize=100')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(10001);
    });

    it('用户不存在 → 30001（不查流水）', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app.getHttpServer())
        .get('/users/wallet/logs')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(30001);
      expect(mockPrisma.walletLog.findMany).not.toHaveBeenCalled();
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
