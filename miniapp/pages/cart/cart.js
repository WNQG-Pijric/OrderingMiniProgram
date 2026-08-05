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
    staleMap: {}, // key -> 过期标记（'已下架' / '库存不足'），本地缓存校验结果
    stockMap: {}, // key -> 校验到的库存快照（加号触顶用）
    validating: false, // 校验进行中：结算按钮拦截，防止未校验状态绕过
  },

  onShow() {
    this.ensureUser().finally(() => {
      this.render();
      this.validateItems();
    });
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
      stale: this.data.staleMap[item.key] || '',
      maxCount: this.data.stockMap[item.key], // 加号触顶（校验未完成时 undefined）
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

  /**
   * 校验本地缓存是否过期（04-cart 关键规则：本地缓存可能过期）：
   * 对每条轻量请求 /menu/:id，已下架 →「已下架」（后端抛 31002），
   * 库存小于数量 →「库存不足」。网络失败不阻塞结算，模块 05 仍服务端重算。
   */
  validateItems() {
    const items = this.data.items;
    if (!items.length) return;
    this.startValidate();
    Promise.all(items.map((item) => this.checkItem(item)))
      .then((results) => {
        this.mergeCheckResults(results);
      })
      .finally(() => this.endValidate());
  },

  /** 单条校验：成功返回 { key, stale, stock }；网络失败（无 code）返回 null */
  checkItem(item) {
    return request({ url: `/menu/${item.menuId}` })
      .then((menu) => {
        const stock = Number(menu.stock);
        if (stock < Number(item.count)) return { key: item.key, stale: '库存不足', stock };
        return { key: item.key, stale: '', stock };
      })
      .catch((err) => {
        // 31002 = 菜品不存在/已下架/分类停用 → 标记已下架；网络失败不标记
        if (err && err.code === 31002) return { key: item.key, stale: '已下架' };
        return null;
      });
  },

  /** 数量变化后重查单条：解除/更新过期标记与库存快照 */
  revalidateItem(item) {
    this.startValidate();
    this.checkItem(item)
      .then((r) => {
        if (!r) return;
        this.mergeCheckResults([r]);
      })
      .finally(() => this.endValidate());
  },

  /** 合并校验结果到 staleMap / stockMap 并重渲染 */
  mergeCheckResults(results) {
    const staleMap = Object.assign({}, this.data.staleMap);
    const stockMap = Object.assign({}, this.data.stockMap);
    results.forEach((r) => {
      if (!r) return;
      if (r.stale) staleMap[r.key] = r.stale;
      else delete staleMap[r.key];
      if (r.stock !== undefined) stockMap[r.key] = r.stock;
    });
    this.setData({ staleMap, stockMap });
    this.render();
  },

  /** 校验计数：并发校验时 validating 保持 true，全部结束后才放行结算 */
  startValidate() {
    this._validatingCount = (this._validatingCount || 0) + 1;
    this.setData({ validating: true });
  },

  endValidate() {
    this._validatingCount = Math.max(0, (this._validatingCount || 1) - 1);
    if (this._validatingCount === 0) this.setData({ validating: false });
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
    const newCount = item.count - 1;
    cart.updateCount(item.menuId, item.specIds, newCount);
    this.render();
    // 数量减少可能解除「库存不足」，立即重查该条
    this.revalidateItem(Object.assign({}, item, { count: newCount }));
  },

  onPlus(e) {
    const item = this.findItem(e.currentTarget.dataset.key);
    if (!item) return;
    // 已下架 / 库存不足条目禁止增加
    if (item.stale) {
      wx.showToast({ title: '含已下架或库存不足的商品，请先移除', icon: 'none' });
      return;
    }
    // 库存快照封顶（校验未完成时无快照不阻塞，由校验结果兜底）
    const max = this.data.stockMap[item.key];
    if (max !== undefined && item.count >= max) {
      wx.showToast({ title: '已达库存上限', icon: 'none' });
      return;
    }
    const newCount = item.count + 1;
    cart.updateCount(item.menuId, item.specIds, newCount);
    this.render();
    this.revalidateItem(Object.assign({}, item, { count: newCount }));
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
    // 校验是异步的：完成前拦截，防止未校验状态绕过（如改数量后库存超限）
    if (this.data.validating) {
      wx.showToast({ title: '正在检查商品状态，请稍候', icon: 'none' });
      return;
    }
    const { items, selectedKeys } = this.data;
    const selectedItems = items.filter((item) =>
      selectedKeys.includes(item.key)
    );
    if (!selectedItems.length) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    // 已下架 / 库存不足的条目不能结算
    const staleItems = selectedItems.filter((item) => this.data.staleMap[item.key]);
    if (staleItems.length) {
      wx.showToast({ title: '含已下架或库存不足的商品，请先移除', icon: 'none' });
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
