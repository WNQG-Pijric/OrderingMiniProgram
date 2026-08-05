import { Test, TestingModule } from '@nestjs/testing';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

describe('MenuController（用户端）', () => {
  let controller: MenuController;
  const mockMenuService = {
    listCategories: jest.fn(),
    listMenus: jest.fn(),
    getMenu: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [{ provide: MenuService, useValue: mockMenuService }],
    }).compile();
    controller = module.get<MenuController>(MenuController);
  });

  it('categories → service.listCategories', async () => {
    mockMenuService.listCategories.mockResolvedValue([{ id: 1, name: '奶茶' }]);
    const result = await controller.categories();
    expect(mockMenuService.listCategories).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1, name: '奶茶' }]);
  });

  it('list 无 categoryId → 透传 undefined', async () => {
    mockMenuService.listMenus.mockResolvedValue([]);
    await controller.list({});
    expect(mockMenuService.listMenus).toHaveBeenCalledWith(undefined);
  });

  it('list 带 categoryId → 透传过滤条件', async () => {
    mockMenuService.listMenus.mockResolvedValue([]);
    await controller.list({ categoryId: 2 });
    expect(mockMenuService.listMenus).toHaveBeenCalledWith(2);
  });

  it('detail → service.getMenu(id)', async () => {
    mockMenuService.getMenu.mockResolvedValue({ id: 1, name: '珍珠奶茶' });
    const result = await controller.detail(1);
    expect(mockMenuService.getMenu).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1, name: '珍珠奶茶' });
  });
});
