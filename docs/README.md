# 微信点餐小程序开发方案（AI Coding 版本）

> Version: v1.3
>
> 开发模式：AI Coding（需求驱动 + 模块化开发）
>
> 推荐开发周期：2~4 周
>
> 适用场景：个人使用、5~10 人、仅微信平台

---

## 修订说明（v1.3，相对 v1.2）

1. **新增「核心决策」章节**：明确个人使用（5~10 人）、仅微信、**不上线不备案**、完全 AI Coding、支付用管理员赠送余额。
2. **技术选型收窄与确认**：小程序端锁定原生；部署改为**微信云托管**（免备案默认域名）；Redis 初期不引入；文件存储锁定腾讯云 COS。
3. **整体架构更新为云托管架构**：无自建服务器、无域名、无备案。
4. **合并重复章节**：原「八、开发顺序」与「十三、模块开发顺序」合并为一份「模块 00~09 清单」。
5. **第十六节改为「体验版 + 云托管」主路径**，正式上线（备案+审核）降为备选。
6. **全篇统一各模块「目标 / 数据表 / 接口 / 关键规则」结构**，提升 AI 可读性与可执行性。

> 本版沿用 v1.2 已确认的设计：菜品规格系统、订单快照、退款闭环、并发控制、admin 独立账号、Token 刷新等。

---

## 阅读指引（给 AI 开发者）

- 按「八、开发与部署顺序」的模块 00~09 **逐个开发**：一个模块 = 一个 Prompt = 一个 Commit。
- 各功能模块的「**关键规则**」是硬性要求，生成代码时不得省略（如服务端重算价格、行锁、幂等）。
- 数据库字段以「六、数据库设计」为准，各模块生成的 Prisma Model 必须与之对齐。
- 接口一律遵守「十二、API First 规范」的统一返回格式与错误码。

---

# 一、项目概述与核心决策

## 1.1 项目目标

开发一个微信点餐小程序，实现完整的线上点餐流程：

- 用户登录
- 菜单浏览与规格定制（甜度/温度/加料等）
- 购物车
- 下单与订单备注
- 虚拟货币支付（余额，非微信支付）
- 微信消息通知
- 后台管理
- 权限管理（普通用户 / 管理员）
- 管理员赠送余额（充值方式）

## 1.2 核心决策

| 决策项 | 选择 | 影响 |
|---|---|---|
| 使用范围 | 个人使用，5~10 人 | 不追求高并发，可精简 Redis 等基础设施 |
| 平台 | 仅微信小程序 | 前端锁定原生，无需跨端框架 |
| 发布方式 | **不上线不审核**，用「体验版」 | 免类目 / 资质 / 微信认证，个人主体即可注册 |
| 部署方式 | **微信云托管（CloudRun）** | 默认 HTTPS 域名免备案，无需服务器 / 域名 |
| 开发方式 | 完全 AI Coding | 模块化逐个开发，见 AI Coding 规范 |
| 支付方式 | 虚拟货币（余额），管理员赠送 | 避开微信支付及 iOS 虚拟支付合规 |

---

# 二、整体架构

```
微信小程序（原生，体验版，5~10 体验成员）
         │
         │ HTTPS request（云托管默认域名，免备案）
         ▼
微信云托管（CloudRun，腾讯云）
   ├── 主容器：NestJS（端口 3000）
   └── 附属容器：MySQL 8（挂载云硬盘，持久化）
         │
         ├── 管理后台 Vue3 → 云开发静态托管（免备案域名）/ 本机运行
         └── 菜品图片 → 腾讯云 COS（临时密钥直传）
```

架构说明：

- **无自建服务器、无域名、无备案**：全部依赖微信云开发生态的免备案能力。
- **Redis**：初期不引入；如后续需要缓存 / 限流，以云托管附属容器方式添加。
- **管理后台**：默认放云开发静态托管；仅管理员使用时也可只在本机运行。

---

# 三、技术选型（最终确认）

| 层 | 选型 | 理由 / 说明 |
|---|---|---|
| 小程序端 | **原生微信小程序** | 仅微信平台；原生 AI 生成质量最高、Bug 最少、文档最多 |
| 后端 | **NestJS + TypeScript** | 模块化、权限成熟、Swagger 自动文档、AI 最容易生成 |
| 数据库 | **MySQL 8** | 方案既定，运行于云托管附属容器 |
| ORM | **Prisma** | AI Coding 支持最好；迁移与类型安全 |
| 缓存 | **Redis（初期不引入）** | 5~10 人规模不需要；按需后加 |
| 管理后台 | **Vue3 + Vite + Element Plus** | AI 生成稳定 |
| 文件存储 | **腾讯云 COS** | 云开发生态内；临时密钥直传，免备案 |
| 部署 | **微信云托管（CloudRun）** | 免备案默认域名；个人规模费用极低 |
| 发布 | **体验版（不审核不发布）** | 5~10 人内部使用，免类目 / 资质 |

> 数据库统一使用 `utf8mb4` 字符集（备注、昵称可能包含 emoji）。

---

# 四、项目目录结构

```
restaurant-system/

    miniapp/                  # 原生微信小程序
        pages/
        components/
        utils/
        api/

    backend/                  # NestJS 后端
        src/
            auth/
            user/
            menu/
            order/
            payment/
            notify/
            admin/
        prisma/
        Dockerfile

    admin-web/                # Vue3 管理后台
        src/
            views/
            api/
            router/

    docs/                     # 文档与 AI 知识库
    database/                 # 由 Prisma 迁移生成
```

---

# 五、功能模块

> 各模块统一结构：目标 / 数据表 / 接口 / 关键规则。

## 5.1 登录模块

- **目标**：微信登录、自动注册、Token 签发与刷新。
- **数据表**：user
- **接口**：
  - `POST /auth/login`（code 换取）
  - `POST /auth/refresh`
- **关键规则**：
  - openid 唯一，不存在则自动注册。
  - 返回 accessToken + refreshToken。
  - AppSecret 只存后端环境变量，不进小程序代码。

## 5.2 权限模块

- **目标**：普通用户与管理员两套独立认证。
- **数据表**：user、admin
- **机制**：

  | 端 | 登录方式 | 令牌 | 守卫 |
  |---|---|---|---|
  | 小程序用户 | 微信登录 | user JWT | UserGuard |
  | 管理后台 | 账号密码（bcrypt） | admin JWT | AdminGuard |

- **关键规则**：管理员账号存独立 `admin` 表，不复用微信用户。

## 5.3 菜单与规格模块

- **目标**：分类、菜品、规格（组 / 项）、上下架、图片、库存。
- **数据表**：menu_category、menu、menu_spec_group、menu_spec_item
- **接口**：
  - `GET /menu/categories`
  - `GET /menu/list`
  - `GET /menu/:id`（含规格信息）
  - 后台：`POST / PUT / DELETE /admin/menu`、`/admin/category`
- **关键规则**：
  - 规格项支持 `price_delta` 加价。
  - 购物车按 `menu_id + 规格项 id 列表` 计算金额。
  - 图片上传走 COS 临时密钥直传。

## 5.4 购物车（本地缓存）

- **目标**：本地购物车，无后端接口。
- **存储**：小程序 Storage。
- **内容**：商品ID、规格项ID列表、数量、备注。
- **关键规则**：
  - v1 无 `/cart` 后端接口（v2 预留）。
  - 下单前本地校验，最终以下单接口的服务端校验为准。

## 5.5 订单模块

- **目标**：创建订单、订单详情、备注、取消。
- **数据表**：order、order_item
- **状态机**：待支付 → 已支付 → 制作中 → 已完成 / 已取消
- **接口**：
  - `POST /orders`（服务端重算价格 + 校验库存 + 幂等）
  - `GET /orders`
  - `GET /orders/:id`
  - `POST /orders/:id/cancel`（已支付自动退款回补）
- **关键规则（硬性）**：
  - 服务端按 `menu_id + 规格项 id` 重算总价，**不信任客户端金额**。
  - 校验上架状态与库存。
  - `client_order_no` 唯一约束实现幂等，防重复扣款。

## 5.6 订单备注

- **目标**：下单时填写，≤100 字。
- **数据表**：order.remark
- **关键规则**：数据库 `utf8mb4`，支持 emoji。

## 5.7 虚拟货币支付（余额）

- **目标**：余额支付、退款回补、流水记录；充值方式为管理员赠送。
- **数据表**：user.balance、wallet_log
- **流程**：
  - **支付**：下单 → 服务端重算 → 行锁扣余额 → 写流水（pay）→ 订单已支付（同一事务）。
  - **退款**：取消已支付订单 → 行锁回补余额 → 写流水（refund）→ 订单已取消（同一事务）。
  - **赠送**：管理员后台赠送 → 写流水（gift）→ 余额增加。
- **关键规则（硬性）**：
  - 扣款 / 回补使用 `SELECT ... FOR UPDATE` 行锁或 `version` 乐观锁。
  - 下单 + 扣款 + 流水同一事务，失败整体回滚。
  - 余额不足返回错误码 `40001`，不做部分扣款。

## 5.8 微信通知

- **目标**：订单状态变更通知。
- **模板**：下单成功 / 订单完成 / 退款通知。
- **关键规则**：
  - 订阅消息默认为**一次性**，下单前引导 `wx.requestSubscribeMessage` 订阅。
  - 个人主体可申请的点餐类模板有限；申请不到时**降级为订单页轮询状态**。

## 5.9 后台管理

- **目标**：菜单 / 分类 / 规格 / 订单 / 用户 / 统计管理。
- **接口**：
  - `POST /admin/auth/login`（账号密码）
  - `GET /admin/orders`、`POST /admin/orders/:id/complete`、`/cancel`
  - `GET /admin/users`、`POST /admin/users/:id/recharge`（赠送余额）、`/disable`
  - `POST / PUT / DELETE /admin/menu`、`/admin/category`
  - `GET /admin/stats`
- **页面**：登录、仪表盘、菜单管理（含规格）、分类管理、订单管理、用户管理（含赠送余额）、数据统计、系统设置。

---

# 六、数据库设计

> 统一约定：所有表使用 `utf8mb4`；含 `created_at` / `updated_at`；核心表含软删除 `deleted_at`。

## admin

```
id
username          UNIQUE 登录名
password          bcrypt 哈希
nickname
status            0禁用 1正常
created_at
updated_at
```

## user

```
id
openid            UNIQUE
nickname
avatar
role              默认 USER（预留）
balance           DECIMAL(10,2)
status            0禁用 1正常
created_at
updated_at
deleted_at        软删除
```

索引：`UNIQUE (openid)`

## menu_category

```
id
name
sort
status            0停用 1启用
created_at
updated_at
```

## menu

```
id
category_id
name
description
image
price             DECIMAL(10,2) 基础价
sales             销量（热销统计）
stock             库存
status            0下架 1上架
is_spec           是否有规格 0否 1是
sort
created_at
updated_at
deleted_at
```

索引：`INDEX (category_id)`、`INDEX (status)`

## menu_spec_group

```
id
menu_id
name              如：甜度、温度、加料、杯型
sort
status
created_at
updated_at
```

索引：`INDEX (menu_id)`

## menu_spec_item

```
id
group_id
name              如：全糖、半糖、加珍珠
price_delta       DECIMAL(10,2) 加价
sort
status
created_at
updated_at
```

索引：`INDEX (group_id)`

## order

```
id
order_no          UNIQUE 订单号
user_id
amount            DECIMAL(10,2) 实付金额
total_amount      DECIMAL(10,2) 原价
remark            VARCHAR(100) 备注
client_order_no   UNIQUE 客户端幂等键
status            待支付/已支付/制作中/已完成/已取消
pay_type          支付方式（balance）
pay_time
cancel_time
refund_time
created_at
updated_at
```

索引：`UNIQUE (order_no)`、`UNIQUE (client_order_no)`、`INDEX (user_id)`、`INDEX (status)`

## order_item

```
id
order_id
menu_id
menu_name         菜品名快照
spec_text         规格文本快照（如：半糖/少冰/加珍珠）
count
price             DECIMAL(10,2) 下单单价快照
total             DECIMAL(10,2)
```

索引：`INDEX (order_id)`

## wallet_log

```
id
user_id
order_id          关联订单（可空）
change            DECIMAL(10,2) 变动额（正/负）
balance_after     DECIMAL(10,2) 变动后余额快照
type              pay(消费) / gift(赠送) / refund(退款)
remark
created_at
```

索引：`INDEX (user_id)`、`INDEX (order_id)`

---

# 七、页面设计

## 用户端

```
登录
首页
分类菜单
菜品详情（选规格）
购物车（本地缓存）
确认订单
订单详情
我的订单
我的钱包（余额 + 流水明细）
个人中心
```

## 管理后台

```
登录（账号密码）
仪表盘
菜单管理（含规格配置）
分类管理
订单管理
用户管理（含赠送余额）
数据统计
系统设置
```

---

# 八、开发与部署顺序

## 8.1 模块清单（严格按顺序）

| 模块 | 名称 | 交付要点 |
|---|---|---|
| 00-schema | Prisma schema | 一次性定义全部表（含外键 / 索引 / 规格表 / 快照字段），`prisma migrate` 落地 |
| 01-auth | 登录 | 微信登录、JWT、Token 刷新 |
| 02-user | 用户 | 用户信息、钱包余额与流水 |
| 03-menu | 菜单 | 分类、菜品、规格（组 / 项）、图片上传 |
| 04-cart | 购物车 | 本地缓存，纯前端 |
| 05-order | 订单 | 创建（重算 + 校验 + 幂等）、详情、备注、取消 |
| 06-wallet | 钱包 | 余额支付（行锁）、退款回补、流水、并发控制 |
| 07-notify | 通知 | 微信订阅消息 |
| 08-admin | 后台 | 后台登录、菜单 / 用户 / 订单管理（含赠送、取消退款） |
| 09-dashboard | 统计 | 今日订单、营业额、用户数、热销商品 |

## 8.2 部署前置

- 在模块 03（图片上传）之前：完成云托管部署与合法域名配置（见第十六节），便于真机联调。

## 8.3 每模块完成清单

每完成一个模块，应包含：数据库模型、Service、Controller、DTO、API 文档、前端页面、单元测试、集成测试。

---

# 九、AI Coding 开发方式

不一次生成整个项目。采用：

```
一个功能
   ↓
一个 Prompt
   ↓
一个 Commit
   ↓
测试
   ↓
继续下一个功能
```

示例：

```
Prompt 0：一次性生成完整 Prisma Schema
Prompt 1：生成 NestJS 用户模块
Prompt 2：生成 JWT 登录
Prompt 3：生成 微信登录 API
Prompt 4：生成 用户中心页面
...
```

这样 AI 生成质量最高。

---

# 十、推荐开发工具

## IDE

★★★★★ Cursor
★★★★★ VSCode + GitHub Copilot
★★★★☆ Trae
★★★★☆ Windsurf

## AI 模型

★★★★★ GPT-5.5
★★★★★ Claude Opus / Sonnet（适合长代码）
★★★★☆ Gemini 2.5 Pro

## 接口调试

Apifox

## 数据库

Navicat Premium / DBeaver / Prisma Studio（开发期零配置）

## API 文档

Swagger（NestJS 自动生成）

## Git

GitHub / Gitea

## CI/CD（可选）

GitHub Actions / Docker / Nginx

---

# 十一、后续可扩展功能

- 优惠券系统
- 拼单
- 配送管理
- 门店管理
- 多商户支持
- 积分商城
- 营销活动
- 秒杀
- 限时折扣
- 打印小票 / 小票机
- WebSocket 实时叫号
- 数据大屏
- AI 智能推荐菜品
- AI 客服
- 服务端购物车（v2，/cart 接口）
- 用户自助充值（v2，预留微信支付/人工转账审核）

---

# 十二、API First 开发规范

## 流程

```
需求 → 数据库设计 → 接口设计（OpenAPI） → 后端开发 → 前端开发 → 联调 → 测试
```

## API 文档工具

- Swagger（NestJS）
- OpenAPI 3.1
- Apifox（接口调试与 Mock）

## 接口清单（RESTful）

### Auth

```
POST   /auth/login               # 微信登录（code 换取）
POST   /auth/refresh             # token 刷新
GET    /auth/profile
POST   /admin/auth/login         # 管理员账号密码登录
POST   /admin/auth/logout
```

### User

```
GET    /users/profile
PUT    /users/profile
GET    /users/wallet             # 钱包余额
GET    /users/wallet/logs        # 钱包流水
```

### Menu

```
GET    /menu/categories
GET    /menu/list
GET    /menu/:id                 # 含规格信息
```

### Cart

```
# v1：购物车为本地缓存，无后端接口
# v2（预留）：POST /cart/items、PUT /cart/items/:id、DELETE /cart/items/:id、GET /cart
```

### Order

```
POST   /orders                   # 创建订单（服务端重算价格 + 校验库存 + 幂等扣款）
GET    /orders
GET    /orders/:id
POST   /orders/:id/cancel        # 取消；已支付自动退款回补余额
```

### Admin

```
GET    /admin/orders
POST   /admin/orders/:id/complete
POST   /admin/orders/:id/cancel  # 取消并退款
GET    /admin/users
POST   /admin/users/:id/recharge # 管理员赠送余额
POST   /admin/users/:id/disable  # 禁用用户
GET    /admin/stats
POST   /admin/menu
PUT    /admin/menu/:id
DELETE /admin/menu/:id
POST   /admin/category
PUT    /admin/category/:id
DELETE /admin/category/:id
```

## 返回格式

统一返回：

```json
{ "code": 0, "message": "success", "data": {} }
```

错误返回：

```json
{ "code": 40001, "message": "余额不足", "data": null }
```

## 错误码（统一维护于 docs/error-code.md）

```
10001  参数错误
40001  余额不足
40002  库存不足
40003  菜品已下架
40004  订单状态不允许该操作
40005  重复提交
40101  token 过期或无效
```

---

# 十三、AI Coding 开发规范

## 开发模式

**一个模块 = 一个任务 = 一个 Commit**（模块顺序见「八、开发与部署顺序」）。

流程：

```
任务拆分 → AI 生成代码 → 人工 Review → 运行测试 → Git Commit → 进入下一模块
```

避免一次生成整个项目。

## Git Commit 规范（Conventional Commits）

```
feat(auth): 微信登录
feat(menu): 新增菜单管理
feat(menu): 新增菜品规格
feat(order): 创建订单
fix(wallet): 修复余额扣减并发
refactor(menu): 重构菜单查询
docs(api): 更新 Swagger
```

## Code Review 清单

每个模块完成后检查：

- 是否符合 TypeScript 规范、通过 ESLint
- 是否存在重复代码
- 是否有异常处理、是否记录日志
- 是否支持事务（涉及余额、库存、订单的模块必须）
- 是否处理并发 / 幂等（订单、钱包模块必须）
- 是否补充接口文档、编写测试用例

---

# 十四、AI Prompt 管理规范

## Prompt 仓库

```
docs/prompts/
    00-project-rule.md
    00-schema.md
    01-auth.md
    02-user.md
    03-menu.md
    04-cart.md
    05-order.md
    06-wallet.md
    07-notify.md
    08-admin.md
    09-dashboard.md
    10-test.md
```

## Prompt 编写规范

每个 Prompt 包含：目标、业务规则、数据库模型、接口定义、返回格式、异常处理、代码规范、测试要求、验收标准。

## 示例 Prompt 模板（钱包模块）

```
任务：开发钱包模块（余额支付、退款回补、流水记录）。

技术栈：NestJS、Prisma、MySQL。

业务规则：
1. 余额支付：下单时行锁（SELECT ... FOR UPDATE）扣减余额，写 wallet_log（type=pay），与订单创建同一事务
2. 退款回补：取消已支付订单时行锁回补余额，写 wallet_log（type=refund），与订单状态更新同一事务
3. 管理员赠送：POST /admin/users/:id/recharge，写 wallet_log（type=gift）
4. 余额不足返回错误码 40001，不做部分扣款
5. 创建订单使用 client_order_no 幂等，重复请求返回已创建订单

功能：
1. 余额查询
2. 余额扣减（行锁 + 事务）
3. 退款回补（行锁 + 事务）
4. 流水记录（含余额快照）
5. 管理员赠送余额

要求：
- 使用 Prisma $transaction（Interactive Transaction）
- 使用 DTO 校验、自动生成 Swagger、返回统一 Result 格式
- 编写并发测试用例、遵循项目编码规范

输出：Prisma Model、DTO、Service、Controller、Module、Swagger 注释、Jest 单元测试（含并发场景）。
```

## Prompt 最佳实践

流程：PRD → 数据库设计 → 接口设计 → Prompt 编写 → AI 生成 → 人工 Review → 测试 → Commit。

每个 Prompt 只聚焦一个模块或一个功能，避免一次生成过多内容。

---

# 十五、项目文档结构

```
docs/
├── README.md                 # 项目介绍
├── architecture.md           # 系统架构设计
├── database.md               # 数据库设计
├── api.md                    # API 总览
├── error-code.md             # 错误码定义
├── deployment.md             # 部署文档
├── coding-style.md           # 编码规范
├── ai-development-guide.md   # AI Coding 开发规范
├── prompts/                  # AI Prompt 仓库
├── api/
│   ├── auth.md
│   ├── user.md
│   ├── menu.md
│   ├── order.md
│   ├── wallet.md
│   └── admin.md
└── diagrams/
    ├── system-architecture.drawio
    ├── database-er.drawio
    ├── order-flow.drawio
    └── permission-flow.drawio
```

该文档结构作为整个项目的知识库（Knowledge Base），让 AI 工具始终参考统一规范和上下文，降低上下文丢失和代码风格不一致。

---

# 十六、部署与发布

## 16.1 主路径：体验版 + 云托管（本期采用）

**免备案、免审核、个人主体即可。**

### 前置准备

- 微信公众平台注册小程序（**个人主体，免费，无需微信认证**）→ 记录 AppID / AppSecret。
- 安装微信开发者工具。
- 腾讯云开通 CloudBase（云托管 / 静态托管 / COS）。
- 本机：Node.js（≥20）、Docker。

### 部署步骤

1. **云托管创建服务**：主容器运行 NestJS（端口 3000），附属容器运行 MySQL 8，数据目录挂载云硬盘持久化。
2. **配置环境变量**：

   ```
   DATABASE_URL=mysql://root:密码@内网MySQL地址:3306/restaurant?connection_limit=5
   JWT_SECRET=<随机强密钥>
   JWT_REFRESH_SECRET=<随机强密钥>
   WECHAT_APPID=<小程序 AppID>
   WECHAT_SECRET=<小程序 AppSecret>
   ```

3. **初始化数据库**：`npx prisma migrate deploy`。
4. **配置合法域名**：把云托管分配的默认 HTTPS 域名（形如 `https://<服务>-<环境id>.ap-shanghai.run.tcloudbase.com`）填入公众平台「服务器域名 → request 合法域名」，**免备案，立即生效**。
5. **发布体验版**：开发者工具上传 → 后台设体验版 → 添加 5~10 个体验成员 → 成员扫码/搜索即可使用。

### 管理后台

- Vue3 `npm run build` 产物上传云开发**静态托管**（自带免备案 HTTPS 域名），或仅管理员本机运行。
- 若后台调用后端接口，需在 NestJS 配置 CORS。

### 订阅消息

- 模板申请需类目，个人主体可选点餐类模板有限；申请不到时降级为**订单页轮询状态**。

### 费用

- 小程序注册免费、免认证（省 300 元/年）。
- 云托管按量付费，5~10 人规模约每月几元~几十元。
- 静态托管有免费额度；无需购买域名。

### 注意事项

- 体验版更新需重新上传覆盖，成员无需操作。
- 定期用 `mysqldump` 导出数据库备份至 COS。
- AppSecret 只存后端环境变量，绝不进入小程序代码。
- 云托管首次访问可能有冷启动延迟（数秒）。

## 16.2 备选：正式上线（将来对外营业时）

若将来需要向公众开放，按以下路径迁移（代码与 Docker 配置可无缝复用）：

1. 备案域名（ICP）→ 云服务器 / 云托管自定义域名 → HTTPS。
2. 提交微信审核（需类目资质，可能需营业执照 / 食品经营许可证）。
3. 审核通过后正式发布。

---

# 附：本文档在知识库中的角色

本文档是 `docs/` 知识库的核心入口，涵盖需求、技术选型、数据库设计、开发规范与部署方案（v1.3）。

后续开发可在此基础上按需拆分为 `database.md`、`api.md`、`error-code.md` 等子文档，目标结构见「十五、项目文档结构」。
