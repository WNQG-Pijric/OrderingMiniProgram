// 本地购物车（模块 03 预置数据结构，模块 04 正式使用）
// 内容：商品 ID、规格项 ID 列表、数量；同菜品同规格合并数量。
const KEY = 'cart_items';

/** 读取购物车 */
function getAll() {
  return wx.getStorageSync(KEY) || [];
}

/** 加入购物车：同 menuId + specItemIds 合并数量 */
function add(item) {
  const list = getAll();
  const found = list.find(
    (it) =>
      it.menuId === item.menuId &&
      JSON.stringify(it.specItemIds) === JSON.stringify(item.specItemIds),
  );
  if (found) {
    found.count += item.count;
  } else {
    list.push({ ...item, count: item.count });
  }
  wx.setStorageSync(KEY, list);
}

/** 修改数量（count ≤ 0 时移除） */
function updateCount(menuId, specItemIds, count) {
  let list = getAll();
  const found = list.find(
    (it) =>
      it.menuId === menuId &&
      JSON.stringify(it.specItemIds) === JSON.stringify(specItemIds),
  );
  if (!found) return;
  found.count = count;
  if (found.count <= 0) {
    list = list.filter((it) => it !== found);
  }
  wx.setStorageSync(KEY, list);
}

/** 清空购物车 */
function clear() {
  wx.removeStorageSync(KEY);
}

module.exports = { getAll, add, updateCount, clear };
