// 请求参数清理（UX 修复）：
// GET query 与 POST/PUT body 对 undefined/null 的处理语义不同——
// - GET query：undefined / null 都无业务语义，都剔除（否则 wx.request 会把 undefined 序列化成 "undefined" 传给后端导致校验失败）
// - POST/PUT body：只剔除 undefined，保留 null（后端 @ValidateIf 用显式 null 触发"字段不能为空"，删掉会改变清空字段语义）
function cleanQuery(data) {
  return Object.fromEntries(
    Object.entries(data || {}).filter(([, v]) => v !== undefined && v !== null)
  );
}

function cleanBody(data) {
  return Object.fromEntries(
    Object.entries(data || {}).filter(([, v]) => v !== undefined)
  );
}

module.exports = { cleanQuery, cleanBody };
