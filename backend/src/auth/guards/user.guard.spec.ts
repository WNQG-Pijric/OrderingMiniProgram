import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode } from '../../common/errors';
import { UserGuard } from './user.guard';

describe('UserGuard', () => {
  let guard: UserGuard;
  const mockJwt = { verifyAsync: jest.fn() };
  const mockConfig = { getOrThrow: jest.fn(() => 'test-secret') };

  const mockContext = (authorization?: string): ExecutionContext => {
    const req = { headers: { authorization }, user: undefined };
    return {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGuard,
        { provide: JwtService, useValue: mockJwt },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();
    guard = module.get<UserGuard>(UserGuard);
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

  it('token 无效/过期 → 40101', async () => {
    mockJwt.verifyAsync.mockRejectedValue(new Error('jwt malformed'));
    await expect(
      guard.canActivate(mockContext('Bearer bad')),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.TOKEN_EXPIRED },
    });
  });

  it('token 类型非 access（refresh 当 access 用）→ 40101', async () => {
    mockJwt.verifyAsync.mockResolvedValue({
      userId: 1,
      openid: 'o',
      role: 'USER',
      type: 'refresh',
    });
    await expect(
      guard.canActivate(mockContext('Bearer ok')),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.TOKEN_EXPIRED },
    });
  });

  it('合法 access token → 通过并写入 req.user', async () => {
    const payload = {
      userId: 1,
      openid: 'o',
      role: 'USER',
      type: 'access' as const,
    };
    mockJwt.verifyAsync.mockResolvedValue(payload);
    const ctx = mockContext('Bearer ok');
    const req = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual(payload);
  });
});
