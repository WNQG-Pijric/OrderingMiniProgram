# 03-menu：菜单模块（分类 / 菜品 / 规格 + 图片上传）

> 前置规则：`docs/prompts/00-project-rule.md`。依赖模块 00 schema。
>
> ⚠️ 本模块完成前，需先完成云托管部署与合法域名配置（见 README「8.2 部署前置」），便于真机联调图片上传。

## 目标

分类、菜品、规格（组 / 项）、上下架、图片（COS 临时密钥直传）。

## 数据表

- menu_category、menu、menu_spec_group、menu_spec_item

## 接口

用户端：

```
GET    /menu/categories      # 分类列表
GET    /menu/list            # 菜品列表（含规格，可选 category_id 过滤）
GET    /menu/:id             # 菜品详情（含规格信息）
```

管理后台：

```
POST   /admin/category       # 新增分类
PUT    /admin/category/:id
DELETE /admin/category/:id
POST   /admin/menu           # 新增菜品（含规格组/项）
PUT    /admin/menu/:id
DELETE /admin/menu/:id
GET    /admin/cos/sts        # 获取 COS 临时密钥（前端直传）
```

## 关键规则（硬性）

- 规格项支持 `price_delta` 加价；菜品最终单价 = 基础价 + 所选规格项 `price_delta` 之和。
- 用户端接口**只返回上架（status=1）且未软删除**的菜单。
- 下架菜品不影响历史订单（order_item 为快照）。
- 图片走 COS 临时密钥直传：后端签发临时密钥，小程序直传 COS，仅存 URL 到数据库。
- 删除分类 / 菜品采用软删除（`deleted_at`），历史数据可追溯。

## 输出物

- MenuModule + COS STS 服务（腾讯云临时密钥）
- 管理后台：菜单管理（含规格配置）、分类管理页面
- 小程序端：首页、分类菜单、菜品详情（选规格）页面
- Swagger 注解、单元测试

## 验收标准

1. 菜品详情正确返回基础价 + 规格组 / 项 + `price_delta`。
2. 下架 / 软删除菜品在用户端不可见。
3. 图片通过临时密钥直传 COS 成功。
