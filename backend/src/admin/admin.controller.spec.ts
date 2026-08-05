import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController（管理员登录）', () => {
  let controller: AdminController;
  const mockAdminService = { login: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();
    controller = module.get<AdminController>(AdminController);
  });

  it('POST /auth/login 透传 DTO → service.login', async () => {
    mockAdminService.login.mockResolvedValue({
      accessToken: 'token',
      admin: { id: 1, username: 'admin' },
    });
    const dto = { username: 'admin', password: 'admin123456' };
    const result = await controller.login(dto);
    expect(mockAdminService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      accessToken: 'token',
      admin: { id: 1, username: 'admin' },
    });
  });
});
