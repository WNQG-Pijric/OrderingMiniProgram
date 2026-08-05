import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth-request.interface';
import { UserGuard } from '../auth/guards/user.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { WalletLogsQueryDto } from './dto/wallet-logs-query.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: '查看自己的资料与余额' })
  @Get('profile')
  profile(@Req() req: AuthRequest) {
    return this.usersService.getProfile(req.user.userId);
  }

  @ApiOperation({ summary: '修改昵称 / 头像' })
  @Put('profile')
  updateProfile(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @ApiOperation({ summary: '钱包余额' })
  @Get('wallet')
  wallet(@Req() req: AuthRequest) {
    return this.usersService.getWallet(req.user.userId);
  }

  @ApiOperation({ summary: '钱包流水（分页，按时间倒序）' })
  @Get('wallet/logs')
  walletLogs(@Req() req: AuthRequest, @Query() query: WalletLogsQueryDto) {
    return this.usersService.getWalletLogs(
      req.user.userId,
      query.page,
      query.pageSize,
    );
  }
}
