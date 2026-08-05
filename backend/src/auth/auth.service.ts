import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';
import { formatMoney } from '../common/money';
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
    this.assertActiveUser(user);
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
    this.assertActiveUser(user);

    const tokens = await this.signTokens(user);
    return { ...tokens, user: this.toSafeUser(user) };
  }

  /** 当前登录用户信息（不含 openid 等敏感字段） */
  async profile(userId: number) {
    const user = await this.findActiveUser(userId);
    return this.toSafeUser(user);
  }

  /**
   * 活跃用户统一查询：存在（含未软删除）→ 否则 30001；
   * status=1 正常 → 否则 20004。auth 与 users 模块共用。
   */
  async findActiveUser(userId: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BizException(ErrorCode.USER_NOT_FOUND);
    }
    this.assertActiveUser(user);
    return user;
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

  /**
   * 用户对象活跃校验（登录 / 刷新 / 查询共用）：
   * 软删除（deletedAt 非空）→ 30001；禁用（status=0）→ 20004。
   */
  private assertActiveUser(user: {
    status: number;
    deletedAt: Date | null;
  }): void {
    if (user.deletedAt) {
      throw new BizException(ErrorCode.USER_NOT_FOUND);
    }
    if (user.status !== 1) {
      throw new BizException(ErrorCode.ACCOUNT_DISABLED);
    }
  }

  /** 剔除敏感字段；balance 保留两位小数返回 */
  private toSafeUser(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      balance: formatMoney(user.balance),
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
