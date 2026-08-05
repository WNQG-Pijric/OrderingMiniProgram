import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/errors';

/**
 * 用户守卫：校验 Bearer accessToken。
 * 失败统一返回 40101（未登录 / token 过期或无效）。
 */
@Injectable()
export class UserGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: unknown): TUser {
    if (err || !user) {
      throw new BizException(
        ErrorCode.TOKEN_EXPIRED,
        err ? 'token 无效' : '未登录或登录已过期',
      );
    }
    return user as TUser;
  }
}
