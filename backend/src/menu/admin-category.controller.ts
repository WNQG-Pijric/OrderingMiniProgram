import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { MenuService } from './menu.service';

/** 管理端分类接口：全部走 AdminGuard */
@ApiTags('admin-category')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/category')
export class AdminCategoryController {
  constructor(private readonly menuService: MenuService) {}

  @ApiOperation({ summary: '分类列表（含停用）' })
  @Get()
  list() {
    return this.menuService.listAllCategories();
  }

  @ApiOperation({ summary: '新增分类' })
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @ApiOperation({ summary: '修改分类' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(id, dto);
  }

  @ApiOperation({ summary: '删除分类（软删除 = 置停用）' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.deleteCategory(id);
  }
}
