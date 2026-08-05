// 管理端请求封装：自动附加 admin token；
// 40101/20001（token 失效）→ 清登录态跳回管理员登录页。
const { BASE_URL } = require('./config');
const admin = require('./admin');

/**
 * @param {object} options
 * @param {string} options.url 请求路径（相对路径自动拼接 BASE_URL）
 * @param {'GET'|'POST'|'PUT'|'DELETE'} [options.method]
 * @param {object} [options.data]
 */
function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: options.url.startsWith('http')
        ? options.url
        : `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(admin.getAdminToken()
          ? { Authorization: `Bearer ${admin.getAdminToken()}` }
          : {}),
      },
      success: (resp) => {
        const body = resp.data;
        if (body && body.code === 0) {
          resolve(body.data);
        } else if (body && (body.code === 40101 || body.code === 20001)) {
          // token 失效：清登录态，跳回登录页重新登录
          admin.clearAdmin();
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          setTimeout(
            () => wx.redirectTo({ url: '/pages/admin/login/login' }),
            800,
          );
          reject(new Error(body.message));
        } else {
          reject(new Error((body && body.message) || '请求失败'));
        }
      },
      fail: reject,
    });
  });
}

module.exports = { request };
