import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  // 导出 AdminGuard / JwtModule 供菜单等管理接口复用
  exports: [AdminGuard, JwtModule],
})
export class AdminModule {}
