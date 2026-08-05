import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

/** 通过 UserGuard 后的请求：req.user 为 JWT 载荷（userId / openid / role） */
export interface AuthRequest extends Request {
  user: JwtPayload;
}
