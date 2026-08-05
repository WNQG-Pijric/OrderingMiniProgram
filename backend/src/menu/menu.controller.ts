import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuListQueryDto } from './dto/menu-list-query.dto';
import { MenuService } from './menu.service';

/** 用户端菜单接口：公开浏览（无需登录），只返回上架且未软删除的数据 */
@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @ApiOperation({ summary: '分类列表（只含启用分类）' })
  @Get('categories')
  categories() {
    return this.menuService.listCategories();
  }

  @ApiOperation({ summary: '菜品列表（含规格，可选 category_id 过滤）' })
  @Get('list')
  list(@Query() query: MenuListQueryDto) {
    return this.menuService.listMenus(query.categoryId);
  }

  @ApiOperation({ summary: '菜品详情（含规格信息）' })
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.getMenu(id);
  }
}
