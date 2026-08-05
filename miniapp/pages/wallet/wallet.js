// 我的钱包（模块 02：余额 + 分页流水）
const auth = require('../../utils/auth');
const { request } = require('../../utils/request');

const TYPE_TEXT = { pay: '消费', gift: '赠送', refund: '退款' };

Page({
  data: {
    balance: '0.00',
    logs: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: false,
    loading: false,
  },

  onLoad() {
    if (!auth.getToken()) {
      wx.redirectTo({ url: '/pages/index/index' });
      return;
    }
    this.loadWallet();
    this.loadLogs(1);
  },

  /** 钱包余额 */
  loadWallet() {
    request({ url: '/users/wallet' })
      .then((data) => this.setData({ balance: data.balance }))
      .catch(() => {
        // 余额加载失败不阻塞流水展示
      });
  },

  /** 流水分页加载：page=1 重置列表，否则追加 */
  loadLogs(page) {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const { pageSize } = this.data;
    request({
      url: `/users/wallet/logs?page=${page}&pageSize=${pageSize}`,
    })
      .then((data) => {
        const items = (data.list || []).map(this.decorateLog);
        const logs = page === 1 ? items : this.data.logs.concat(items);
        this.setData({
          logs,
          total: data.total,
          page: data.page,
          hasMore: logs.length < data.total,
          loading: false,
        });
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      });
  },

  /** 格式化流水条目：类型中文 / 本地时间 / 正负号 */
  decorateLog(log) {
    const change = parseFloat(log.change);
    return {
      ...log,
      changeNum: change,
      changeText: (change >= 0 ? '+' : '') + log.change,
      typeText: TYPE_TEXT[log.type] || log.type,
      timeText: formatTime(log.createdAt),
    };
  },

  /** 上拉触底加载更多 */
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadLogs(this.data.page + 1);
    }
  },
});

/**
 * ISO 时间 → 本地 yyyy-MM-dd HH:mm。
 * 手动解析避免 iOS 对带毫秒 ISO 字符串的兼容问题。
 */
function formatTime(value) {
  if (!value) return '';
  const m = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
  );
  if (!m) return String(value);
  const [, y, mo, d, h, mi, s] = m;
  const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
