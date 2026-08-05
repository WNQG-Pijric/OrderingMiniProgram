# 01-auth：登录模块（微信登录 + JWT）

> 前置规则：`docs/prompts/00-project-rule.md`。依赖模块 00 的 Prisma schema。

## 目标

微信登录、自动注册、Token 签发与刷新。

## 数据表

- user

## 接口

```
POST   /auth/login        # 小程序 code 换取登录（openid 不存在则自动注册）
POST   /auth/refresh      # refreshToken 换取新 accessToken
GET    /auth/profile      # 当前登录用户信息
```

## 关键规则（硬性）

- openid 唯一，不存在则自动注册新用户，`balance` 默认 0。
- 返回 `accessToken` + `refreshToken`；accessToken 短期（如 2h），refreshToken 长期（如 7d），支持刷新轮换。
- 签发内容含 `userId` / `openid` / `role`。
- AppSecret 只存后端环境变量，**绝不进入小程序代码**。
- 创建 `UserGuard`（未携带 token 返回 `20001`，token 无效/过期返回 `40101`），供后续模块复用。
- 注册 / 登录同事务：先查 openid，无则创建用户，再签发 Token。

## 输出物

- AuthModule：Controller / Service / DTO（`@ApiProperty` + class-validator）
- `JwtStrategy` + `UserGuard`
- 小程序端 `utils/` 封装登录与 token 存储（Storage 持久化，刷新逻辑）——已随 `miniapp/` 骨架交付（`utils/auth.js` / `utils/request.js`）
- Swagger 注解、单元测试

## 验收标准

1. 首次登录自动建号，二次登录不再重复注册。
2. accessToken 过期后可用 refreshToken 刷新成功。
3. 未携带 token 访问受保护接口返回 `20001`；token 无效/过期返回 `40101`。
