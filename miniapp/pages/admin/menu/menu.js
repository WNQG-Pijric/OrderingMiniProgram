// 菜单管理（模块 03）：列表 + 上下架 + 删除 + 分页加载
const { request } = require('../../../utils/admin-request');

const PAGE_SIZE = 10;

Page({
  data: {
    list: [],
    total: 0,
    page: 1,
    hasMore: true,
    status: '', // '' 全部 / 0 下架 / 1 上架（数字，dataset 字符串转 Number）
    loading: false,
    loadError: false, // 列表加载失败（与"暂无菜品"分开显示）
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
    // dataset 静态属性是字符串，统一转数字（'' 全部保持空串）
    const raw = e.currentTarget.dataset.status;
    const status = raw === '' ? '' : Number(raw);
    if (status === this.data.status) return;
    this.setData({ status });
    this.reload();
  },

  load(reset) {
    if (this.data.loading || (!reset && !this.data.hasMore)) return;
    this.setData({ loading: true });
    const { page, status } = this.data;
    // 空串不传 status（避免 undefined 被序列化成 "undefined" 导致后端校验失败）
    const data = { page, pageSize: PAGE_SIZE };
    if (status !== '') data.status = status;
    request({ url: '/admin/menu', data })
      .then((data) => {
        const list = reset ? data.list : this.data.list.concat(data.list);
        this.setData({
          list,
          total: data.total,
          page: page + 1,
          // 已加载条数 < 总数 → 还有下一页
          hasMore: list.length < data.total,
          loading: false,
          loadError: false,
        });
      })
      .catch(() => {
        // 列表请求失败不弹 toast（快速切换筛选会连弹），空列表时显示错误态
        this.setData({
          loading: false,
          loadError: this.data.list.length === 0,
        });
      });
  },

  onReachBottom() {
    this.load(false);
  },

  /** 上架 / 下架 */
  onToggleStatus(e) {
    const { id } = e.currentTarget.dataset;
    // dataset 类型不确定（静态字符串 / 插值数字），统一 Number 后比较
    const status = Number(e.currentTarget.dataset.status);
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

  /** 删除（软删除）：上架中不可删除，需先下架 */
  onDelete(e) {
    const { id, name, status } = e.currentTarget.dataset;
    // dataset 类型不确定（静态字符串 / 插值数字），统一 Number 后比较
    if (Number(status) === 1) {
      wx.showToast({ title: '请先下架再删除', icon: 'none' });
      return;
    }
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
