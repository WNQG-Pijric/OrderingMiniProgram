// 首页（模块 03：分类 tab + 菜品列表）
// 顶部公告位预留（模块 09 填充）；首次进入静默登录，未登录也可浏览菜单。
const auth = require('../../utils/auth');
const cart = require('../../utils/cart');
const { request } = require('../../utils/request');

Page({
  data: {
    categories: [],
    activeCategoryId: 0, // 0 = 全部
    menus: [],
    loading: false,
    loadError: false, // 菜单加载失败（与"暂无菜品"分开显示）
    cartCount: 0, // 购物车角标（总件数）
  },

  onLoad() {
    this.ensureLogin();
    this.loadCategories();
    this.loadMenus();
  },

  // 从购物车/详情返回首页时刷新角标
  onShow() {
    this.refreshCartCount();
  },

  /** 购物车角标：总件数，超过 99 显示 99+ */
  refreshCartCount() {
    this.setData({ cartCount: cart.getCount() });
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
    this.setData({ loading: true, loadError: false });
    request({
      url: '/menu/list',
      // 数字 0 = 全部，不传 categoryId；>0 才按分类过滤（字符串 "0" 是 truthy，必须显式比较）
      data: categoryId > 0 ? { categoryId } : {},
    })
      .then((menus) => this.setData({ menus, loading: false }))
      .catch(() => this.setData({ loading: false, loadError: true }));
  },

  /** 加载失败重试 */
  retryMenus() {
    this.loadMenus(this.data.activeCategoryId);
  },

  /** 切换分类 tab（「全部」是静态 data-id="0" 拿到的字符串，统一 Number 后比较） */
  onCategoryTap(e) {
    const id = Number(e.currentTarget.dataset.id);
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

  /** 购物车 */
  goCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },
});
