# 10-admin：小程序管理员端模块

> 前置规则：`docs/prompts/00-project-rule.md`。依赖模块 00 schema、03 menu、05 order、06 wallet、08 chat、09 announcement。

## 目标

小程序内管理员端：登录、菜单 / 分类 / 订单 / 用户 / 公告 / 聊天管理（含赠送余额、取消退款）。

## 权限机制

管理员账号存独立 `admin` 表（bcrypt 密码），不复用微信用户；管理员需绑定 `wechat_openid` 以接收微信订阅消息。

| 端 | 登录方式 | 令牌 | 守卫 |
|---|---|---|---|
| 小程序用户 | 微信登录 | user JWT | UserGuard |
| 小程序管理员端 | 账号密码 | admin JWT | AdminGuard |

## 接口

```
POST   /admin/auth/login         # 账号密码登录
POST   /admin/auth/logout
POST   /admin/auth/bind-openid   # 绑定当前微信 openid（订阅消息）

GET    /admin/orders             # 订单列表（分页 + 状态筛选）
POST   /admin/orders/:id/confirm # 确认订单，进入制作中
POST   /admin/orders/:id/complete
POST   /admin/orders/:id/cancel  # 取消并退款（走模块 06）

GET    /admin/users
POST   /admin/users/:id/recharge # 赠送余额（type=gift）
POST   /admin/users/:id/disable  # 禁用用户

# 数据统计接口见模块 11-dashboard（/admin/stats）
POST   /admin/menu               # 见模块 03
PUT    /admin/menu/:id
DELETE /admin/menu/:id
POST   /admin/category
PUT    /admin/category/:id
DELETE /admin/category/:id

GET    /admin/chats              # 管理员会话列表
GET    /admin/chats/:id/messages
POST   /admin/chats/:id/messages # 管理员回复

POST   /admin/announcements      # 见模块 09
PUT    /admin/announcements/:id
DELETE /admin/announcements/:id
```

## 关键规则（硬性）

- 所有 `/admin/*` 接口必须走 `AdminGuard`，非管理员返回 `20005`。
- 管理员端与用户端位于同一小程序，前端按角色渲染；后端接口不能仅依赖前端隐藏页面。
- **赠送余额**：写 `wallet_log(type=gift)`，记录 `balance_after`，同一事务。
- **取消退款**：调用模块 06 退款逻辑（行锁回补 + 流水 + 订单置取消，同一事务），杜绝手工改库。
- 订单「完成」只能从「制作中」流转，非法流转返回 `40004`。
- 禁用用户后其登录 / 下单接口返回 `20004`。
- **确认订单**：`POST /admin/orders/:id/confirm` 将订单从「已支付」流转至「制作中」，不新增独立确认状态；非法流转返回 `40004`。
- **微信绑定**：管理员登录后调用 `POST /admin/auth/bind-openid`，把当前登录微信的 openid 写入 `admin.wechat_openid`（UNIQUE），用于接收订阅消息。

## 输出物

- AdminModule：登录 + 微信绑定 + 菜单/订单/用户管理 + 赠送 + 取消退款 + 公告/聊天管理（统计接口见模块 11）
- 小程序内管理员端页面：登录、仪表盘、菜单管理、分类管理、订单管理、用户管理、公告管理、聊天管理、数据统计（数据来自模块 11）、系统设置
- Swagger 注解、单元测试

## 验收标准

1. 非管理员访问 `/admin/*` 返回 `20005`。
2. 赠送余额到账且有流水，余额精确。
3. 取消已支付订单自动退款，无重复退款。
4. 管理员端 CRUD 操作均实时反映到小程序用户端。
