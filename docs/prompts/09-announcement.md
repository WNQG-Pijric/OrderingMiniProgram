# 09-announcement：公告模块

> 前置规则：`docs/prompts/00-project-rule.md`。依赖模块 00 schema、01 auth。

## 目标

管理员发布小程序内置公告，小程序首页顶部展示。

## 数据表

- announcement

## 接口

```
GET    /announcements            # 公告列表
GET    /announcements/latest     # 首页顶部最新公告
GET    /announcements/:id        # 公告详情
```

管理端 CRUD 接口在模块 10-admin 中提供，本模块先实现公告 Service 与用户端展示。

## 关键规则（硬性）

1. 公告包含标题和正文，支持 0下线 / 1发布。
2. 首页顶部展示当前启用的公告，按 `published_at` 倒序排列。
3. 用户端只返回已发布公告；不存在或已下线返回 `31004`。
4. 公告发布、编辑、上下线由管理员操作，必须走 `AdminGuard`。
5. 实现提示：`GET /announcements/latest` 必须注册在 `GET /announcements/:id` 之前，避免 `latest` 被当作 id 匹配。

## 输出物

- AnnouncementModule：Controller / Service / DTO
- 小程序端：首页顶部公告区、公告列表、公告详情
- Swagger 注解、单元测试

## 验收标准

1. 首页顶部正确展示最新已发布公告。
2. 已下线公告对用户端不可见。
3. 管理员发布、编辑、上下线公告后，用户端实时反映。
