// 管理员端令牌管理（admin JWT 独立于用户 token 存储）
const { BASE_URL } = require('./config');

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_INFO_KEY = 'admin_info';

/** 读取 admin token */
function getAdminToken() {
  return wx.getStorageSync(ADMIN_TOKEN_KEY) || null;
}

/** 保存登录态 */
function saveAdmin(token, admin) {
  wx.setStorageSync(ADMIN_TOKEN_KEY, token);
  wx.setStorageSync(ADMIN_INFO_KEY, admin);
}

/** 清除登录态（登出） */
function clearAdmin() {
  wx.removeStorageSync(ADMIN_TOKEN_KEY);
  wx.removeStorageSync(ADMIN_INFO_KEY);
}

/** 读取管理员信息 */
function getAdminInfo() {
  return wx.getStorageSync(ADMIN_INFO_KEY) || null;
}

/** 管理员登录：账号密码 → /admin/auth/login */
function login(username, password) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/admin/auth/login`,
      method: 'POST',
      data: { username, password },
      success: (resp) => {
        const body = resp.data;
        if (body && body.code === 0) {
          saveAdmin(body.data.accessToken, body.data.admin);
          resolve(body.data.admin);
        } else {
          reject(new Error((body && body.message) || '登录失败'));
        }
      },
      fail: reject,
    });
  });
}

module.exports = { getAdminToken, saveAdmin, clearAdmin, getAdminInfo, login };
