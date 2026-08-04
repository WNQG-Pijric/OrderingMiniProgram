# 05-order：订单模块（创建 / 详情 / 取消）

> 前置规则：`docs/prompts/00-project-rule.md`。依赖模块 00 schema、01 auth、03 menu。

## 目标

创建订单（服务端重算 + 校验 + 幂等）、订单详情、备注、取消。

## 数据表

- order、order_item

## 状态机

```
待支付 → 已支付 → 制作中 → 已完成
   └→ 已取消（已支付订单取消时自动退款回补，见模块 06）
```

## 接口

```
POST   /orders               # 创建订单
GET    /orders               # 我的订单列表（分页 + 状态筛选）
GET    /orders/:id           # 订单详情（含 items 快照）
POST   /orders/:id/cancel    # 取消订单（已支付自动退款回补）
```

创建订单请求：

```json
{
  "clientOrderNo": "uuid-xxxx",      // 客户端幂等键
  "items": [
    { "menuId": 1, "specIds": [101, 202], "count": 2 }
  ],
  "remark": "不要香菜"
}
```

## 关键规则（硬性）

1. **服务端重算价格**：按 `menu_id + 规格项 id` 重算，不信任客户端金额；`amount` 实付、`total_amount` 原价。
2. **校验**：菜品存在、上架（status=1）、未软删除；库存充足（`40002` 库存不足）。
3. **幂等**：`client_order_no` 唯一约束；重复请求返回已创建订单（`40005` 或返回原订单，二者择一，禁止重复扣款）。
4. **事务**：创建订单 + 写 order_item 快照 + 扣库存同一事务。
5. **快照**：order_item 存 `menu_name` / `spec_text` / `price` 下单时快照，菜品后续修改不影响历史订单。
6. **权限**：只能查看 / 取消自己的订单。
7. 取消规则：待支付 → 直接取消；已支付 → 触发退款回补（调用模块 06 逻辑）。

## 输出物

- OrderModule：Controller / Service / DTO
- 小程序端：确认订单、订单详情、我的订单页面
- Swagger 注解、单元测试 + 集成测试（含并发下单、重复提交）

## 验收标准

1. 客户端改价无效：无论前端传多少金额，实付以服务端重算为准。
2. 并发下单不超卖（库存校验生效）。
3. 相同 `clientOrderNo` 重复请求不重复扣款 / 不重复建单。
