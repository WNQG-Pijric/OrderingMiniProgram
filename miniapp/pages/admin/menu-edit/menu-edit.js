// 菜品新增 / 编辑（模块 03）：基本信息 + 图片直传 COS + 规格组/项配置
const { request } = require('../../../utils/admin-request');
const { uploadImage } = require('../../../utils/upload');

/** 空规格组（用于动态增删） */
const emptyGroup = () => ({ name: '', items: [{ name: '', priceDelta: '' }] });

Page({
  data: {
    isEdit: false,
    menuId: null,
    // 基本信息
    form: {
      name: '',
      categoryId: null,
      price: '',
      stock: '',
      sort: 0,
      image: '',
      uploading: false,
    },
    categories: [], // 分类 picker 数据
    categoryNames: [], // picker 展示名
    categoryIndex: 0,
    status: 1,
    specGroups: [],
    saving: false, // 保存中防重复提交
  },

  onLoad(options) {
    this.loadCategories();
    if (options.id) {
      this.setData({ isEdit: true, menuId: Number(options.id) });
      this.loadMenu(Number(options.id));
    }
  },

  /** 拉取分类（picker 用） */
  loadCategories() {
    request({ url: '/admin/category' })
      .then((list) => {
        const active = list.filter((c) => c.status === 1);
        this.setData({
          categories: active,
          categoryNames: active.map((c) => c.name),
        });
        // 编辑回显后设置分类索引
        if (this.data.form.categoryId) {
          this.syncCategoryIndex();
        }
      })
      .catch(() => {});
  },

  /** 编辑回显 */
  loadMenu(id) {
    request({ url: `/admin/menu/${id}` })
      .then((menu) => {
        const specGroups = (menu.specGroups || []).map((g) => ({
          name: g.name,
          items: (g.items || []).map((i) => ({
            name: i.name,
            priceDelta: i.priceDelta === '0.00' ? '' : i.priceDelta,
          })),
        }));
        this.setData({
          form: {
            name: menu.name,
            categoryId: menu.categoryId,
            price: menu.price,
            stock: String(menu.stock),
            sort: menu.sort,
            image: menu.image || '',
            uploading: false,
          },
          status: menu.status,
          specGroups,
        });
        this.syncCategoryIndex();
      })
      .catch((err) => {
        wx.showToast({ title: err.message, icon: 'none' });
        setTimeout(() => wx.navigateBack(), 800);
      });
  },

  syncCategoryIndex() {
    const idx = this.data.categories.findIndex(
      (c) => c.id === this.data.form.categoryId,
    );
    this.setData({ categoryIndex: idx >= 0 ? idx : 0 });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onCategoryChange(e) {
    const idx = Number(e.detail.value);
    const cat = this.data.categories[idx];
    this.setData({ categoryIndex: idx, 'form.categoryId': cat ? cat.id : null });
  },

  onStatusChange(e) {
    this.setData({ status: e.detail.value ? 1 : 0 });
  },

  /** 选择图片 → COS 直传 → 存 URL */
  onChooseImage() {
    if (this.data.form.uploading) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        this.setData({ 'form.uploading': true });
        uploadImage(filePath)
          .then((url) => this.setData({ 'form.image': url, 'form.uploading': false }))
          .catch((err) => {
            this.setData({ 'form.uploading': false });
            wx.showToast({ title: err.message || '上传失败', icon: 'none' });
          });
      },
    });
  },

  /** 删除已上传图片 */
  onRemoveImage() {
    this.setData({ 'form.image': '' });
  },

  // ---------- 规格组动态编辑 ----------

  onGroupInput(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ [`specGroups[${idx}].name`]: e.detail.value });
  },

  onItemInput(e) {
    const { gIdx, iIdx, field } = e.currentTarget.dataset;
    this.setData({ [`specGroups[${gIdx}].items[${iIdx}].${field}`]: e.detail.value });
  },

  onAddGroup() {
    this.setData({ specGroups: this.data.specGroups.concat(emptyGroup()) });
  },

  onRemoveGroup(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ specGroups: this.data.specGroups.filter((_, i) => i !== idx) });
  },

  onAddItem(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({
      [`specGroups[${idx}].items`]: this.data.specGroups[idx].items.concat({
        name: '',
        priceDelta: '',
      }),
    });
  },

  onRemoveItem(e) {
    const { gIdx, iIdx } = e.currentTarget.dataset;
    const items = this.data.specGroups[gIdx].items.filter((_, i) => i !== iIdx);
    this.setData({ [`specGroups[${gIdx}].items`]: items });
  },

  // ---------- 保存 ----------

  /** 非负数字（最多两位小数）/ 非负整数正则 */
  isMoney(v) {
    return /^\d+(\.\d{1,2})?$/.test(v);
  },

  isInt(v) {
    return /^\d+$/.test(v);
  },

  onSave() {
    const { form, status, specGroups } = this.data;
    if (this.data.saving) return; // 防重复提交
    // 基本信息校验
    if (!form.name.trim()) return wx.showToast({ title: '请输入菜品名称', icon: 'none' });
    if (!form.categoryId) return wx.showToast({ title: '请选择分类', icon: 'none' });
    if (form.price === '' || !this.isMoney(form.price)) {
      return wx.showToast({ title: '请输入正确的基础价（非负，最多两位小数）', icon: 'none' });
    }
    if (form.stock !== '' && !this.isInt(form.stock)) {
      return wx.showToast({ title: '库存必须是非负整数', icon: 'none' });
    }
    if (form.sort !== '' && !this.isInt(String(form.sort))) {
      return wx.showToast({ title: '排序必须是非负整数', icon: 'none' });
    }

    // 规格校验与组装：不合法明确提示并 return，不静默丢弃
    const groups = [];
    for (let gi = 0; gi < specGroups.length; gi++) {
      const g = specGroups[gi] || {};
      const gName = (g.name || '').trim();
      const rawItems = g.items || [];
      const deltaStr = (i) => {
        const d = i.priceDelta;
        return d === undefined || d === null || d === '' ? '' : String(d).trim();
      };
      // 空组（组名 + 全部项都空）→ 丢弃，无提示
      const hasContent =
        gName || rawItems.some((i) => (i.name || '').trim() || deltaStr(i) !== '');
      if (!hasContent) continue;
      if (!gName) {
        return wx.showToast({ title: `第 ${gi + 1} 组规格组名不能为空`, icon: 'none' });
      }
      const items = [];
      for (let ii = 0; ii < rawItems.length; ii++) {
        const i = rawItems[ii] || {};
        const iName = (i.name || '').trim();
        const d = deltaStr(i);
        // 空行（名称 + 加价都空）→ 丢弃
        if (!iName && d === '') continue;
        if (!iName) {
          return wx.showToast({ title: `第 ${gi + 1} 组第 ${ii + 1} 项名称不能为空`, icon: 'none' });
        }
        if (d !== '' && !this.isMoney(d)) {
          return wx.showToast({ title: `第 ${gi + 1} 组第 ${ii + 1} 项加价必须是非负数字（最多两位小数）`, icon: 'none' });
        }
        items.push({ name: iName, priceDelta: d === '' ? 0 : Number(d) });
      }
      groups.push({ name: gName, items });
    }

    const payload = {
      categoryId: form.categoryId,
      name: form.name.trim(),
      // 空串保留（清图语义）：cleanBody 只剔 undefined，'' 会被后端按清空处理
      image: form.image,
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      sort: Number(form.sort) || 0,
      status,
      specGroups: groups,
    };

    this.setData({ saving: true });
    const p = this.data.isEdit
      ? request({ url: `/admin/menu/${this.data.menuId}`, method: 'PUT', data: payload })
      : request({ url: '/admin/menu', method: 'POST', data: payload });

    p.then(() => {
      this.setData({ saving: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    }).catch((err) => {
      this.setData({ saving: false });
      wx.showToast({ title: err.message, icon: 'none' });
    });
  },
});
