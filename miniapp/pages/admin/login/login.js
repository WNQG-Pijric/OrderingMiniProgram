// 管理员登录（模块 03：账号密码 → admin JWT）
const admin = require('../../../utils/admin');

Page({
  data: {
    username: '',
    password: '',
    loading: false,
    showPwd: false, // 密码可见切换
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  togglePwd() {
    this.setData({ showPwd: !this.data.showPwd });
  },

  onLogin() {
    const { username, password } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    admin
      .login(username, password)
      .then(() => {
        this.setData({ loading: false });
        wx.showToast({ title: '登录成功', icon: 'success' });
        // 重定向到菜单管理（避免返回键回到登录页）
        wx.redirectTo({ url: '/pages/admin/menu/menu' });
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || '登录失败', icon: 'none' });
      });
  },
});
