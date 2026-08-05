// 本地购物车（模块 04）：按用户隔离，storage key = cart:<userId>。
// 条目字段对齐 docs/prompts/04-cart.md：
// menuId / menuName / image / specIds / specText / unitPrice / count / remark
// 金额统一「分」整数运算、两位小数字符串；下单金额以模块 05 服务端重算为准。
const auth = require('./auth');

const GUEST_KEY = 'cart:guest';
const EDIT_ITEM_KEY = 'cart_edit_item';

/** 当前用户购物车 key；未登录时落到 guest */
function getCartKey() {
  const userId = auth.getUserId();
  return userId ? `cart:${userId}` : GUEST_KEY;
}

/**
 * 登录后把 guest 购物车合并进当前用户购物车，避免未登录加购的数据丢失。
 * 每次读取 / 写入前调用；guest 为空时无副作用。
 */
function migrateGuestCart() {
  const userId = auth.getUserId();
  if (!userId) return;
  const guest = readList(GUEST_KEY);
  if (!guest.length) return;
  const key = getCartKey();
  const merged = guest.reduce((list, item) => mergeInto(list, item), readList(key));
  writeList(key, merged);
  wx.removeStorageSync(GUEST_KEY);
}

function readList(key) {
  const list = wx.getStorageSync(key);
  return Array.isArray(list) ? list : [];
}

function writeList(key, list) {
  wx.setStorageSync(key, list);
}

/** 规格 ID 归一化：数字、去重、升序，保证同规格合并不受选择顺序影响 */
function normalizeSpecIds(specIds) {
  const ids = (Array.isArray(specIds) ? specIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
  return [...new Set(ids)];
}

function matches(item, menuId, specIds) {
  return (
    Number(item.menuId) === Number(menuId) &&
    JSON.stringify(normalizeSpecIds(item.specIds)) ===
      JSON.stringify(normalizeSpecIds(specIds))
  );
}

function sameItem(a, b) {
  return (
    Number(a.menuId) === Number(b.menuId) &&
    JSON.stringify(normalizeSpecIds(a.specIds)) ===
      JSON.stringify(normalizeSpecIds(b.specIds))
  );
}

function toCents(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

function toMoney(cents) {
  return (cents / 100).toFixed(2);
}

/** 条目规范化：金额两位字符串、数量至少 1、specIds 归一化 */
function normalizeItem(item) {
  return {
    menuId: Number(item.menuId),
    menuName: item.menuName || '',
    image: item.image || '',
    specIds: normalizeSpecIds(item.specIds),
    specText: item.specText || '',
    unitPrice: toMoney(toCents(item.unitPrice)),
    count: Math.max(1, Number(item.count) || 1),
    remark: item.remark || '',
  };
}

/** 把 item 合并进 list：同 menuId + specIds 只累加数量，不覆盖其他字段 */
function mergeInto(list, item) {
  const normalized = normalizeItem(item);
  const found = list.find((it) => sameItem(it, normalized));
  if (found) {
    found.count += normalized.count;
    return list;
  }
  return list.concat(normalized);
}

/** 读取当前用户购物车 */
function getItems() {
  migrateGuestCart();
  return readList(getCartKey());
}

/** 加入购物车：同 menuId + specIds 自动合并数量 */
function addItem(item) {
  migrateGuestCart();
  const key = getCartKey();
  const list = mergeInto(readList(key), item);
  writeList(key, list);
  return list;
}

/** 修改数量；count ≤ 0 时移除该条目 */
function updateCount(menuId, specIds, count) {
  const key = getCartKey();
  const next = Number(count);
  let list = readList(key);
  const target = list.find((it) => matches(it, menuId, specIds));
  if (!target) return list;
  if (next <= 0) {
    list = list.filter((it) => it !== target);
  } else {
    target.count = Math.max(1, Math.floor(next));
  }
  writeList(key, list);
  return list;
}

/** 删除单条 */
function removeItem(menuId, specIds) {
  const key = getCartKey();
  const list = readList(key).filter((it) => !matches(it, menuId, specIds));
  writeList(key, list);
  return list;
}

/** 改规格：移除旧条目后按新条目加入（同新规格自动合并数量） */
function updateItem(menuId, oldSpecIds, item) {
  removeItem(menuId, oldSpecIds);
  return addItem(item);
}

/** 清空当前用户购物车 */
function clear() {
  wx.removeStorageSync(getCartKey());
}

/** 合计金额：分整数累加，返回两位小数字符串 */
function computeTotal(items) {
  const cents = (items || []).reduce(
    (sum, item) => sum + toCents(item.unitPrice) * (Number(item.count) || 0),
    0,
  );
  return toMoney(cents);
}

/** 购物车总件数（首页角标用；显示层自行做 99+ 封顶） */
function getCount() {
  return getItems().reduce((sum, item) => sum + (Number(item.count) || 0), 0);
}

// 改规格临时上下文：购物车页写入，详情页编辑模式读取
function setEditItem(item) {
  wx.setStorageSync(EDIT_ITEM_KEY, item);
}

function getEditItem() {
  return wx.getStorageSync(EDIT_ITEM_KEY) || null;
}

function clearEditItem() {
  wx.removeStorageSync(EDIT_ITEM_KEY);
}

module.exports = {
  getCartKey,
  getItems,
  addItem,
  updateCount,
  removeItem,
  updateItem,
  clear,
  computeTotal,
  getCount,
  setEditItem,
  getEditItem,
  clearEditItem,
};
