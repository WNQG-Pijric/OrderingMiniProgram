import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-payload.interface';

/** accessToken 校验策略：Authorization: Bearer <token> */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * 校验通过后写入 req.user。仅接受 access 类型令牌。
   * refreshToken 被当作 access 使用时在此拒绝。
   */
  validate(payload: JwtPayload): Omit<JwtPayload, 'type'> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('token 类型不合法');
    }
    return {
      userId: payload.userId,
      openid: payload.openid,
      role: payload.role,
    };
  }
}
