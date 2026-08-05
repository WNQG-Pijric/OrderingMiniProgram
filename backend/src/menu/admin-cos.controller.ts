import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CosService } from '../cos/cos.service';

/** 管理端 COS 临时密钥接口：小程序端直传图片前先取 STS */
@ApiTags('admin-cos')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/cos')
export class AdminCosController {
  constructor(private readonly cosService: CosService) {}

  @ApiOperation({ summary: '获取 COS 临时密钥（图片直传）' })
  @Get('sts')
  sts() {
    return this.cosService.getSts();
  }
}
