// 菜品详情（模块 03：选规格 + 数量 + 实时计价 + 加入购物车）
const cart = require('../../../utils/cart');
const { request } = require('../../../utils/request');

Page({
  data: {
    menu: null,
    selections: {}, // groupId -> 选中的 itemId
    count: 1,
    totalPrice: '0.00',
    unitPrice: '0.00', // 单价 = 基础价 + 规格加价（购物车存此值）
    specText: '', // 已选规格文本快照（如：甜度/半糖 温度/少冰）
  },

  onLoad(options) {
    this.menuId = Number(options.id);
    this.loadDetail();
  },

  /** 拉取菜品详情，默认每个规格组选第一项 */
  loadDetail() {
    request({ url: `/menu/${this.menuId}` })
      .then((menu) => {
        const selections = {};
        (menu.specGroups || []).forEach((g) => {
          if (g.items && g.items.length) {
            selections[g.id] = g.items[0].id;
          }
        });
        this.setData({ menu, selections });
        this.calcPrice();
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '菜品不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 800);
      });
  },

  /** 点击规格项（每个规格组单选一项） */
  onSpecTap(e) {
    const { groupId, itemId } = e.currentTarget.dataset;
    this.setData({ [`selections.${groupId}`]: itemId });
    this.calcPrice();
  },

  onPlus() {
    this.setData({ count: this.data.count + 1 });
    this.calcPrice();
  },

  onMinus() {
    if (this.data.count <= 1) return;
    this.setData({ count: this.data.count - 1 });
    this.calcPrice();
  },

  /**
   * 实时计价：总价 = (基础价 + Σ 选中规格项 price_delta) × 数量。
   * 金额用「分」做整数运算，避免浮点误差；下单时服务端仍会重算。
   */
  calcPrice() {
    const { menu, selections, count } = this.data;
    if (!menu) return;
    let cents = Math.round(parseFloat(menu.price) * 100);
    const specTexts = [];
    (menu.specGroups || []).forEach((g) => {
      const item = (g.items || []).find((i) => i.id === selections[g.id]);
      if (item) {
        cents += Math.round(parseFloat(item.priceDelta) * 100);
        specTexts.push(`${g.name}/${item.name}`);
      }
    });
    const total = (cents * count) / 100;
    this.setData({
      unitPrice: (cents / 100).toFixed(2),
      totalPrice: total.toFixed(2),
      specText: specTexts.join(' '),
    });
  },

  /** 加入购物车（本地缓存；购物车模块 04 使用） */
  addToCart() {
    const { menu, selections, count } = this.data;
    if (!menu) return;
    const specItemIds = (menu.specGroups || [])
      .map((g) => selections[g.id])
      .filter(Boolean);
    cart.add({
      menuId: menu.id,
      menuName: menu.name,
      image: menu.image,
      specItemIds,
      specText: this.data.specText,
      count,
      // 单价 = 基础价 + 规格加价（下单金额以服务端重算为准）
      price: this.data.unitPrice,
    });
    wx.showToast({ title: '已加入购物车', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 600);
  },
});
