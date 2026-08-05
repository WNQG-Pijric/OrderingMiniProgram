import { UserRole } from '@prisma/client';

/** JWT 载荷：access / refresh 共用，type 区分令牌用途 */
export interface JwtPayload {
  userId: number;
  openid: string;
  role: UserRole;
  /** access：短期访问令牌；refresh：长期刷新令牌 */
  type: 'access' | 'refresh';
}
