# 08-chat：订单聊天模块（文字 + 实时推送）

> 前置规则：`docs/prompts/00-project-rule.md`。依赖模块 00 schema、01 auth、05 order。
> 样式规范：前端页面遵循 `docs/design.md`（app.wxss token + common.wxss `c-` 公共类），禁止硬编码色值/字号/间距。
>
> ⚠️ 本模块开发前，需先完成 WSS 合法域名配置（见 README「8.2 部署前置」），便于真机联调实时消息。

## 目标

用户与管理员围绕订单进行文字聊天，新消息实时推送。

## 数据表

- chat_conversation
- chat_message

## 接口

```
GET    /chats                    # 我的会话列表
GET    /chats/:id                # 会话详情（含订单信息）
GET    /chats/:id/messages       # 消息列表（分页）
POST   /chats/:id/messages       # 发送文字消息

GET    /admin/chats              # 管理员会话列表
GET    /admin/chats/:id/messages
POST   /admin/chats/:id/messages # 管理员回复
```

## 关键规则（硬性）

1. 一个订单对应一个会话，`chat_conversation.order_id` 唯一；会话在**首次访问时惰性创建**（进入会话列表 / 详情或发送首条消息时，含本模块上线前的历史订单），不与模块 05 下单流程强耦合。
2. 聊天仅支持文字，不支持图片和语音。
3. 新消息实时推送，使用 WSS 通道；支持断线重连和消息补偿。
4. 用户只能访问自己的会话，管理员只能通过 `/admin/*` 接口访问，返回 `31006`。
5. 消息展示发送者角色（user / admin）、发送时间和内容。
6. 会话维护 `user_unread_count` / `admin_unread_count`，读取后清零。
7. 消息列表按 `created_at` 升序分页返回。
8. 聊天消息为追加写表，不提供修改和删除。

## 输出物

- ChatModule：Controller / Service / DTO
- 会话与消息的实时推送服务（WSS Gateway 或等效方案）
- 小程序端：聊天 Tab、会话列表、聊天详情、订单详情聊天入口
- 管理员端：会话列表、订单聊天入口、回复消息
- Swagger 注解、单元测试 + 集成测试（实时消息、未读数、权限）

## 验收标准

1. 一个订单只能创建一个会话。
2. 用户和管理员发送消息后，对方实时收到。
3. 未读数量正确，读取后清零。
4. 非本人或非管理员访问会话返回 `31006`。
