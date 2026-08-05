import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getCredential } from 'qcloud-cos-sts';
import { ErrorCode } from '../common/errors';
import { CosService } from './cos.service';

// mock COS STS SDK：getPolicy 只负责拼 policy，getCredential 是实际调用点。
// getPolicy 用普通函数而非 jest.fn(impl)：beforeEach 的 resetAllMocks 会清空 jest.fn 实现，
// 导致 policy 返回 undefined。
jest.mock('qcloud-cos-sts', () => ({
  getPolicy: (
    scopes: Array<{
      action: string;
      bucket: string;
      region: string;
      prefix: string;
    }>,
  ) => ({
    version: '2.0',
    statement: [
      {
        action: scopes[0].action,
        effect: 'allow',
        principal: { qcs: '*' },
        resource: `qcs::cos:${scopes[0].region}:*:${scopes[0].bucket}/${scopes[0].prefix}*`,
      },
    ],
  }),
  getCredential: jest.fn(),
}));

describe('CosService', () => {
  let service: CosService;
  const mockConfig = { get: jest.fn() };

  const configValues: Record<string, string | undefined> = {
    COS_SECRET_ID: 'AKIDxxx',
    COS_SECRET_KEY: 'secret-key',
    COS_BUCKET: 'restaurant-1250000000',
    COS_REGION: 'ap-shanghai',
    COS_ALLOW_PREFIX: 'menu/',
  };

  /** 构造 STS 返回的临时凭据 */
  const buildCredential = () => ({
    startTime: 1700000000,
    expiredTime: 1700001800,
    credentials: {
      tmpSecretId: 'tmp-akid',
      tmpSecretKey: 'tmp-secret',
      sessionToken: 'token-xxx',
    },
    requestId: 'req-1',
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfig.get.mockImplementation((key: string) => configValues[key]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [CosService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();
    service = module.get<CosService>(CosService);
  });

  it('COS 未配置（缺 SecretId）→ 50002 文件上传失败', async () => {
    mockConfig.get.mockImplementation((key: string) =>
      key === 'COS_SECRET_ID' ? undefined : configValues[key],
    );
    await expect(service.getSts()).rejects.toMatchObject({
      response: { code: ErrorCode.UPLOAD_FAILED },
    });
    expect(getCredential).not.toHaveBeenCalled();
  });

  it('正常签发：policy 仅授予 PutObject 且限定前缀，返回小程序直传所需字段', async () => {
    (getCredential as jest.Mock).mockResolvedValue(buildCredential());

    const result = await service.getSts();

    // 密钥只读，不落库不回传
    expect(getCredential).toHaveBeenCalledWith({
      secretId: 'AKIDxxx',
      secretKey: 'secret-key',
      region: 'ap-shanghai',
      policy: {
        version: '2.0',
        statement: [
          {
            action: 'name/cos:PutObject',
            effect: 'allow',
            principal: { qcs: '*' },
            resource: 'qcs::cos:ap-shanghai:*:restaurant-1250000000/menu/*',
          },
        ],
      },
      durationSeconds: 1800,
    });
    expect(result).toEqual({
      tmpSecretId: 'tmp-akid',
      tmpSecretKey: 'tmp-secret',
      sessionToken: 'token-xxx',
      expiredTime: 1700001800,
      bucket: 'restaurant-1250000000',
      region: 'ap-shanghai',
      allowPrefix: 'menu/',
    });
    // 不返回主密钥
    expect(result).not.toHaveProperty('secretId');
    expect(result).not.toHaveProperty('secretKey');
  });

  it('STS 调用失败 → 50002 文件上传失败（异常不外泄）', async () => {
    (getCredential as jest.Mock).mockRejectedValue(new Error('network error'));

    await expect(service.getSts()).rejects.toMatchObject({
      response: { code: ErrorCode.UPLOAD_FAILED },
    });
  });

  it('COS_ALLOW_PREFIX 未配置时默认 menu/', async () => {
    mockConfig.get.mockImplementation((key: string) =>
      key === 'COS_ALLOW_PREFIX' ? undefined : configValues[key],
    );
    (getCredential as jest.Mock).mockResolvedValue(buildCredential());

    const result = await service.getSts();
    expect(result.allowPrefix).toBe('menu/');
  });
});
