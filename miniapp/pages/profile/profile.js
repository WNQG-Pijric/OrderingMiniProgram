// 个人中心（模块 02：资料查看 / 修改，钱包入口）
const auth = require('../../utils/auth');
const { request } = require('../../utils/request');

Page({
  data: {
    user: null,
    editing: false,
    nickname: '',
    avatar: '',
    saving: false,
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    // 从钱包页返回时刷新余额
    if (this.data.user) {
      this.loadProfile();
    }
  },

  /** 拉取当前用户资料（未登录跳回首页） */
  loadProfile() {
    if (!auth.getToken()) {
      wx.redirectTo({ url: '/pages/index/index' });
      return;
    }
    request({ url: '/users/profile' })
      .then((user) =>
        this.setData({
          user,
          nickname: user.nickname || '',
          avatar: user.avatar || '',
        })
      )
      .catch((err) => {
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      });
  },

  /** 进入我的钱包 */
  goWallet() {
    wx.navigateTo({ url: '/pages/wallet/wallet' });
  },

  /** 管理员端入口：未登录跳登录页，已登录跳菜单管理 */
  goAdmin() {
    wx.navigateTo({
      url: require('../../utils/admin').getAdminToken()
        ? '/pages/admin/menu/menu'
        : '/pages/admin/login/login',
    });
  },

  /** 进入编辑模式 */
  startEdit() {
    this.setData({
      editing: true,
      nickname: (this.data.user && this.data.user.nickname) || '',
      avatar: (this.data.user && this.data.user.avatar) || '',
    });
  },

  cancelEdit() {
    this.setData({ editing: false });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onAvatarInput(e) {
    this.setData({ avatar: e.detail.value });
  },

  /** 保存资料：昵称 / 头像至少一项 */
  saveProfile() {
    const nickname = this.data.nickname.trim();
    const avatar = this.data.avatar.trim();
    if (!nickname && !avatar) {
      wx.showToast({ title: '至少修改一项', icon: 'none' });
      return;
    }
    const data = {};
    if (nickname) data.nickname = nickname;
    if (avatar) data.avatar = avatar;

    this.setData({ saving: true });
    request({ url: '/users/profile', method: 'PUT', data })
      .then((user) => {
        this.setData({ user, editing: false, saving: false });
        wx.showToast({ title: '保存成功', icon: 'success' });
      })
      .catch((err) => {
        this.setData({ saving: false });
        wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      });
  },
});
