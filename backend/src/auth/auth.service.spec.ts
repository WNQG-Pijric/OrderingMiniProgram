import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';
import { WechatService } from './wechat.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const mockWechat = { code2Session: jest.fn() };
  const mockJwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const mockConfig = { getOrThrow: jest.fn() };

  /** 构造一个可用的用户对象（balance 用字符串模拟 Decimal） */
  const buildUser = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    openid: 'openid-test',
    nickname: null,
    avatar: null,
    role: 'USER',
    balance: '10.00',
    status: 1,
    createdAt: new Date('2026-08-05T00:00:00Z'),
    updatedAt: new Date('2026-08-05T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfig.getOrThrow.mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') return 'test-access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
      return undefined;
    });
    mockJwt.signAsync.mockResolvedValue('signed-token');
    mockJwt.verifyAsync.mockResolvedValue({
      userId: 1,
      openid: 'openid-test',
      role: 'USER',
      type: 'refresh',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: WechatService,
          useValue: mockWechat,
        },
        { provide: JwtService, useValue: mockJwt },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('首次登录自动注册：code2Session → upsert → 签发 token', async () => {
      mockWechat.code2Session.mockResolvedValue('openid-test');
      mockPrisma.user.upsert.mockResolvedValue(buildUser());

      const result = await service.login({ code: 'code-123' });

      expect(mockWechat.code2Session).toHaveBeenCalledWith('code-123');
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { openid: 'openid-test' },
        update: {},
        create: { openid: 'openid-test' },
      });
      // 二次登录重复调用不重复注册（upsert 单次调用天然幂等）
      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(1);
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user.id).toBe(1);
      // 不返回 openid 等敏感字段
      expect(result.user).not.toHaveProperty('openid');
    });

    it('code 无效（微信未返回 openid）→ 20002 登录凭证无效', async () => {
      mockWechat.code2Session.mockRejectedValue(
        new BizException(ErrorCode.INVALID_CREDENTIALS),
      );
      await expect(service.login({ code: 'bad' })).rejects.toThrow(
        BizException,
      );
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('禁用用户（status=0）→ 20004 账号已被禁用', async () => {
      mockWechat.code2Session.mockResolvedValue('openid-test');
      mockPrisma.user.upsert.mockResolvedValue(buildUser({ status: 0 }));

      await expect(service.login({ code: 'code' })).rejects.toMatchObject({
        response: { code: ErrorCode.ACCOUNT_DISABLED },
      });
    });
  });

  describe('refresh', () => {
    it('refreshToken 有效 → 签发新 token（轮换）', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());

      const result = await service.refresh('valid-refresh-token');

      expect(mockJwt.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
      expect(result.accessToken).toBe('signed-token');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('refreshToken 无效/过期 → 40101', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(service.refresh('bad')).rejects.toMatchObject({
        response: { code: ErrorCode.TOKEN_EXPIRED },
      });
    });

    it('accessToken 不能当 refreshToken 用（type 不匹配）→ 40101', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        userId: 1,
        openid: 'openid-test',
        role: 'USER',
        type: 'access',
      });
      await expect(service.refresh('access-token')).rejects.toMatchObject({
        response: { code: ErrorCode.TOKEN_EXPIRED },
      });
    });

    it('用户已删除 → 30001 用户不存在', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.refresh('valid')).rejects.toMatchObject({
        response: { code: ErrorCode.USER_NOT_FOUND },
      });
    });
  });

  describe('profile', () => {
    it('返回安全字段，不含 openid/deletedAt', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      const profile = await service.profile(1);
      expect(profile.id).toBe(1);
      expect(profile.balance).toBe('10.00');
      expect(profile).not.toHaveProperty('openid');
      expect(profile).not.toHaveProperty('deletedAt');
    });

    it('用户不存在 → 30001', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.profile(999)).rejects.toMatchObject({
        response: { code: ErrorCode.USER_NOT_FOUND },
      });
    });
  });
});
