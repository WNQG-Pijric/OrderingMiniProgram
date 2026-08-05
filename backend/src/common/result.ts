/** 统一响应结构（docs/README.md「十二」）：`{ code, message, data }` */
export interface Result<T> {
  code: number;
  message: string;
  data: T;
}

/** 成功响应 */
export function ok<T>(data: T): Result<T> {
  return { code: 0, message: 'success', data };
}
