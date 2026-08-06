// 分类管理（模块 03）：列表 + 新增/编辑 + 启停 + 删除（置停用）
const { request } = require('../../../utils/admin-request');

Page({
  data: {
    list: [],
    loading: false,
    // 弹层表单
    showForm: false,
    form: { id: null, name: '', sort: 0 },
    saving: false, // 保存中防重复提交
  },

  onShow() {
    if (!require('../../../utils/admin').getAdminToken()) {
      wx.redirectTo({ url: '/pages/admin/login/login' });
      return;
    }
    this.load();
  },

  load() {
    this.setData({ loading: true });
    request({ url: '/admin/category' })
      .then((list) => this.setData({ list, loading: false }))
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message, icon: 'none' });
      });
  },

  /** 弹层内点击不冒泡关闭 */
  noop() {},

  /** 新增 */
  onAdd() {
    this.setData({ showForm: true, form: { id: null, name: '', sort: 0 } });
  },

  /** 编辑 */
  onEdit(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showForm: true,
      form: { id: item.id, name: item.name, sort: item.sort },
    });
  },

  onFormInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onFormCancel() {
    this.setData({ showForm: false });
  },

  onFormSave() {
    if (this.data.saving) return; // 防重复提交
    const { id, name, sort } = this.data.form;
    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }
    // 排序可空（空=0），非空必须是非负整数，避免 Number(sort) || 0 静默兜底
    if (sort !== '' && !/^\d+$/.test(String(sort))) {
      wx.showToast({ title: '排序必须是非负整数', icon: 'none' });
      return;
    }
    const payload = { name: name.trim(), sort: Number(sort) || 0 };
    this.setData({ saving: true });
    const p = id
      ? request({ url: `/admin/category/${id}`, method: 'PUT', data: payload })
      : request({ url: '/admin/category', method: 'POST', data: payload });
    p.then(() => {
      this.setData({ saving: false, showForm: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.load();
    }).catch((err) => {
      this.setData({ saving: false });
      wx.showToast({ title: err.message, icon: 'none' });
    });
  },

  /** 启停切换（上下架） */
  onToggleStatus(e) {
    const { id } = e.currentTarget.dataset;
    // dataset 类型不确定（静态字符串 / 插值数字），统一 Number 后比较
    const status = Number(e.currentTarget.dataset.status);
    request({
      url: `/admin/category/${id}`,
      method: 'PUT',
      data: { status: status === 1 ? 0 : 1 },
    })
      .then(() => {
        wx.showToast({ title: status === 1 ? '已下架' : '已上架', icon: 'success' });
        this.load();
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  /** 删除（软删除，类比菜品）：上架中不可删除，需先下架 */
  onDelete(e) {
    const { id, name, status } = e.currentTarget.dataset;
    // dataset 类型不确定（静态字符串 / 插值数字），统一 Number 后比较
    if (Number(status) === 1) {
      wx.showToast({ title: '请先下架再删除', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '删除分类',
      content: `确认删除分类「${name}」？删除后用户端不再展示该分类及其下菜品，数据保留。`,
      confirmColor: '#ff4d2e',
      success: (res) => {
        if (!res.confirm) return;
        request({ url: `/admin/category/${id}`, method: 'DELETE' })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.load();
          })
          .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      },
    });
  },
});
