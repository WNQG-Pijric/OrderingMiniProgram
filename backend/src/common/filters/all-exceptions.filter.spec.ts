import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BizException } from '../exceptions/biz.exception';
import { ErrorCode } from '../errors';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  const buildRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });
  const buildHost = (res: ReturnType<typeof buildRes>): ArgumentsHost =>
    ({
      switchToHttp: () => ({ getResponse: () => res }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('BizException → HTTP 200 + 业务 code/message/data:null', () => {
    const res = buildRes();
    filter.catch(
      new BizException(ErrorCode.INSUFFICIENT_BALANCE),
      buildHost(res),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      code: 40001,
      message: '余额不足',
      data: null,
    });
  });

  it('BizException 自定义 message 生效', () => {
    const res = buildRes();
    filter.catch(
      new BizException(ErrorCode.TOKEN_EXPIRED, 'refreshToken 无效或已过期'),
      buildHost(res),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'refreshToken 无效或已过期' }),
    );
  });

  it('BadRequestException（参数校验失败）→ HTTP 400 + 10001', () => {
    const res = buildRes();
    filter.catch(new BadRequestException('code 不能为空'), buildHost(res));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 10001 }),
    );
  });

  it('UnauthorizedException → HTTP 401 + 40101', () => {
    const res = buildRes();
    filter.catch(new UnauthorizedException(), buildHost(res));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 40101 }),
    );
  });

  it('NotFoundException → HTTP 404 + 10003', () => {
    const res = buildRes();
    filter.catch(new NotFoundException('Cannot GET /x'), buildHost(res));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 10003 }),
    );
  });

  it('未预期异常 → HTTP 500 + 50000 系统内部错误', () => {
    const res = buildRes();
    filter.catch(new Error('boom'), buildHost(res));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 50000 }),
    );
  });
});
