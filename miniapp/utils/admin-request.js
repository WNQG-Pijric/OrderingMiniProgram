// 管理端请求封装：自动附加 admin token；
// 40101/20001（token 失效）→ 清登录态跳回管理员登录页。
const { BASE_URL } = require('./config');
const admin = require('./admin');
const { cleanQuery, cleanBody } = require('./params');

/**
 * @param {object} options
 * @param {string} options.url 请求路径（相对路径自动拼接 BASE_URL）
 * @param {'GET'|'POST'|'PUT'|'DELETE'} [options.method]
 * @param {object} [options.data]
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const method = (options.method || 'GET').toUpperCase();
    wx.request({
      url: options.url.startsWith('http')
        ? options.url
        : `${BASE_URL}${options.url}`,
      method,
      // GET/DELETE 走 query 清理；POST/PUT 走 body 清理（保留 null 语义）
      data: method === 'GET' || method === 'DELETE'
        ? cleanQuery(options.data)
        : cleanBody(options.data),
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
          // 挂业务错误码（如 31002 菜品不存在），供调用方区分业务错误与网络失败
          const err = new Error((body && body.message) || '请求失败');
          if (body && typeof body.code === 'number') err.code = body.code;
          reject(err);
        }
      },
      fail: reject,
    });
  });
}

module.exports = { request };
