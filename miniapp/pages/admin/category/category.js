// 分类管理（模块 03）：列表 + 新增/编辑 + 启停 + 删除（置停用）
const { request } = require('../../../utils/admin-request');

Page({
  data: {
    list: [],
    loading: false,
    // 弹层表单
    showForm: false,
    form: { id: null, name: '', sort: 0 },
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
    const { id, name, sort } = this.data.form;
    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }
    const payload = { name: name.trim(), sort: Number(sort) || 0 };
    const p = id
      ? request({ url: `/admin/category/${id}`, method: 'PUT', data: payload })
      : request({ url: '/admin/category', method: 'POST', data: payload });
    p.then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ showForm: false });
      this.load();
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  /** 启停切换（停用 = 删除的等效表达，数据保留） */
  onToggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    request({
      url: `/admin/category/${id}`,
      method: 'PUT',
      data: { status: status === 1 ? 0 : 1 },
    })
      .then(() => this.load())
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  /** 删除（置停用） */
  onDelete(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除分类',
      content: `确认停用分类「${name}」？停用后用户端不再展示，数据保留可恢复。`,
      confirmColor: '#ff4d2e',
      success: (res) => {
        if (!res.confirm) return;
        request({ url: `/admin/category/${id}`, method: 'DELETE' })
          .then(() => {
            wx.showToast({ title: '已停用', icon: 'success' });
            this.load();
          })
          .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      },
    });
  },
});
