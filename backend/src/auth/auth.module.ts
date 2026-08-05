import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserGuard } from './guards/user.guard';
import { WechatService } from './wechat.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, WechatService, UserGuard],
  // 导出供后续模块复用（UserGuard / JwtModule / AuthService）
  exports: [AuthService, UserGuard, JwtModule],
})
export class AuthModule {}
