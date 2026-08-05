import { Test, TestingModule } from '@nestjs/testing';
import { UserGuard } from '../auth/guards/user.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const mockUsersService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getWallet: jest.fn(),
    getWalletLogs: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      // 单测只验证 Controller 方法逻辑，guard 交给 e2e 覆盖
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<UsersController>(UsersController);
  });

  it('profile 用 req.user.userId 调 service', async () => {
    mockUsersService.getProfile.mockResolvedValue({ id: 1 });
    const req = { user: { userId: 7, openid: 'o', role: 'USER' } };
    const result = await controller.profile(req as never);
    expect(mockUsersService.getProfile).toHaveBeenCalledWith(7);
    expect(result).toEqual({ id: 1 });
  });

  it('updateProfile 用 req.user.userId + 透传 DTO', async () => {
    mockUsersService.updateProfile.mockResolvedValue({ id: 1, nickname: 'x' });
    const req = { user: { userId: 7, openid: 'o', role: 'USER' } };
    const dto = { nickname: 'x' };
    const result = await controller.updateProfile(req as never, dto);
    expect(mockUsersService.updateProfile).toHaveBeenCalledWith(7, dto);
    expect(result).toEqual({ id: 1, nickname: 'x' });
  });

  it('wallet 用 req.user.userId 调 service', async () => {
    mockUsersService.getWallet.mockResolvedValue({ balance: '10.00' });
    const req = { user: { userId: 7, openid: 'o', role: 'USER' } };
    const result = await controller.wallet(req as never);
    expect(mockUsersService.getWallet).toHaveBeenCalledWith(7);
    expect(result).toEqual({ balance: '10.00' });
  });

  it('walletLogs 用 req.user.userId + 透传 page/pageSize', async () => {
    mockUsersService.getWalletLogs.mockResolvedValue({ list: [], total: 0 });
    const req = { user: { userId: 7, openid: 'o', role: 'USER' } };
    const query = { page: 2, pageSize: 20 };
    const result = await controller.walletLogs(req as never, query);
    expect(mockUsersService.getWalletLogs).toHaveBeenCalledWith(7, 2, 20);
    expect(result).toEqual({ list: [], total: 0 });
  });
});
