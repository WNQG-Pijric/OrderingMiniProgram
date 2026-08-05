import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserGuard } from './guards/user.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

/** 通过 UserGuard 后的请求：req.user 含 userId / openid / role */
interface AuthRequest extends Request {
  user: { userId: number; openid: string; role: string };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '微信登录（code 换取，openid 不存在则自动注册）' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({
    summary: '刷新令牌（refreshToken 换新 access + 新 refresh）',
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '当前登录用户信息' })
  @UseGuards(UserGuard)
  @Get('profile')
  profile(@Req() req: AuthRequest) {
    return this.authService.profile(req.user.userId);
  }
}
