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
    isEdit: false, // 从购物车进入的改规格模式
  },

  onLoad(options) {
    this.menuId = Number(options.id);
    this.isEdit = options.edit === '1';
    if (this.isEdit) {
      this.editItem = cart.getEditItem();
      if (!this.editItem || Number(this.editItem.menuId) !== this.menuId) {
        this.editItem = null;
        this.isEdit = false;
      }
    }
    this.loadDetail();
  },

  /** 拉取菜品详情；编辑模式按原购物车规格回显，否则默认每组第一项 */
  loadDetail() {
    request({ url: `/menu/${this.menuId}` })
      .then((menu) => {
        const selections = {};
        const editSpecIds = this.editItem ? this.editItem.specIds || [] : [];
        (menu.specGroups || []).forEach((g) => {
          if (g.items && g.items.length) {
            const activeItems = g.items;
            const editItem = activeItems.find((item) =>
              editSpecIds.includes(item.id)
            );
            selections[g.id] = (editItem || activeItems[0]).id;
          }
        });
        this.setData({
          menu,
          selections,
          count:
            this.isEdit && this.editItem
              ? Math.max(1, Number(this.editItem.count) || 1)
              : 1,
          isEdit: this.isEdit,
        });
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

  /** 加入购物车 / 保存规格修改（本地缓存；下单金额以服务端重算为准） */
  addToCart() {
    const { menu, selections, count } = this.data;
    if (!menu) return;
    const specIds = (menu.specGroups || [])
      .map((g) => selections[g.id])
      .filter(Boolean);
    const item = {
      menuId: menu.id,
      menuName: menu.name,
      image: menu.image,
      specIds,
      specText: this.data.specText,
      count,
      unitPrice: this.data.unitPrice,
      remark: this.editItem && this.editItem.remark ? this.editItem.remark : '',
    };
    if (this.editItem) {
      cart.updateItem(this.editItem.menuId, this.editItem.specIds, item);
      cart.clearEditItem();
      wx.showToast({ title: '已保存修改', icon: 'success' });
    } else {
      cart.addItem(item);
      wx.showToast({ title: '已加入购物车', icon: 'success' });
    }
    setTimeout(() => wx.navigateBack(), 600);
  },
});
