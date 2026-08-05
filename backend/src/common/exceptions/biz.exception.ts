import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodeValue, ErrorMessage } from '../errors';

/**
 * 业务异常。
 *
 * - 抛出后由全局异常过滤器统一转为 `{ code, message, data: null }`。
 * - 业务错误统一 HTTP 200，前端只依据 body.code 判断，保证解析路径单一。
 */
export class BizException extends HttpException {
  constructor(code: ErrorCodeValue, message?: string) {
    super(
      { code, message: message ?? ErrorMessage[code], data: null },
      HttpStatus.OK,
    );
  }
}
