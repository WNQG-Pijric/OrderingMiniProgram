import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode } from '../common/errors';
import { WechatService } from './wechat.service';

describe('WechatService', () => {
  let service: WechatService;
  const mockConfig = { get: jest.fn() };
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(async () => {
    jest.resetAllMocks();
    global.fetch = mockFetch;
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'WECHAT_APPID') return 'appid-test';
      if (key === 'WECHAT_SECRET') return 'secret-test';
      return undefined;
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatService,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();
    service = module.get<WechatService>(WechatService);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('未配置 AppID/AppSecret → 50001，不请求微信', async () => {
    mockConfig.get.mockReturnValue(undefined);
    await expect(service.code2Session('code')).rejects.toMatchObject({
      response: { code: ErrorCode.WECHAT_API_ERROR },
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('微信返回 openid → 返回 openid', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ openid: 'openid-ok' }),
    });
    await expect(service.code2Session('code-ok')).resolves.toBe('openid-ok');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('js_code=code-ok');
    expect(url).toContain('appid=appid-test');
  });

  it('微信返回 errcode（code 无效）→ 20002 登录凭证无效', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ errcode: 40029, errmsg: 'invalid code' }),
    });
    await expect(service.code2Session('bad')).rejects.toMatchObject({
      response: { code: ErrorCode.INVALID_CREDENTIALS },
    });
  });

  it('网络异常 → 50001 微信服务调用失败', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));
    await expect(service.code2Session('code')).rejects.toMatchObject({
      response: { code: ErrorCode.WECHAT_API_ERROR },
    });
  });
});
