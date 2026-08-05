import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/errors';
import { JwtPayload } from '../jwt-payload.interface';

/**
 * 用户守卫：解析 Authorization: Bearer <accessToken>。
 * - 未携带 token → 20001 未登录
 * - token 无效 / 过期 / 类型非 access → 40101 token 过期或无效
 * 校验通过后把 JWT 载荷写入 req.user。
 */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();

    const token = this.extractToken(req.headers.authorization);
    if (!token) {
      throw new BizException(ErrorCode.UNAUTHORIZED, '未登录');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      if (payload.type !== 'access') {
        throw new Error('token 类型不合法');
      }
      req.user = payload;
    } catch {
      throw new BizException(ErrorCode.TOKEN_EXPIRED, 'token 无效或已过期');
    }
    return true;
  }

  /** 从 Authorization header 提取 Bearer token */
  private extractToken(header?: string): string | null {
    if (!header || !header.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length).trim();
    return token || null;
  }
}
