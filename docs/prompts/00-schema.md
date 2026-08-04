# 00-schema：一次性定义完整 Prisma Schema

> 模块 00。项目第一个开发任务，**一次性定义全部数据库表**（含外键、索引、枚举、快照字段），`prisma migrate` 落地后再开发各业务模块。
>
> 前置规则见 `docs/prompts/00-project-rule.md`。字段以 `docs/README.md`「六、数据库设计」为准，**必须对齐，不得增删改字段**（如需调整先改文档）。

## 任务

在 `backend/` 下初始化 NestJS + Prisma 项目骨架，并生成完整 `prisma/schema.prisma`，执行 `prisma migrate` 落地数据库。

## 技术栈

NestJS、Prisma、MySQL 8（utf8mb4）。

## 数据库设计（严格对齐 README）

所有表约定：

- 字符集 `utf8mb4`（备注、昵称可能含 emoji）。
- 含 `created_at` / `updated_at`；核心表含软删除 `deleted_at`（`DateTime?`，非空即已删除）。
- 金额一律 `Decimal @db.Decimal(10,2)`，禁止 Float。
- `status` 字段 README 用 0/1 表示，Prisma 中建议用枚举，值含义不变（0=禁用/停用/下架，1=正常/启用/上架）。

### 1. admin（管理员）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | Int / BigInt 自增 | 主键 |
| username | String UNIQUE | 登录名 |
| password | String | bcrypt 哈希 |
| nickname | String? | 昵称 |
| status | Int（0禁用 1正常） | 建议枚举 |
| created_at / updated_at | DateTime | |

### 2. user（用户）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | 自增 | 主键 |
| openid | String UNIQUE | 微信 openid |
| nickname | String? | |
| avatar | String? | |
| role | Int / 枚举 | 默认 USER（预留） |
| balance | Decimal(10,2) | 余额，默认 0 |
| status | Int（0禁用 1正常） | |
| created_at / updated_at / deleted_at | DateTime | 软删除 |

索引：`UNIQUE (openid)`。

### 3. menu_category（菜品分类）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | 自增 | 主键 |
| name | String | 分类名 |
| sort | Int 默认 0 | 排序 |
| status | Int（0停用 1启用） | |
| created_at / updated_at | DateTime | |

### 4. menu（菜品）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | 自增 | 主键 |
| category_id | FK → menu_category | 分类 |
| name | String | 菜品名 |
| description | String? | 描述 |
| image | String? | COS 图片 URL |
| price | Decimal(10,2) | 基础价 |
| sales | Int 默认 0 | 销量（热销统计） |
| stock | Int 默认 0 | 库存 |
| status | Int（0下架 1上架） | |
| is_spec | Boolean 默认 false | 是否有规格 |
| sort | Int 默认 0 | |
| created_at / updated_at / deleted_at | DateTime | 软删除 |

索引：`INDEX (category_id)`、`INDEX (status)`。

### 5. menu_spec_group（规格组，如甜度/温度/加料）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | 自增 | 主键 |
| menu_id | FK → menu | 所属菜品 |
| name | String | 如：甜度、温度 |
| sort | Int | |
| status | Int | |
| created_at / updated_at | DateTime | |

索引：`INDEX (menu_id)`。

### 6. menu_spec_item（规格项，如全糖/半糖/加珍珠）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | 自增 | 主键 |
| group_id | FK → menu_spec_group | 所属组 |
| name | String | 如：全糖、半糖 |
| price_delta | Decimal(10,2) 默认 0 | 加价 |
| sort | Int | |
| status | Int | |
| created_at / updated_at | DateTime | |

索引：`INDEX (group_id)`。

### 7. order（订单）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | 自增 | 主键 |
| order_no | String UNIQUE | 订单号 |
| user_id | FK → user | |
| amount | Decimal(10,2) | 实付金额（服务端重算） |
| total_amount | Decimal(10,2) | 原价（含规格加价） |
| remark | String @db.VarChar(100) | 备注，≤100 字 |
| client_order_no | String UNIQUE | 客户端幂等键 |
| status | 枚举 | PENDING_PAYMENT 待支付 / PAID 已支付 / MAKING 制作中 / COMPLETED 已完成 / CANCELED 已取消 |
| pay_type | String / 枚举 | balance |
| pay_time / cancel_time / refund_time | DateTime? | |
| created_at / updated_at | DateTime | |

索引：`UNIQUE (order_no)`、`UNIQUE (client_order_no)`、`INDEX (user_id)`、`INDEX (status)`。

### 8. order_item（订单项，快照）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | 自增 | 主键 |
| order_id | FK → order | |
| menu_id | Int | 菜品 ID（快照冗余，不设强外键防删） |
| menu_name | String | 菜品名快照 |
| spec_text | String? | 规格文本快照（如：半糖/少冰/加珍珠） |
| count | Int | 数量 |
| price | Decimal(10,2) | 下单单价快照 |
| total | Decimal(10,2) | 小计 |

索引：`INDEX (order_id)`。

### 9. wallet_log（钱包流水）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | 自增 | 主键 |
| user_id | FK → user | |
| order_id | Int? | 关联订单（可空，如 gift） |
| change | Decimal(10,2) | 变动额（正/负） |
| balance_after | Decimal(10,2) | 变动后余额快照 |
| type | 枚举 | pay(消费) / gift(赠送) / refund(退款) |
| remark | String? | |
| created_at | DateTime | |

索引：`INDEX (user_id)`、`INDEX (order_id)`。

## 要求

- Prisma schema 用枚举表达 `status` / `role` / 订单状态 / 流水类型，并注释对应 0/1 语义（避免与 README 数值冲突时无法维护）。
- 外键关系用 Prisma relation（`@relation`），`onDelete` 策略：核心业务表用 `Restrict`（防误删级联），快照冗余字段不设强外键。
- `DATABASE_URL` 通过 `.env` / 环境变量注入（云托管内网 MySQL）。
- 生成迁移后执行 `prisma migrate dev`，确认迁移可应用。
- 初始化 `seed` 脚本（可选）：创建默认管理员账号（bcrypt 加密）。

## 验收标准

1. `npx prisma generate` 成功，类型可导出。
2. `npx prisma migrate dev` 成功建表，所有表 / 字段 / 索引与 README「六」一一对应。
3. 表字符集为 `utf8mb4`。
4. 项目结构符合 README「四」。
