import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';

/** 微信接口封装：小程序 code 换取 openid（code2Session） */
@Injectable()
export class WechatService {
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
      const resp = await fetch(url);
      data = (await resp.json()) as typeof data;
    } catch {
      throw new BizException(ErrorCode.WECHAT_API_ERROR, '微信服务调用失败');
    }

    if (!data.openid) {
      throw new BizException(
        ErrorCode.INVALID_CREDENTIALS,
        data.errmsg ? `登录凭证无效：${data.errmsg}` : '登录凭证无效',
      );
    }
    return data.openid;
  }
}
