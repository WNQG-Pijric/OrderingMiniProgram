// 首页（模块 03：分类 tab + 菜品列表）
// 顶部公告位预留（模块 09 填充）；首次进入静默登录，未登录也可浏览菜单。
const auth = require('../../utils/auth');
const { request } = require('../../utils/request');

Page({
  data: {
    categories: [],
    activeCategoryId: 0, // 0 = 全部
    menus: [],
    loading: false,
  },

  onLoad() {
    this.ensureLogin();
    this.loadCategories();
    this.loadMenus();
  },

  /** 静默登录：已有 token 跳过，失败不影响浏览菜单 */
  ensureLogin() {
    if (auth.getToken()) return;
    auth.login().catch(() => {});
  },

  /** 分类列表 */
  loadCategories() {
    request({ url: '/menu/categories' })
      .then((categories) => this.setData({ categories }))
      .catch(() => {});
  },

  /** 菜品列表（可按分类过滤） */
  loadMenus(categoryId) {
    this.setData({ loading: true });
    request({
      url: '/menu/list',
      data: categoryId ? { categoryId } : {},
    })
      .then((menus) => this.setData({ menus, loading: false }))
      .catch(() => this.setData({ loading: false }));
  },

  /** 切换分类 tab */
  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.activeCategoryId) return;
    this.setData({ activeCategoryId: id });
    this.loadMenus(id);
  },

  /** 进入菜品详情 */
  goDetail(e) {
    wx.navigateTo({
      url: `/pages/menu/detail?id=${e.currentTarget.dataset.id}`,
    });
  },

  /** 个人中心 */
  goProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },
});
