import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';

/** 微信接口封装：小程序 code 换取 openid（code2Session） */
@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * 用 wx.login 的 code 换取 openid。
   * - code 无效 / 过期：抛 INVALID_CREDENTIALS（20002）
   * - 网络或微信服务异常：抛 WECHAT_API_ERROR（50001）
   */
  async code2Session(code: string): Promise<string> {
    const appid = this.config.get<string>('WECHAT_APPID');
    const secret = this.config.get<string>('WECHAT_SECRET');
    if (!appid || !secret) {
      throw new BizException(
        ErrorCode.WECHAT_API_ERROR,
        '微信登录未配置（缺少 AppID/AppSecret）',
      );
    }

    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${encodeURIComponent(appid)}` +
      `&secret=${encodeURIComponent(secret)}` +
      `&js_code=${encodeURIComponent(code)}` +
      '&grant_type=authorization_code';

    let data: { openid?: string; errcode?: number; errmsg?: string };
    try {
      // 微信接口 10s 超时，避免容器挂起；错误详情记日志便于云托管排查
      const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      data = (await resp.json()) as typeof data;
    } catch (err) {
      this.logger.error(
        `code2Session 网络异常：${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new BizException(ErrorCode.WECHAT_API_ERROR, '微信服务调用失败');
    }

    if (!data.openid) {
      // 微信 errmsg 仅记日志，不外泄给前端
      this.logger.warn(
        `code2Session 失败：errcode=${data.errcode ?? '-'} errmsg=${data.errmsg ?? '-'}`,
      );
      throw new BizException(ErrorCode.INVALID_CREDENTIALS, '登录凭证无效');
    }
    return data.openid;
  }
}
