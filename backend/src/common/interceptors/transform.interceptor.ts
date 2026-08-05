import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Result } from '../result';

/**
 * 统一响应拦截器：所有成功响应包装为 `{ code: 0, message: 'success', data }`。
 * 错误响应由全局异常过滤器处理，不经过此处。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Result<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<Result<T>> {
    return next
      .handle()
      .pipe(map((data: T) => ({ code: 0, message: 'success', data })));
  }
}
