// 菜单管理（模块 03）：列表 + 上下架 + 删除 + 分页加载
const { request } = require('../../../utils/admin-request');

const PAGE_SIZE = 10;

Page({
  data: {
    list: [],
    total: 0,
    page: 1,
    hasMore: true,
    status: '', // '' 全部 / 0 下架 / 1 上架
    loading: false,
  },

  onShow() {
    if (!require('../../../utils/admin').getAdminToken()) {
      wx.redirectTo({ url: '/pages/admin/login/login' });
      return;
    }
    // 从编辑页返回时刷新
    this.reload();
  },

  reload() {
    this.setData({ page: 1, list: [], hasMore: true });
    this.load(true);
  },

  /** 切换状态筛选 */
  onFilterTap(e) {
    const status = e.currentTarget.dataset.status;
    if (status === this.data.status) return;
    this.setData({ status });
    this.reload();
  },

  load(reset) {
    if (this.data.loading || (!reset && !this.data.hasMore)) return;
    this.setData({ loading: true });
    const { page, status } = this.data;
    request({
      url: '/admin/menu',
      data: { page, pageSize: PAGE_SIZE, status: status || undefined },
    })
      .then((data) => {
        const list = reset ? data.list : this.data.list.concat(data.list);
        this.setData({
          list,
          total: data.total,
          page: page + 1,
          // 已加载条数 < 总数 → 还有下一页
          hasMore: list.length < data.total,
          loading: false,
        });
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message, icon: 'none' });
      });
  },

  onReachBottom() {
    this.load(false);
  },

  /** 上架 / 下架 */
  onToggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    request({
      url: `/admin/menu/${id}`,
      method: 'PUT',
      data: { status: status === 1 ? 0 : 1 },
    })
      .then(() => {
        wx.showToast({ title: status === 1 ? '已下架' : '已上架', icon: 'success' });
        this.reload();
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  /** 编辑 → 表单页 */
  onEdit(e) {
    wx.navigateTo({ url: `/pages/admin/menu-edit/menu-edit?id=${e.currentTarget.dataset.id}` });
  },

  /** 新增 → 表单页 */
  onAdd() {
    wx.navigateTo({ url: '/pages/admin/menu-edit/menu-edit' });
  },

  /** 删除（软删除） */
  onDelete(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除菜品',
      content: `确认删除「${name}」？删除后用户端不可见，历史订单不受影响。`,
      confirmColor: '#ff4d2e',
      success: (res) => {
        if (!res.confirm) return;
        request({ url: `/admin/menu/${id}`, method: 'DELETE' })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.reload();
          })
          .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      },
    });
  },

  /** 进入分类管理 */
  goCategory() {
    wx.navigateTo({ url: '/pages/admin/category/category' });
  },
});
