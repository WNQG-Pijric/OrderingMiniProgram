import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { inspect } from 'node:util';
import { getCredential, getPolicy } from 'qcloud-cos-sts';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';

/**
 * COS 文件存储服务：签发临时密钥（STS）供小程序直传。
 * 密钥只存后端环境变量；前端仅拿临时密钥 + 限定前缀权限（PutObject）。
 */
@Injectable()
export class CosService {
  private readonly logger = new Logger(CosService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * 获取 COS 临时密钥（有效期 30 分钟）。
   * 权限收敛：仅允许向 `COS_ALLOW_PREFIX`（默认 menu/）前缀执行 PutObject。
   * 返回字段供小程序端 cos-wx-sdk-v5 直传使用。
   */
  async getSts() {
    const secretId = this.config.get<string>('COS_SECRET_ID');
    const secretKey = this.config.get<string>('COS_SECRET_KEY');
    const bucket = this.config.get<string>('COS_BUCKET');
    const region = this.config.get<string>('COS_REGION');
    const allowPrefix = this.config.get<string>('COS_ALLOW_PREFIX') ?? 'menu/';
    if (!secretId || !secretKey || !bucket || !region) {
      throw new BizException(ErrorCode.UPLOAD_FAILED, 'COS 未配置');
    }

    try {
      // 仅授予上传权限：name/cos:PutObject，限定前缀，防止越权读写
      const policy = getPolicy([
        { action: 'name/cos:PutObject', bucket, region, prefix: allowPrefix },
      ]);
      const data = await getCredential({
        secretId,
        secretKey,
        region,
        policy,
        durationSeconds: 1800,
      });
      return {
        tmpSecretId: data.credentials.tmpSecretId,
        tmpSecretKey: data.credentials.tmpSecretKey,
        sessionToken: data.credentials.sessionToken,
        expiredTime: data.expiredTime,
        bucket,
        region,
        allowPrefix,
      };
    } catch (err) {
      this.logger.error(
        `获取 COS 临时密钥失败：${inspect(err, { depth: 3 })}`,
        (err as Error).stack,
      );
      throw new BizException(ErrorCode.UPLOAD_FAILED, '获取上传凭证失败');
    }
  }
}
