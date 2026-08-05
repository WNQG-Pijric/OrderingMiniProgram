import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  let service: MenuService;

  const mockPrisma = {
    menuCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    menu: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    menuSpecGroup: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    menuSpecItem: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  /** 构造分类 */
  const buildCategory = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    name: '奶茶',
    sort: 0,
    status: 1,
    createdAt: new Date('2026-08-05T00:00:00Z'),
    updatedAt: new Date('2026-08-05T00:00:00Z'),
    ...overrides,
  });

  /** 构造规格项（priceDelta 用真实 Prisma.Decimal） */
  const buildSpecItem = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    groupId: 1,
    name: '半糖',
    priceDelta: new Prisma.Decimal('1.00'),
    sort: 0,
    status: 1,
    ...overrides,
  });

  /** 构造规格组（含 items 层级） */
  const buildSpecGroup = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    menuId: 1,
    name: '甜度',
    sort: 0,
    status: 1,
    items: [buildSpecItem()],
    ...overrides,
  });

  /** 构造菜品（price 用真实 Prisma.Decimal，含 specGroups 层级） */
  const buildMenu = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    categoryId: 1,
    name: '珍珠奶茶',
    description: null,
    image: null,
    price: new Prisma.Decimal('10.00'),
    sales: 0,
    stock: 100,
    status: 1,
    isSpec: true,
    sort: 0,
    createdAt: new Date('2026-08-05T00:00:00Z'),
    updatedAt: new Date('2026-08-05T00:00:00Z'),
    deletedAt: null,
    specGroups: [buildSpecGroup()],
    ...overrides,
  });

  /** 交互式事务：$transaction(callback) → 用同一 mock 对象充当 tx */
  const mockTransaction = () => {
    mockPrisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: typeof mockPrisma) => unknown)(mockPrisma)
        : Promise.all(arg as Promise<unknown>[]),
    );
  };

  /** 单测辅助：取出某次 mock 调用的第一个参数并断言为对象 */
  const firstCallArg = (fn: jest.Mock): Record<string, unknown> =>
    (fn.mock.calls[0] as [Record<string, unknown>])[0];

  beforeEach(async () => {
    jest.resetAllMocks();
    mockTransaction();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  describe('listCategories（用户端分类）', () => {
    it('只返回启用分类（status=1），按 sort 升序', async () => {
      // mock 按 service 排序后的结果返回（查询参数断言见下）
      mockPrisma.menuCategory.findMany.mockResolvedValue([
        buildCategory({ id: 1, name: '奶茶', sort: 0 }),
        buildCategory({ id: 2, name: '小食', sort: 1 }),
      ]);

      const result = await service.listCategories();

      expect(mockPrisma.menuCategory.findMany).toHaveBeenCalledWith({
        where: { status: 1 },
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      });
      expect(result).toEqual([
        { id: 1, name: '奶茶', sort: 0 },
        { id: 2, name: '小食', sort: 1 },
      ]);
      // 不暴露 status 之外的管理字段
      expect(result[0]).not.toHaveProperty('createdAt');
    });
  });

  describe('listMenus（用户端菜品列表）', () => {
    it('不带 categoryId：只返回上架未删除且所属分类启用的菜品', async () => {
      mockPrisma.menu.findMany.mockResolvedValue([
        buildMenu(),
        buildMenu({
          id: 2,
          price: new Prisma.Decimal('12.00'),
          isSpec: false,
          specGroups: [],
        }),
      ]);

      const result = await service.listMenus();

      expect(mockPrisma.menu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 1, deletedAt: null, category: { status: 1 } },
        }),
      );
      // 金额保留两位小数；含规格层级与 price_delta
      expect(result[0].price).toBe('10.00');
      expect(result[0].specGroups[0].name).toBe('甜度');
      expect(result[0].specGroups[0].items[0].priceDelta).toBe('1.00');
      expect(result[1].price).toBe('12.00');
      expect(result[1].specGroups).toEqual([]);
    });

    it('带 categoryId：按分类过滤且仍要求分类启用（与详情规则一致）', async () => {
      mockPrisma.menu.findMany.mockResolvedValue([buildMenu()]);

      await service.listMenus(1);

      expect(mockPrisma.menu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 1,
            deletedAt: null,
            category: { status: 1 },
            categoryId: 1,
          },
        }),
      );
    });

    it('用户端只展示启用状态的规格组 / 规格项（include where 生效）', async () => {
      mockPrisma.menu.findMany.mockResolvedValue([buildMenu()]);
      await service.listMenus();

      const include = firstCallArg(mockPrisma.menu.findMany).include as {
        specGroups: {
          where?: unknown;
          include: { items: { where?: unknown } };
        };
      };
      expect(include.specGroups.where).toEqual({ status: 1 });
      expect(include.specGroups.include.items.where).toEqual({ status: 1 });
    });
  });

  describe('getMenu（用户端详情）', () => {
    it('返回菜品详情（含规格与金额格式化）', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu());

      const result = await service.getMenu(1);

      const findArg = firstCallArg(mockPrisma.menu.findFirst) as {
        where: Record<string, unknown>;
        include: Record<string, unknown>;
      };
      expect(findArg.where).toEqual({
        id: 1,
        status: 1,
        deletedAt: null,
        category: { status: 1 },
      });
      expect(findArg.include).toBeDefined();
      expect(result.name).toBe('珍珠奶茶');
      expect(result.price).toBe('10.00');
      expect(result.specGroups[0].items[0].priceDelta).toBe('1.00');
    });

    it('不存在 / 已删除 / 已下架 / 分类停用 → 31002', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(null);
      await expect(service.getMenu(999)).rejects.toMatchObject({
        response: { code: ErrorCode.MENU_NOT_FOUND },
      });
    });
  });

  describe('分类管理（管理端）', () => {
    it('listAllCategories：返回全部分类（含停用）', async () => {
      mockPrisma.menuCategory.findMany.mockResolvedValue([
        buildCategory(),
        buildCategory({ id: 2, status: 0 }),
      ]);
      const result = await service.listAllCategories();
      expect(result).toHaveLength(2);
      expect(result[1].status).toBe(0);
    });

    it('createCategory：创建分类', async () => {
      mockPrisma.menuCategory.create.mockResolvedValue(buildCategory());
      await service.createCategory({ name: '奶茶', sort: 1, status: 1 });
      expect(mockPrisma.menuCategory.create).toHaveBeenCalledWith({
        data: { name: '奶茶', sort: 1, status: 1 },
      });
    });

    it('updateCategory：分类不存在 → 31001（不落库）', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(null);
      await expect(
        service.updateCategory(999, { name: '新分类' }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.CATEGORY_NOT_FOUND },
      });
      expect(mockPrisma.menuCategory.update).not.toHaveBeenCalled();
    });

    it('updateCategory：逐字段更新（不覆盖未传字段）', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(buildCategory());
      mockPrisma.menuCategory.update.mockResolvedValue(buildCategory());

      await service.updateCategory(1, { name: '新奶茶' });

      expect(mockPrisma.menuCategory.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: '新奶茶' },
      });
    });

    it('deleteCategory：置 status=0 停用（等效软删除，数据保留）', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(buildCategory());
      mockPrisma.menuCategory.update.mockResolvedValue(buildCategory());

      await service.deleteCategory(1);

      expect(mockPrisma.menuCategory.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 0 },
      });
    });
  });

  describe('菜品管理（管理端）', () => {
    it('listAdminMenus：分页 + 状态 / 关键字过滤，含下架菜品', async () => {
      mockPrisma.menu.findMany.mockResolvedValue([
        buildMenu({ status: 0 }),
        buildMenu({ id: 2 }),
      ]);
      mockPrisma.menu.count.mockResolvedValue(2);

      const result = await service.listAdminMenus({
        page: 1,
        pageSize: 10,
        status: 0,
        keyword: '奶茶',
      });

      expect(mockPrisma.menu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, status: 0, name: { contains: '奶茶' } },
          skip: 0,
          take: 10,
        }),
      );
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      // 管理端可见下架菜品
      expect(result.list[0].status).toBe(0);
    });

    it('getAdminMenu：未软删除的菜品可回显（含停用规格）', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu());
      const result = await service.getAdminMenu(1);
      expect(result.name).toBe('珍珠奶茶');
      // 管理端 include 不过滤停用规格
      const include = firstCallArg(mockPrisma.menu.findFirst).include as {
        specGroups: { where?: unknown };
      };
      expect(include.specGroups.where).toBeUndefined();
    });

    it('getAdminMenu：已软删除 → 31002', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(null);
      await expect(service.getAdminMenu(999)).rejects.toMatchObject({
        response: { code: ErrorCode.MENU_NOT_FOUND },
      });
    });

    it('createMenu：分类不存在 → 31001（不创建）', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(null);
      await expect(
        service.createMenu({ categoryId: 999, name: 'x', price: 10 }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.CATEGORY_NOT_FOUND },
      });
      expect(mockPrisma.menu.create).not.toHaveBeenCalled();
    });

    it('createMenu：同一事务内创建菜品 + 规格组 / 项，isSpec 自动推断', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(buildCategory());
      mockPrisma.menu.create.mockResolvedValue(buildMenu());
      mockPrisma.menuSpecGroup.create.mockResolvedValue(buildSpecGroup());
      mockPrisma.menuSpecItem.create.mockResolvedValue(buildSpecItem());
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu());

      await service.createMenu({
        categoryId: 1,
        name: '珍珠奶茶',
        price: 10,
        stock: 100,
        specGroups: [
          {
            name: '甜度',
            items: [{ name: '半糖', priceDelta: 1 }],
          },
        ],
      });

      // 交互式事务（callback 形式）内写入
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      const createArg = firstCallArg(mockPrisma.menu.create) as {
        data: Record<string, unknown>;
      };
      expect(createArg.data).toMatchObject({
        categoryId: 1,
        name: '珍珠奶茶',
        price: 10,
        stock: 100,
        status: 1,
        // 有规格组 → isSpec 自动为 true
        isSpec: true,
        sort: 0,
      });
      expect(mockPrisma.menuSpecGroup.create).toHaveBeenCalledWith({
        data: { menuId: 1, name: '甜度', sort: 0, status: 1 },
      });
      expect(mockPrisma.menuSpecItem.create).toHaveBeenCalledWith({
        data: {
          groupId: 1,
          name: '半糖',
          priceDelta: 1,
          sort: 0,
          status: 1,
        },
      });
    });

    it('createMenu：无规格组 → isSpec=false', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(buildCategory());
      mockPrisma.menu.create.mockResolvedValue(buildMenu({ isSpec: false }));
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu({ isSpec: false }));

      await service.createMenu({ categoryId: 1, name: '白开水', price: 1 });

      const createArg = firstCallArg(mockPrisma.menu.create) as {
        data: Record<string, unknown>;
      };
      expect(createArg.data).toMatchObject({ isSpec: false });
      expect(mockPrisma.menuSpecGroup.create).not.toHaveBeenCalled();
    });

    it('updateMenu：菜品不存在 → 31002', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(null);
      await expect(
        service.updateMenu(999, { name: '新名字' }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.MENU_NOT_FOUND },
      });
      expect(mockPrisma.menu.update).not.toHaveBeenCalled();
    });

    it('updateMenu：不传 specGroups → 只更新字段，不触碰规格', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu());
      mockPrisma.menu.update.mockResolvedValue(buildMenu());
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu());

      await service.updateMenu(1, { name: '新珍珠奶茶', price: 12 });

      expect(mockPrisma.menu.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: '新珍珠奶茶', price: 12 },
      });
      expect(mockPrisma.menuSpecGroup.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.menuSpecGroup.create).not.toHaveBeenCalled();
    });

    it('updateMenu：传 specGroups → 全量替换（先删后建，同一事务）', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu());
      mockPrisma.menu.update.mockResolvedValue(buildMenu());
      mockPrisma.menuSpecGroup.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.menuSpecGroup.create.mockResolvedValue(buildSpecGroup());
      mockPrisma.menuSpecItem.create.mockResolvedValue(buildSpecItem());

      await service.updateMenu(1, {
        specGroups: [{ name: '温度', items: [{ name: '少冰' }] }],
      });

      expect(mockPrisma.menuSpecGroup.deleteMany).toHaveBeenCalledWith({
        where: { menuId: 1 },
      });
      expect(mockPrisma.menuSpecGroup.create).toHaveBeenCalledWith({
        data: { menuId: 1, name: '温度', sort: 0, status: 1 },
      });
      expect(mockPrisma.menuSpecItem.create).toHaveBeenCalled();
    });

    it('updateMenu：传空规格组列表 → isSpec 自动同步为 false', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu());
      // update 返回的 isSpec=true（原值）与推断 false 不一致 → 触发二次同步
      mockPrisma.menu.update.mockResolvedValue(buildMenu());
      mockPrisma.menuSpecGroup.deleteMany.mockResolvedValue({ count: 1 });

      await service.updateMenu(1, { specGroups: [] });

      // 第二次 update：同步 isSpec
      const updateArg = firstCallArg(mockPrisma.menu.update);
      expect(mockPrisma.menu.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isSpec: false },
      });
      expect(updateArg).toBeDefined();
    });

    it('updateMenu：分类变更时校验新分类存在', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu());
      mockPrisma.menuCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMenu(1, { categoryId: 999 }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.CATEGORY_NOT_FOUND },
      });
      expect(mockPrisma.menu.update).not.toHaveBeenCalled();
    });

    it('deleteMenu：软删除（deletedAt 落时间戳，不物理删除）', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(buildMenu());
      mockPrisma.menu.update.mockResolvedValue(
        buildMenu({ deletedAt: new Date() }),
      );

      await service.deleteMenu(1);

      const updateArg = firstCallArg(mockPrisma.menu.update) as {
        data: { deletedAt?: unknown };
      };
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    });

    it('deleteMenu：已删除菜品 → 31002', async () => {
      mockPrisma.menu.findFirst.mockResolvedValue(null);
      await expect(service.deleteMenu(999)).rejects.toMatchObject({
        response: { code: ErrorCode.MENU_NOT_FOUND },
      });
    });
  });
});
