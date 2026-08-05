import { Request } from 'express';

/** admin JWT 载荷（与用户 JwtPayload 分离，type 区分） */
export interface AdminPayload {
  adminId: number;
  username: string;
  /** admin-access：管理员访问令牌 */
  type: 'admin-access';
}

/** 带 admin 载荷的请求（AdminGuard 校验通过后写入 req.admin） */
export interface AdminRequest extends Request {
  admin?: AdminPayload;
}
