import { INestApplication } from '@nestjs/common';
import { setupApp } from './setup-app';

describe('setupApp', () => {
  it('注册全局校验 / 拦截器 / 异常过滤器', () => {
    const useGlobalPipes = jest.fn();
    const useGlobalInterceptors = jest.fn();
    const useGlobalFilters = jest.fn();
    const app = {
      useGlobalPipes,
      useGlobalInterceptors,
      useGlobalFilters,
    } as unknown as INestApplication;

    setupApp(app);

    expect(useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(useGlobalInterceptors).toHaveBeenCalledTimes(1);
    expect(useGlobalFilters).toHaveBeenCalledTimes(1);
  });
});
