import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../admin/guards/admin.guard';
import { AdminMenuQueryDto } from './dto/admin-menu-query.dto';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuService } from './menu.service';

/** 管理端菜品接口：全部走 AdminGuard */
@ApiTags('admin-menu')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/menu')
export class AdminMenuController {
  constructor(private readonly menuService: MenuService) {}

  @ApiOperation({ summary: '菜品列表（含下架，分页 + 状态 / 关键字过滤）' })
  @Get()
  list(@Query() query: AdminMenuQueryDto) {
    return this.menuService.listAdminMenus(query);
  }

  @ApiOperation({ summary: '菜品详情（编辑回显，含全部规格）' })
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.getAdminMenu(id);
  }

  @ApiOperation({ summary: '新增菜品（含规格组 / 项）' })
  @Post()
  create(@Body() dto: CreateMenuDto) {
    return this.menuService.createMenu(dto);
  }

  @ApiOperation({ summary: '修改菜品（传 specGroups 则全量替换规格）' })
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMenuDto) {
    return this.menuService.updateMenu(id, dto);
  }

  @ApiOperation({ summary: '删除菜品（软删除）' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.deleteMenu(id);
  }
}
