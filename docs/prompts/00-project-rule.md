# 00-project-rule：项目全局规则

> 本文件是**所有模块 Prompt 必须附带的前置规则**。开发任何模块前，先复制本文件内容作为上下文，再追加对应模块的 Prompt。

## 一、项目概述

微信点餐小程序（个人使用，5~10 人，仅微信平台，不上线不备案）。

- 小程序端：原生微信小程序（体验版）
- 后端：NestJS + TypeScript + Prisma + MySQL 8
- 管理端：同一微信小程序内权限隔离（无独立 Web 后台）
- 文件存储：腾讯云 COS（临时密钥直传）
- 部署：微信云托管（CloudRun），无自建服务器 / 无域名 / 无备案
- 支付：虚拟货币（余额），充值方式为管理员后台赠送，**无微信支付**
- 聊天：按订单文字会话，实时推送
- 公告：小程序首页顶部展示

## 二、技术栈与目录结构

```
restaurant-system/
    miniapp/                  # 原生微信小程序
        pages/admin/          # 管理员端页面（权限隔离）
        pages/chat/           # 聊天页面
        pages/announcement/   # 公告页面
    backend/                  # NestJS 后端（端口 3000）
        src/auth/ user/ menu/ order/ payment/ notify/ chat/ announcement/ admin/
        prisma/
        Dockerfile
    docs/                     # 文档与 AI 知识库
    database/                 # 由 Prisma 迁移生成
```

## 三、统一返回格式（强制）

所有接口返回统一结构：

```json
{ "code": 0, "message": "success", "data": {} }
```

错误返回：

```json
{ "code": 40001, "message": "余额不足", "data": null }
```

- `code = 0` 成功；非 0 为错误。
- 错误码统一维护于 **`docs/error-code.md`**，禁止自造未登记的错误码。
- `message` 必须为用户可读的中文。

## 四、硬性业务规则（不得省略）

以下规则为项目安全 / 一致性底线，任何涉及相关功能的模块都必须实现：

1. **服务端重算价格**：下单金额由服务端按 `menu_id + 规格项 id 列表` 重新计算，**绝不信任客户端传入金额**。
2. **库存校验**：创建订单时服务端校验菜品上架状态与库存，并发下用事务保证不超卖。
3. **幂等**：订单表 `client_order_no` 唯一约束实现幂等；重复请求返回已创建订单，禁止重复扣款。
4. **余额并发**：扣款 / 退款回补使用 `SELECT ... FOR UPDATE` 行锁（或 version 乐观锁），余额不足返回 `40001`，不做部分扣款。
5. **事务一致性**：下单 + 扣款 + 写流水必须在同一事务内，任一步失败整体回滚。
6. **Secret 安全**：AppSecret、JWT_SECRET 等只存后端环境变量，绝不进入小程序代码 / 前端。
7. **管理员端同一个小程序**：用户端与管理员端按角色权限隔离展示，所有 `/admin/*` 接口必须走 `AdminGuard`。
8. **聊天实时**：聊天为按订单维度的文字消息，实时推送；消息与未读状态必须持久化。
9. **公告首页展示**：公告由管理员发布，首页顶部展示当前启用的公告。

## 五、编码规范

- 后端 NestJS：Module → Controller → Service → DTO 分层；DTO 用 class-validator 校验。
- 使用 Swagger（`@ApiTags` / `@ApiOperation`）自动生成接口文档。
- 数据库访问统一走 Prisma；涉及金额、库存、订单的写操作必须使用 `$transaction`。
- 金额统一用 Prisma `Decimal`，禁止浮点数运算。
- 遵循 ESLint / Prettier；方法、变量命名清晰，注释使用中文。
- 每个 Service 的公共方法补充 JSDoc / 中文注释。

## 六、Git 规范（Conventional Commits）

```
feat(auth): 微信登录
feat(menu): 新增菜品规格
fix(wallet): 修复余额扣减并发
refactor(menu): 重构菜单查询
docs(api): 更新 Swagger
```

- 一个模块 = 一个 Commit。
- Commit message 使用中文，遵循 Conventional Commits 格式。

## 七、测试要求

每个模块必须包含：

- **单元测试**：Service 核心逻辑（价格重算、余额计算、状态流转）。
- **集成测试**：涉及并发 / 幂等的模块（订单、钱包）必须覆盖并发场景。
- 覆盖率不低于 80%。

## 八、每模块输出物清单

完成一个模块时，应产出并提交：

1. Prisma Model（如需新增字段，先对齐 `docs/README.md`「六、数据库设计」）
2. Module / Controller / Service / DTO
3. Swagger 注解（接口文档）
4. 单元测试 + 集成测试
5. 前端页面（小程序用户端或小程序内管理员端）
6. 更新对应 API 文档

---

> **用法**：后续每个模块 Prompt（`docs/prompts/01-auth.md` 等）均假设本文件规则已被加载，无需重复罗列全部规范。
