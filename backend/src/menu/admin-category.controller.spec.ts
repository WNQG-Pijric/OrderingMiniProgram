import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AdminCategoryController } from './admin-category.controller';
import { MenuService } from './menu.service';

describe('AdminCategoryController（管理端分类）', () => {
  let controller: AdminCategoryController;
  const mockMenuService = {
    listAllCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCategoryController],
      providers: [{ provide: MenuService, useValue: mockMenuService }],
    })
      // 单测只验证 Controller 转发逻辑，guard 交给验收 / e2e 覆盖
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<AdminCategoryController>(AdminCategoryController);
  });

  it('GET / → service.listAllCategories', async () => {
    mockMenuService.listAllCategories.mockResolvedValue([
      { id: 1, name: '奶茶' },
    ]);
    const result = await controller.list();
    expect(mockMenuService.listAllCategories).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1, name: '奶茶' }]);
  });

  it('POST / 透传 DTO → service.createCategory', async () => {
    mockMenuService.createCategory.mockResolvedValue({ id: 3 });
    const dto = { name: '小食' };
    const result = await controller.create(dto);
    expect(mockMenuService.createCategory).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 3 });
  });

  it('PUT /:id 透传 id + DTO → service.updateCategory', async () => {
    mockMenuService.updateCategory.mockResolvedValue({ id: 3 });
    const dto = { name: '新名字' };
    const result = await controller.update(3, dto);
    expect(mockMenuService.updateCategory).toHaveBeenCalledWith(3, dto);
    expect(result).toEqual({ id: 3 });
  });

  it('DELETE /:id → service.deleteCategory(id)', async () => {
    mockMenuService.deleteCategory.mockResolvedValue({ id: 3 });
    const result = await controller.remove(3);
    expect(mockMenuService.deleteCategory).toHaveBeenCalledWith(3);
    expect(result).toEqual({ id: 3 });
  });
});
