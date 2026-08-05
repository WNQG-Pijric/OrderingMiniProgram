// 统一请求封装：
// - 自动附加 Authorization: Bearer <accessToken>
// - 收到业务码 40101（token 失效）时自动刷新并重试一次
// - 业务成功 resolve(body.data)；失败 reject(new Error(body.message))
const { BASE_URL } = require('./config');
const auth = require('./auth');
const { cleanQuery, cleanBody } = require('./params');

/**
 * @param {object} options
 * @param {string} options.url 请求路径（相对路径自动拼接 BASE_URL）
 * @param {'GET'|'POST'|'PUT'|'DELETE'} [options.method]
 * @param {object} [options.data]
 * @param {object} [options.header]
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const doRequest = (retried) => {
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
          ...(auth.getToken()
            ? { Authorization: `Bearer ${auth.getToken()}` }
            : {}),
          ...(options.header || {}),
        },
        success: (resp) => {
          const body = resp.data;
          // token 失效：刷新后重试一次
          if (!retried && body && body.code === 40101) {
            auth
              .refresh()
              .then(() => doRequest(true))
              .catch(reject);
            return;
          }
          if (body && body.code === 0) {
            resolve(body.data);
          } else {
            reject(new Error((body && body.message) || '请求失败'));
          }
        },
        fail: reject,
      });
    };
    doRequest(false);
  });
}

module.exports = { request };
