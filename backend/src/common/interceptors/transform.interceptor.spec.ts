import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('把数据包装为 { code:0, message:"success", data }', (done) => {
    const next = { handle: () => of({ hello: 'world' }) };
    interceptor.intercept({} as never, next as never).subscribe((res) => {
      expect(res).toEqual({
        code: 0,
        message: 'success',
        data: { hello: 'world' },
      });
      done();
    });
  });
});
