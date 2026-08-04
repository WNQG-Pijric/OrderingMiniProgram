# 02-user：用户模块

> 前置规则：`docs/prompts/00-project-rule.md`。依赖模块 00 schema、01 auth 的 `UserGuard`。

## 目标

用户资料查看 / 修改、钱包余额与流水查询。

## 数据表

- user
- wallet_log

## 接口

```
GET    /users/profile        # 查看自己的资料与余额
PUT    /users/profile        # 修改昵称 / 头像
GET    /users/wallet         # 钱包余额
GET    /users/wallet/logs    # 钱包流水（分页）
```

## 关键规则

- 只允许操作自己的数据（从 JWT 取 userId，禁止客户端传 userId）。
- 流水按 `created_at` 倒序分页返回。
- 头像支持 COS 临时密钥直传（见模块 03）或直接存 URL。

## 输出物

- UserModule：Controller / Service / DTO
- 小程序端：个人中心、我的钱包（余额 + 流水明细）页面
- Swagger 注解、单元测试

## 验收标准

1. 修改资料只影响当前登录用户。
2. 钱包页展示余额与分页流水，金额精确到分。
