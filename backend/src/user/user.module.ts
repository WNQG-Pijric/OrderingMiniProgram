import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/** 用户模块：个人资料 / 钱包余额与流水查询 */
@Module({
  imports: [AuthModule], // 复用 UserGuard
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
