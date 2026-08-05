// 购物车（模块 04）：本地缓存、按用户隔离、选中结算数据预留给模块 05。
// 侧滑删除本轮降级为按钮删除（真机验证清单已说明）。
const auth = require('../../utils/auth');
const cart = require('../../utils/cart');
const { request } = require('../../utils/request');

// 结算数据暂存 key：模块 05 确认订单页读取
const CHECKOUT_KEY = 'checkout_items';

Page({
  data: {
    items: [],
    selectedKeys: [],
    selectedCount: 0,
    allChecked: false,
    hasItems: false,
    totalPrice: '0.00',
  },

  onShow() {
    this.ensureUser().finally(() => this.render());
  },

  /** 确保有当前 userId：旧安装缺 user 缓存时用 /users/profile 恢复 */
  ensureUser() {
    if (auth.getToken()) {
      if (auth.getUserId()) return Promise.resolve();
      return request({ url: '/users/profile' })
        .then((user) => auth.saveUser(user))
        .catch(() => {});
    }
    return auth.login().catch(() => {});
  },

  /** 重渲染购物车：保留仍存在的选中项，首次进入默认全选 */
  render() {
    const items = cart.getItems().map((item) => {
      const key = `${item.menuId}-${item.specIds.join('-')}`;
      return {
        ...item,
        key,
        lineTotal: cart.computeTotal([item]),
      };
    });
    const existing = this.data.selectedKeys.filter((key) =>
      items.some((item) => item.key === key)
    );
    const selectedKeys =
      existing.length > 0 ? existing : items.map((item) => item.key);
    const decorated = items.map((item) => ({
      ...item,
      checked: selectedKeys.includes(item.key),
    }));
    const selectedItems = items.filter((item) =>
      selectedKeys.includes(item.key)
    );
    this.setData({
      items: decorated,
      selectedKeys,
      selectedCount: selectedKeys.length,
      allChecked: items.length > 0 && selectedKeys.length === items.length,
      hasItems: items.length > 0,
      totalPrice: cart.computeTotal(selectedItems),
    });
  },

  /** 勾选 / 取消单条 */
  onToggleItem(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({
      selectedKeys: this.data.selectedKeys.includes(key)
        ? this.data.selectedKeys.filter((k) => k !== key)
        : this.data.selectedKeys.concat(key),
    });
    this.render();
  },

  /** 全选 / 取消全选 */
  onToggleAll() {
    this.setData({
      selectedKeys: this.data.allChecked
        ? []
        : this.data.items.map((item) => item.key),
    });
    this.render();
  },

  onMinus(e) {
    const item = this.findItem(e.currentTarget.dataset.key);
    if (!item || item.count <= 1) return;
    cart.updateCount(item.menuId, item.specIds, item.count - 1);
    this.render();
  },

  onPlus(e) {
    const item = this.findItem(e.currentTarget.dataset.key);
    if (!item) return;
    cart.updateCount(item.menuId, item.specIds, item.count + 1);
    this.render();
  },

  /** 删除单条 */
  onRemove(e) {
    const item = this.findItem(e.currentTarget.dataset.key);
    if (!item) return;
    wx.showModal({
      title: '删除商品',
      content: `确认删除「${item.menuName}」？`,
      confirmColor: '#ff4d2e',
      success: (res) => {
        if (!res.confirm) return;
        cart.removeItem(item.menuId, item.specIds);
        this.render();
      },
    });
  },

  /** 清空购物车 */
  onClear() {
    if (!this.data.hasItems) return;
    wx.showModal({
      title: '清空购物车',
      content: '确认清空全部商品？',
      confirmColor: '#ff4d2e',
      success: (res) => {
        if (!res.confirm) return;
        cart.clear();
        this.render();
      },
    });
  },

  /** 改规格：写入编辑上下文后跳菜品详情 */
  onEditSpec(e) {
    const item = this.findItem(e.currentTarget.dataset.key);
    if (!item) return;
    cart.setEditItem({
      menuId: item.menuId,
      specIds: item.specIds,
      count: item.count,
      remark: item.remark,
    });
    wx.navigateTo({
      url: `/pages/menu/detail?id=${item.menuId}&edit=1`,
    });
  },

  /** 结算：只传递选中项，确认订单页在模块 05 接入 */
  onCheckout() {
    const { items, selectedKeys } = this.data;
    const selectedItems = items.filter((item) =>
      selectedKeys.includes(item.key)
    );
    if (!selectedItems.length) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    const checkoutItems = selectedItems.map((item) => {
      const copy = Object.assign({}, item);
      delete copy.key;
      delete copy.checked;
      delete copy.lineTotal;
      return copy;
    });
    wx.setStorageSync(CHECKOUT_KEY, checkoutItems);
    wx.showModal({
      title: '已保存结算商品',
      content: '确认订单页将在订单模块接入，本次选择已保留。',
      showCancel: false,
    });
  },

  /** 空状态去点餐 */
  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  findItem(key) {
    return this.data.items.find((item) => item.key === key);
  },
});
