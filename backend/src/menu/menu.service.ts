import { Injectable } from '@nestjs/common';
import { Menu, Prisma } from '@prisma/client';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';
import { formatMoney } from '../common/money';
import { PrismaService } from '../prisma/prisma.service';
import { AdminMenuQueryDto } from './dto/admin-menu-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuDto, CreateSpecGroupDto } from './dto/create-menu.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

/**
 * 菜单模块：分类 / 菜品 / 规格（组 / 项）。
 *
 * 可见性约定：
 * - 用户端只返回「上架（status=1）+ 未软删除 + 所属分类启用」的菜品。
 * - 菜品删除 = 软删除（deletedAt 落时间戳），下架 / 删除不影响历史订单快照。
 * - 分类无 deletedAt 字段（schema 固定），删除 = 置 status=0 停用（等效软删除，
 *   数据保留、历史可追溯），用户端分类列表与菜品列表均自动不可见。
 * - 菜品最终单价 = 基础价 + 所选规格项 price_delta 之和（下单模块服务端重算，
 *   本模块只负责数据维护与展示）。
 */
@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== 用户端 ====================

  /** 分类列表：只返回启用（status=1），按 sort 升序 */
  async listCategories() {
    const categories = await this.prisma.menuCategory.findMany({
      where: { status: 1 },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      sort: c.sort,
    }));
  }

  /**
   * 菜品列表（含规格）：只返回上架且未软删除、所属分类启用的菜品；
   * 带 categoryId 时按分类过滤（与详情 getMenu 的可见性规则一致，防止
   * 分类停用后列表可见但详情 31002 的不一致）。
   */
  async listMenus(categoryId?: number) {
    const where: Prisma.MenuWhereInput = {
      status: 1,
      deletedAt: null,
      category: { status: 1 },
      ...(categoryId !== undefined ? { categoryId } : {}),
    };
    const menus = await this.prisma.menu.findMany({
      where,
      include: this.specInclude(),
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    return menus.map((menu) => this.toMenuView(menu));
  }

  /** 菜品详情（含规格）：不存在 / 已删除 / 已下架 / 分类停用 → 31002 */
  async getMenu(id: number) {
    const menu = await this.prisma.menu.findFirst({
      where: { id, status: 1, deletedAt: null, category: { status: 1 } },
      include: this.specInclude(),
    });
    if (!menu) {
      throw new BizException(ErrorCode.MENU_NOT_FOUND);
    }
    return this.toMenuView(menu);
  }

  // ==================== 管理端：分类 ====================

  /** 管理端分类列表（含停用），按 sort 升序 */
  async listAllCategories() {
    const categories = await this.prisma.menuCategory.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      sort: c.sort,
      status: c.status,
    }));
  }

  /** 新增分类 */
  createCategory(dto: CreateCategoryDto) {
    return this.prisma.menuCategory.create({
      data: {
        name: dto.name,
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
      },
    });
  }

  /** 修改分类：逐字段更新，避免 null 覆盖 */
  async updateCategory(id: number, dto: UpdateCategoryDto) {
    await this.assertCategoryExists(id);
    return this.prisma.menuCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  /**
   * 删除分类：分类无 deletedAt 字段，置 status=0 停用（等效软删除）。
   * 停用后用户端分类列表与菜品列表均不再展示该分类，历史数据保留可追溯。
   */
  async deleteCategory(id: number) {
    await this.assertCategoryExists(id);
    await this.prisma.menuCategory.update({
      where: { id },
      data: { status: 0 },
    });
    return { id };
  }

  // ==================== 管理端：菜品 ====================

  /** 管理端菜品列表（含下架 / 停用规格），分页 + 状态 / 关键字过滤 */
  async listAdminMenus(query: AdminMenuQueryDto) {
    const { page = 1, pageSize = 10, status, keyword } = query;
    const where: Prisma.MenuWhereInput = {
      deletedAt: null,
      ...(status !== undefined ? { status } : {}),
      ...(keyword ? { name: { contains: keyword } } : {}),
    };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.menu.findMany({
        where,
        include: this.specInclude(false),
        orderBy: [{ sort: 'asc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.menu.count({ where }),
    ]);
    return {
      list: list.map((menu) => this.toMenuView(menu)),
      total,
      page,
      pageSize,
    };
  }

  /** 管理端菜品详情（编辑回显，含全部规格）：未软删除，否则 31002 */
  async getAdminMenu(id: number) {
    const menu = await this.prisma.menu.findFirst({
      where: { id, deletedAt: null },
      include: this.specInclude(false),
    });
    if (!menu) {
      throw new BizException(ErrorCode.MENU_NOT_FOUND);
    }
    return this.toMenuView(menu);
  }

  /** 新增菜品（含规格组 / 项），创建与规格写入同一事务 */
  async createMenu(dto: CreateMenuDto) {
    await this.assertCategoryExists(dto.categoryId);
    const isSpec =
      dto.isSpec ?? (dto.specGroups ? dto.specGroups.length > 0 : false);

    const menu = await this.prisma.$transaction(async (tx) => {
      const created = await tx.menu.create({
        data: {
          categoryId: dto.categoryId,
          name: dto.name,
          description: dto.description,
          image: dto.image,
          price: dto.price,
          stock: dto.stock ?? 0,
          status: dto.status ?? 1,
          isSpec,
          sort: dto.sort ?? 0,
        },
      });
      if (dto.specGroups) {
        await this.createSpecGroups(tx, created.id, dto.specGroups);
      }
      return created;
    });
    return this.getAdminMenu(menu.id);
  }

  /**
   * 修改菜品：逐字段更新；传 specGroups 则全量替换规格（先删后建，同一事务），
   * 不传则规格保持不变。
   */
  async updateMenu(id: number, dto: UpdateMenuDto) {
    await this.assertMenuExists(id);
    if (dto.categoryId !== undefined) {
      await this.assertCategoryExists(dto.categoryId);
    }

    const menu = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.menu.update({
        where: { id },
        data: {
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.image !== undefined ? { image: dto.image } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
        },
      });
      if (dto.specGroups !== undefined) {
        // 全量替换：先删旧规格（组级联删除项），再按新数据重建
        await tx.menuSpecGroup.deleteMany({ where: { menuId: id } });
        await this.createSpecGroups(tx, id, dto.specGroups);
        // 规格是否启用随内容自动推断（空规格组列表 → 无规格）
        const isSpec = dto.specGroups.length > 0;
        if (updated.isSpec !== isSpec) {
          await tx.menu.update({ where: { id }, data: { isSpec } });
        }
      }
      return updated;
    });
    return this.getAdminMenu(menu.id);
  }

  /** 删除菜品：软删除（deletedAt），不影响历史订单快照 */
  async deleteMenu(id: number) {
    await this.assertMenuExists(id);
    await this.prisma.menu.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }

  // ==================== 私有方法 ====================

  /** 规格 include（用户端过滤停用规格；管理端可看全部） */
  private specInclude(activeOnly = true) {
    const groupWhere = activeOnly ? { status: 1 } : undefined;
    const itemWhere = activeOnly ? { status: 1 } : undefined;
    return {
      specGroups: {
        where: groupWhere,
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        include: {
          items: {
            where: itemWhere,
            orderBy: [{ sort: 'asc' }, { id: 'asc' }],
          },
        },
      },
    } satisfies Prisma.MenuInclude;
  }

  /** 菜品统一输出：金额转字符串，规格组 / 项层级展开 */
  private toMenuView(menu: Menu & { specGroups: Array<unknown> }) {
    return {
      id: menu.id,
      categoryId: menu.categoryId,
      name: menu.name,
      description: menu.description,
      image: menu.image,
      price: formatMoney(menu.price),
      sales: menu.sales,
      stock: menu.stock,
      status: menu.status,
      isSpec: menu.isSpec,
      sort: menu.sort,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
      specGroups: (menu.specGroups as SpecGroupWithItems[]).map((g) => ({
        id: g.id,
        menuId: g.menuId,
        name: g.name,
        sort: g.sort,
        status: g.status,
        items: g.items.map((i) => ({
          id: i.id,
          groupId: i.groupId,
          name: i.name,
          priceDelta: formatMoney(i.priceDelta),
          sort: i.sort,
          status: i.status,
        })),
      })),
    };
  }

  /** 分类存在校验（管理端操作共用）→ 不存在 31001 */
  private async assertCategoryExists(id: number) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new BizException(ErrorCode.CATEGORY_NOT_FOUND);
    }
  }

  /** 菜品存在校验（未软删除）→ 不存在 31002 */
  private async assertMenuExists(id: number) {
    const menu = await this.prisma.menu.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!menu) {
      throw new BizException(ErrorCode.MENU_NOT_FOUND);
    }
  }

  /** 批量创建规格组 / 项（在菜品创建 / 更新事务内调用） */
  private async createSpecGroups(
    tx: Prisma.TransactionClient,
    menuId: number,
    groups: CreateSpecGroupDto[],
  ) {
    for (const group of groups) {
      const created = await tx.menuSpecGroup.create({
        data: {
          menuId,
          name: group.name,
          sort: group.sort ?? 0,
          status: group.status ?? 1,
        },
      });
      for (const item of group.items ?? []) {
        await tx.menuSpecItem.create({
          data: {
            groupId: created.id,
            name: item.name,
            priceDelta: item.priceDelta ?? 0,
            sort: item.sort ?? 0,
            status: item.status ?? 1,
          },
        });
      }
    }
  }
}

/** 规格组 / 项带层级结构的 Prisma 返回类型 */
interface SpecGroupWithItems {
  id: number;
  menuId: number;
  name: string;
  sort: number;
  status: number;
  items: Array<{
    id: number;
    groupId: number;
    name: string;
    priceDelta: Prisma.Decimal;
    sort: number;
    status: number;
  }>;
}
