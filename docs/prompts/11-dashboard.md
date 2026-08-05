# 11-dashboard：数据统计模块

> 前置规则：`docs/prompts/00-project-rule.md`。依赖模块 00 schema、05 order、10 admin。
> 样式规范：前端页面遵循 `docs/design.md`（app.wxss token + common.wxss `c-` 公共类），禁止硬编码色值/字号/间距。

## 目标

小程序管理员端仪表盘数据统计：今日订单、营业额、用户数、热销商品。

## 数据表

- order、order_item、user（只读聚合）

## 接口

```
GET /admin/stats                 # 综合统计
GET /admin/stats/today           # 今日订单数 / 营业额 / 用户数
GET /admin/stats/hot-sales       # 热销商品 TOP N（按 order_item 聚合）
GET /admin/stats/trend           # 近 7 天订单 / 营业额趋势
```

## 关键规则

- 营业额统计以 `order.amount`（实付金额）为准，**只统计已支付及以上状态**（排除待支付 / 已取消）。
- 热销商品基于 `order_item` 快照聚合 `count`，叠加 `menu.sales`（销量字段）同步更新（下单时累加）。
- 统计查询可用 SQL 聚合（`$queryRaw`）提升性能；5~10 人规模无需缓存，直接查库。
- 全部走 `AdminGuard`。

## 输出物

- DashboardModule / StatsService（聚合查询）
- 小程序内管理员端仪表盘页面（图表可用 ECharts）
- Swagger 注解、单元测试

## 验收标准

1. 今日营业额与订单列表实付合计一致。
2. 热销榜与订单项数量一致。
3. 排除待支付 / 已取消订单。
