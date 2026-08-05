import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AdminMenuController } from './admin-menu.controller';
import { MenuService } from './menu.service';

describe('AdminMenuController（管理端菜品）', () => {
  let controller: AdminMenuController;
  const mockMenuService = {
    listAdminMenus: jest.fn(),
    getAdminMenu: jest.fn(),
    createMenu: jest.fn(),
    updateMenu: jest.fn(),
    deleteMenu: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMenuController],
      providers: [{ provide: MenuService, useValue: mockMenuService }],
    })
      // 单测只验证 Controller 转发逻辑，guard 交给验收 / e2e 覆盖
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<AdminMenuController>(AdminMenuController);
  });

  it('GET / 透传查询 DTO → service.listAdminMenus', async () => {
    mockMenuService.listAdminMenus.mockResolvedValue({ list: [], total: 0 });
    const query = { page: 1, pageSize: 10 };
    const result = await controller.list(query);
    expect(mockMenuService.listAdminMenus).toHaveBeenCalledWith(query);
    expect(result).toEqual({ list: [], total: 0 });
  });

  it('GET /:id → service.getAdminMenu(id)', async () => {
    mockMenuService.getAdminMenu.mockResolvedValue({ id: 1 });
    const result = await controller.detail(1);
    expect(mockMenuService.getAdminMenu).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1 });
  });

  it('POST / 透传 DTO → service.createMenu', async () => {
    mockMenuService.createMenu.mockResolvedValue({ id: 9 });
    const dto = { categoryId: 1, name: 'x', price: 10 };
    const result = await controller.create(dto);
    expect(mockMenuService.createMenu).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 9 });
  });

  it('PUT /:id 透传 id + DTO → service.updateMenu', async () => {
    mockMenuService.updateMenu.mockResolvedValue({ id: 9 });
    const dto = { name: 'y' };
    const result = await controller.update(9, dto);
    expect(mockMenuService.updateMenu).toHaveBeenCalledWith(9, dto);
    expect(result).toEqual({ id: 9 });
  });

  it('DELETE /:id → service.deleteMenu(id)', async () => {
    mockMenuService.deleteMenu.mockResolvedValue({ id: 9 });
    const result = await controller.remove(9);
    expect(mockMenuService.deleteMenu).toHaveBeenCalledWith(9);
    expect(result).toEqual({ id: 9 });
  });
});
