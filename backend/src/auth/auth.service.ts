import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';
import { WechatService } from './wechat.service';

/** 登录 / 刷新 / 用户信息 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly wechatService: WechatService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 微信登录：code 换 openid，openid 不存在则自动注册。
   * 注册 / 登录同事务：先查 openid，无则创建用户，再签发 Token。
   */
  async login(dto: LoginDto) {
    const openid = await this.wechatService.code2Session(dto.code);
    // upsert：openid 唯一，不存在则自动注册（balance 默认 0，role 默认 USER）
    const user = await this.prisma.user.upsert({
      where: { openid },
      update: {},
      create: { openid },
    });
    this.assertActive(user);
    const tokens = await this.signTokens(user);
    return { ...tokens, user: this.toSafeUser(user) };
  }

  /** 刷新令牌：refreshToken 换新 accessToken + 新 refreshToken（无状态轮换） */
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new BizException(
        ErrorCode.TOKEN_EXPIRED,
        'refreshToken 无效或已过期',
      );
    }
    if (payload.type !== 'refresh') {
      throw new BizException(
        ErrorCode.TOKEN_EXPIRED,
        'refreshToken 无效或已过期',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      throw new BizException(ErrorCode.USER_NOT_FOUND);
    }
    this.assertActive(user);

    const tokens = await this.signTokens(user);
    return { ...tokens, user: this.toSafeUser(user) };
  }

  /** 当前登录用户信息（不含 openid 等敏感字段） */
  async profile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BizException(ErrorCode.USER_NOT_FOUND);
    }
    return this.toSafeUser(user);
  }

  /** 签发 accessToken（2h）+ refreshToken（7d） */
  private async signTokens(user: User) {
    const base = { userId: user.id, openid: user.openid, role: user.role };
    const accessToken = await this.jwtService.signAsync(
      { ...base, type: 'access' as const },
      { secret: this.accessSecret, expiresIn: '2h' },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...base, type: 'refresh' as const },
      { secret: this.refreshSecret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  /** 禁用用户拦截：status = 0 不允许登录 */
  private assertActive(user: { status: number }): void {
    if (user.status !== 1) {
      throw new BizException(ErrorCode.ACCOUNT_DISABLED);
    }
  }

  /** 剔除敏感字段；balance（Decimal）序列化为字符串，避免浮点误差 */
  private toSafeUser(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      balance: user.balance.toString(),
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private get accessSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  private get refreshSecret(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }
}
