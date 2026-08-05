import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ErrorCode } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

// bcrypt v6 为原生模块，属性只读不可 spyOn，整体 mock
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockBcryptCompare = bcrypt.compare as jest.Mock;

describe('AdminService', () => {
  let service: AdminService;
  const mockPrisma = {
    admin: { findUnique: jest.fn() },
  };
  const mockJwt = { signAsync: jest.fn() };
  const mockConfig = { getOrThrow: jest.fn(() => 'test-secret') };

  /** 构造管理员（password 为 bcrypt 哈希） */
  const buildAdmin = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    username: 'admin',
    password: 'hashed-password',
    nickname: '系统管理员',
    wechatOpenid: null,
    status: 1,
    createdAt: new Date('2026-08-05T00:00:00Z'),
    updatedAt: new Date('2026-08-05T00:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfig.getOrThrow.mockReturnValue('test-secret');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  describe('login', () => {
    it('账号密码正确 → 签发 admin JWT，返回不含密码的管理员信息', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(buildAdmin());
      mockBcryptCompare.mockResolvedValue(true);
      mockJwt.signAsync.mockResolvedValue('admin-token');

      const result = await service.login({
        username: 'admin',
        password: 'admin123456',
      });

      expect(mockJwt.signAsync).toHaveBeenCalledWith(
        { adminId: 1, username: 'admin', type: 'admin-access' },
        { secret: 'test-secret', expiresIn: '2h' },
      );
      expect(result.accessToken).toBe('admin-token');
      expect(result.admin).toEqual({
        id: 1,
        username: 'admin',
        nickname: '系统管理员',
        status: 1,
      });
      expect(result.admin).not.toHaveProperty('password');
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'admin123456',
        'hashed-password',
      );
    });

    it('账号不存在 → 20003 账号或密码错误（与密码错误同文案，不暴露账号是否存在）', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ username: 'nobody', password: '123456' }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.ACCOUNT_OR_PASSWORD_ERROR },
      });
      expect(mockJwt.signAsync).not.toHaveBeenCalled();
    });

    it('密码错误 → 20003 账号或密码错误', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(buildAdmin());
      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        service.login({ username: 'admin', password: 'wrong' }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.ACCOUNT_OR_PASSWORD_ERROR },
      });
      expect(mockJwt.signAsync).not.toHaveBeenCalled();
    });

    it('账号被禁用（status=0）→ 20004 账号已被禁用（密码正确时仍拒绝签发）', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(buildAdmin({ status: 0 }));
      mockBcryptCompare.mockResolvedValue(true);

      await expect(
        service.login({ username: 'admin', password: 'admin123456' }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.ACCOUNT_DISABLED },
      });
      expect(mockJwt.signAsync).not.toHaveBeenCalled();
    });
  });
});
