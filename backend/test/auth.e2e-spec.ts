import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { WechatService } from './../src/auth/wechat.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/setup-app';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let config: ConfigService;

  const mockUser = {
    id: 1,
    openid: 'openid-e2e',
    nickname: null,
    avatar: null,
    role: 'USER',
    balance: '0.00',
    status: 1,
    createdAt: new Date('2026-08-05T00:00:00Z'),
    updatedAt: new Date('2026-08-05T00:00:00Z'),
    deletedAt: null,
  };

  const mockPrisma = {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const mockWechat = { code2Session: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WechatService)
      .useValue(mockWechat as unknown as WechatService)
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();

    jwtService = app.get(JwtService);
    config = app.get(ConfigService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockWechat.code2Session.mockResolvedValue('openid-e2e');
    mockPrisma.user.upsert.mockResolvedValue(mockUser);
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  });

  it('POST /auth/login 缺少 code → 10001 参数错误', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(10001);
  });

  it('POST /auth/login 正常 → accessToken + refreshToken + user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ code: 'code-e2e' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.id).toBe(1);
    expect(mockWechat.code2Session).toHaveBeenCalledWith('code-e2e');
    expect(mockPrisma.user.upsert).toHaveBeenCalled();
  });

  it('GET /auth/profile 未携带 token → 40101', async () => {
    const res = await request(app.getHttpServer()).get('/auth/profile');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(40101);
  });

  it('GET /auth/profile 携带非法 token → 40101', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(40101);
  });

  it('GET /auth/profile 携带合法 accessToken → 返回当前用户', async () => {
    const accessToken = await jwtService.signAsync(
      { userId: 1, openid: 'openid-e2e', role: 'USER', type: 'access' },
      { secret: config.getOrThrow<string>('JWT_SECRET'), expiresIn: '2h' },
    );

    const res = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data).not.toHaveProperty('openid');
  });

  it('POST /auth/refresh 轮换 → 返回新 token', async () => {
    const refreshToken = await jwtService.signAsync(
      { userId: 1, openid: 'openid-e2e', role: 'USER', type: 'refresh' },
      {
        secret: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/refresh 携带无效 token → 40101', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid-token' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(40101);
  });

  afterAll(async () => {
    await app.close();
  });
});
