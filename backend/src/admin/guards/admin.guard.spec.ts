import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode } from '../../common/errors';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  const mockJwt = { verifyAsync: jest.fn() };
  const mockConfig = { getOrThrow: jest.fn(() => 'test-secret') };

  const mockContext = (authorization?: string): ExecutionContext => {
    const req = { headers: { authorization }, admin: undefined };
    return {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        { provide: JwtService, useValue: mockJwt },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();
    guard = module.get<AdminGuard>(AdminGuard);
  });

  it('无 Authorization header → 20001 未登录', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toMatchObject({
      response: { code: ErrorCode.UNAUTHORIZED },
    });
  });

  it('Authorization 无 Bearer 前缀 → 20001 未登录', async () => {
    await expect(
      guard.canActivate(mockContext('Basic abc')),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.UNAUTHORIZED },
    });
  });

  it('Bearer 为空 → 20001 未登录', async () => {
    await expect(
      guard.canActivate(mockContext('Bearer ')),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.UNAUTHORIZED },
    });
  });

  it('token 无效 / 过期 → 40101', async () => {
    mockJwt.verifyAsync.mockRejectedValue(new Error('jwt malformed'));
    await expect(
      guard.canActivate(mockContext('Bearer bad')),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.TOKEN_EXPIRED },
    });
  });

  it('用户 token（type 非 admin-access）访问管理接口 → 40101 拒绝', async () => {
    mockJwt.verifyAsync.mockResolvedValue({
      userId: 1,
      openid: 'o',
      role: 'USER',
      type: 'access',
    });
    await expect(
      guard.canActivate(mockContext('Bearer user-token')),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.TOKEN_EXPIRED },
    });
  });

  it('合法 admin token → 通过并写入 req.admin', async () => {
    const payload = {
      adminId: 1,
      username: 'admin',
      type: 'admin-access' as const,
    };
    mockJwt.verifyAsync.mockResolvedValue(payload);
    const ctx = mockContext('Bearer ok');
    const req = ctx.switchToHttp().getRequest<{ admin?: unknown }>();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.admin).toEqual(payload);
  });
});
