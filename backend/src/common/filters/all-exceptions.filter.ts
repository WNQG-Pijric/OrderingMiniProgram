import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BizException } from '../exceptions/biz.exception';
import { ErrorCode, ErrorCodeValue } from '../errors';

/**
 * 全局异常过滤器：所有异常统一转为 `{ code, message, data: null }`。
 *
 * - BizException：业务错误，HTTP 200 + 业务 code。
 * - 其他 HttpException（Nest 框架异常）：保留 HTTP 状态，code 按语义映射。
 * - 未预期异常：兜底 50000，记录日志。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    // 业务异常
    if (exception instanceof BizException) {
      const resp = exception.getResponse() as {
        code: number;
        message: string;
        data: null;
      };
      res.status(HttpStatus.OK).json(resp);
      return;
    }

    // Nest 框架 HttpException（校验失败、路由未找到、401 等）
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const rawMessage =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join('；')
        : rawMessage;
      const code = this.mapHttpStatusToCode(status);
      res.status(status).json({
        code,
        message: message ?? this.defaultMessage(code),
        data: null,
      });
      return;
    }

    // 未预期异常：兜底
    this.logger.error('未捕获异常', exception as Error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ErrorCode.SYSTEM_ERROR,
      message: '系统内部错误',
      data: null,
    });
  }

  /** HTTP 状态 → 业务错误码 */
  private mapHttpStatusToCode(status: HttpStatus): ErrorCodeValue {
    if (status === HttpStatus.UNAUTHORIZED) return ErrorCode.TOKEN_EXPIRED;
    if (status === HttpStatus.FORBIDDEN) return ErrorCode.FORBIDDEN;
    if (status === HttpStatus.NOT_FOUND) return ErrorCode.ROUTE_NOT_FOUND;
    if (
      status === HttpStatus.BAD_REQUEST ||
      status === HttpStatus.PAYLOAD_TOO_LARGE ||
      status === HttpStatus.UNPROCESSABLE_ENTITY
    ) {
      return ErrorCode.PARAM_ERROR;
    }
    return ErrorCode.SYSTEM_ERROR;
  }

  private defaultMessage(code: ErrorCodeValue): string {
    switch (code) {
      case ErrorCode.TOKEN_EXPIRED:
        return 'token 过期或无效';
      case ErrorCode.FORBIDDEN:
        return '无权限访问';
      case ErrorCode.ROUTE_NOT_FOUND:
        return '接口不存在';
      case ErrorCode.PARAM_ERROR:
        return '参数错误';
      default:
        return '系统内部错误';
    }
  }
}
