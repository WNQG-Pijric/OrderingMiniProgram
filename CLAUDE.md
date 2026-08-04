# OrderingMiniProgram 项目说明

## 项目简介

微信点餐小程序（个人使用，5~10 人，仅微信平台）。采用 AI Coding 模块化开发，不上线不备案（体验版 + 微信云托管）。

## 技术栈

- 小程序端：**原生微信小程序**
- 后端：**NestJS + TypeScript + Prisma + MySQL 8**
- 管理后台：**Vue3 + Vite + Element Plus**
- 文件存储：**腾讯云 COS**（临时密钥直传）
- 缓存：Redis（初期不引入，按需后加）
- 部署：**微信云托管**（免备案默认域名）

## 知识库

- 完整开发方案见 **`docs/README.md`**（需求、核心决策、数据库设计、API 规范、开发顺序、部署方案）。
- 所有开发决策以该文档为准，改动前先读它。

## AI Coding 开发规则（硬性）

- 严格按「八、开发与部署顺序」的**模块 00~09 逐个开发**：一个模块 = 一个 Prompt = 一个 Commit。
- 各模块的「**关键规则**」不得省略，尤其：服务端重算价格、库存校验、`client_order_no` 幂等、余额扣减行锁与事务。
- 数据库字段以 `docs/README.md`「六、数据库设计」为准，Prisma Model 必须与之对齐。
- 接口遵守「十二、API First 规范」：RESTful、统一 `{ code, message, data }` 返回、统一错误码。

## 语言

- 对话与代码注释使用中文。
- Git commit message 使用中文描述（Conventional Commits 格式）。
