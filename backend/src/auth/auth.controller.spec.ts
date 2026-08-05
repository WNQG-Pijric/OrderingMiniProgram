import { Test, TestingModule } from '@nestjs/testing';
import { UserGuard } from './guards/user.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const mockAuthService = {
    login: jest.fn(),
    refresh: jest.fn(),
    profile: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      // 单测只验证 Controller 方法逻辑，guard 交给 e2e 覆盖
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('login 透传 DTO 并返回 service 结果', async () => {
    mockAuthService.login.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
    });
    const result = await controller.login({ code: 'code-1' });
    expect(mockAuthService.login).toHaveBeenCalledWith({ code: 'code-1' });
    expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
  });

  it('refresh 透传 refreshToken', async () => {
    mockAuthService.refresh.mockResolvedValue({ accessToken: 'at2' });
    const result = await controller.refresh({ refreshToken: 'rt1' });
    expect(mockAuthService.refresh).toHaveBeenCalledWith('rt1');
    expect(result).toEqual({ accessToken: 'at2' });
  });

  it('profile 用 req.user.userId 调 service', async () => {
    mockAuthService.profile.mockResolvedValue({ id: 1 });
    const req = {
      user: { userId: 7, openid: 'o', role: 'USER' },
    };
    const result = await controller.profile(req as never);
    expect(mockAuthService.profile).toHaveBeenCalledWith(7);
    expect(result).toEqual({ id: 1 });
  });
});
