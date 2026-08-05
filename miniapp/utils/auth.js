// 登录与令牌管理：wx.login → /auth/login → Storage 持久化 → 自动刷新
const { BASE_URL } = require('./config');

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

/** 读取 accessToken */
function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || null;
}

/** 读取 refreshToken */
function getRefreshToken() {
  return wx.getStorageSync(REFRESH_KEY) || null;
}

/** 保存令牌（access + refresh） */
function saveTokens(accessToken, refreshToken) {
  wx.setStorageSync(TOKEN_KEY, accessToken);
  wx.setStorageSync(REFRESH_KEY, refreshToken);
}

/** 清除令牌（登出 / 刷新失败时调用） */
function clearTokens() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(REFRESH_KEY);
}

/**
 * 微信登录：wx.login 拿 code → 后端 /auth/login（openid 不存在自动注册）
 * 成功后保存令牌并返回用户信息。
 */
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (!res.code) {
          reject(new Error('wx.login 获取 code 失败'));
          return;
        }
        wx.request({
          url: `${BASE_URL}/auth/login`,
          method: 'POST',
          data: { code: res.code },
          success: (resp) => {
            const body = resp.data;
            if (body && body.code === 0) {
              saveTokens(body.data.accessToken, body.data.refreshToken);
              resolve(body.data.user);
            } else {
              reject(new Error((body && body.message) || '登录失败'));
            }
          },
          fail: reject,
        });
      },
      fail: reject,
    });
  });
}

/**
 * 刷新令牌：refreshToken 换新 accessToken + 新 refreshToken（无状态轮换）。
 * 失败时清除本地令牌（需要重新登录）。
 */
function refresh() {
  return new Promise((resolve, reject) => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      reject(new Error('未登录'));
      return;
    }
    wx.request({
      url: `${BASE_URL}/auth/refresh`,
      method: 'POST',
      data: { refreshToken },
      success: (resp) => {
        const body = resp.data;
        if (body && body.code === 0) {
          saveTokens(body.data.accessToken, body.data.refreshToken);
          resolve(body.data.accessToken);
        } else {
          clearTokens();
          reject(new Error((body && body.message) || '刷新失败'));
        }
      },
      fail: reject,
    });
  });
}

module.exports = {
  login,
  refresh,
  getToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
};
