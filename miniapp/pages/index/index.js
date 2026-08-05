// 首页（模块 01：登录演示 + 个人资料展示）
const auth = require('../../utils/auth');
const { request } = require('../../utils/request');

Page({
  data: {
    user: null,
    loading: false,
  },

  onLoad() {
    this.loadProfile();
  },

  /** 已登录则拉取最新资料 */
  loadProfile() {
    if (!auth.getToken()) return;
    request({ url: '/auth/profile' })
      .then((user) => this.setData({ user }))
      .catch(() => {
        // 刷新失败会清 token，保持未登录态
      });
  },

  /** 微信登录 */
  onLogin() {
    this.setData({ loading: true });
    auth
      .login()
      .then((user) => {
        this.setData({ user, loading: false });
        wx.showToast({ title: '登录成功', icon: 'success' });
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || '登录失败', icon: 'none' });
      });
  },
});
