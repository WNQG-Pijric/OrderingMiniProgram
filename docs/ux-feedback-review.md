# 真机体验反馈与改进方案（给 codex 评审）

> 创建：2026-08-06
> 用途：用户真机调试后对页面排版与操作逻辑不满，经 Claude 走查定位根因后整理的交接文档。请评审方案合理性、补充遗漏、评估实施顺序。

## 一、背景

模块 00-04 已开发完成（后端 NestJS + 小程序原生前端）。用户真机调试后反馈多个页面排版与操作逻辑问题，涉及：首页、菜品详情页、购物车页、管理端全部页面、管理端登录页。

## 二、用户原始反馈（原话整理）

### 不满的页面
- 首页（分类+菜品列表）、菜品详情页、购物车页、管理端页面
- **首页一进入没有登录页面，登录页面也过于简陋**

### 排版问题
- 布局拥挤/留白不足、元素错位/不对齐、配色/字号不协调、整体偏简陋
- 首页 tab 布局简陋，排版紧凑
- 购物车页面无加购菜品时的「去点餐」按钮没有居中
- 管理员管理页面：菜单管理点击【全部】按钮**不展示全部的菜品**，同时页面**一直有提示**，提示内容【状态只展示 0 1，状态只能为整数】（开发口径，未映射为对客内容）
- 菜单管理页面点击【上架】【下架】按钮**没有选中的变化**

### 操作逻辑问题
- 跳转/返回路径不顺
- 缺确认/提示
- 新增菜品的规格时，**填写的加价没有保存上**
- 对于每个填写表单的位置是否做了关键信息的必填校验，填写数量的地方是否做了数字的校验

## 三、走查澄清提问与用户回答

Claude 追问了 4 个问题，用户回答如下：

| 提问 | 用户回答 |
|---|---|
| 不满意的页面（多选） | 首页、菜品详情页、购物车页、管理端页面；补充：首页无登录页、登录页简陋 |
| 排版问题表现（多选） | 全选（拥挤/错位/配色/简陋）+ 具体描述见上节 |
| 操作逻辑问题表现（多选） | 跳转返回不顺、缺确认提示、加价未保存、必填/数字校验缺失 |
| 调整方式 | **先走查后出方案**（已完成，即本文档） |

### 已确认决策
1. 「首页没有登录页面」→ **方案 A（已确认）：保持微信静默登录**（游客可浏览，符合微信生态），仅优化「我的」页面登录状态展示。不做账号登录页、不做授权引导页。
2. 「跳转/返回路径不顺」→ **忽略，不处理**。

## 四、走查根因分析（含实测证据）

### Bug 1：管理端【全部】筛选失效 + "状态只能为 0 或 1"循环报错（P0）
- `miniapp/pages/admin/menu/menu.wxml:5` 全部按钮 `data-status=""` → 空字符串
- `menu.js` 构造请求参数 `status: status || undefined` 把空串转 `undefined`
- `wx.request`（GET）序列化 data 时把 `undefined` 编码为 `status=undefined` 传给后端
- 后端 `AdminMenuQueryDto.status`（`backend/src/menu/dto/admin-menu-query.dto.ts:37-41`）：`Number('undefined')` = NaN → `@IsInt`（"状态必须为整数"）+ `@IsIn`（"状态只能为 0 或 1"）双失败 → 422 业务错误 → 列表不刷新、每次切筛选都弹 toast
- **实测证据**：用 class-transformer + class-validator 直接跑 DTO：`'0'`→0 ✓、`'1'`→1 ✓、`''`→0 ✓，全部通过；说明后端转换本身没问题，坏在 `undefined` 被序列化成字符串 "undefined"

### Bug 2：上架/下架筛选按钮无选中态（P0）
- `menu.wxml:6-7` 高亮判断 `status === 1`（数字），但 `data-status="1"` dataset 拿到的是**字符串** `'1'` → 恒 false，选中态永不显示
- 同根因连带：`category.js:79` `status === 1 ? 0 : 1` 字符串比较 → **永远提交 status=1（启用）**，分类「停用」实际变成「启用」（用户未报，走查发现）

### Bug 3：规格加价"没有保存上"——3 条静默丢失路径（P0）
`miniapp/pages/admin/menu-edit/menu-edit.js:180-190` onSave：
1. **规格组名空 → 整组被静默过滤**（`filter(g => g.name.trim())`），填好的加价/规格项全部丢失，无提示
2. **加价填非法内容** → `Number(i.priceDelta)` = NaN → JSON 序列化变 `null` → 后端 `@IsOptional` 放过 → `priceDelta ?? 0` 兜底 → **静默存成 0**
3. **规格项名空 → 该行静默过滤**

### Bug 4：购物车空态「去点餐」按钮未居中（P1）
- `cart.wxss:16-18`：`c-btn--block` 已 `width:100%`（基于父容器内容宽），`.cart-empty__btn` 又加 `margin: 0 var(--space-3xl)` → 按钮宽度 100% + 左右 margin → **溢出屏幕**，视觉右偏

### 排版 / 逻辑问题（无 bug，优化项）
- 首页 tab 胶囊式简陋、列表紧凑
- 管理端登录页只有标题+输入框+按钮
- 购物车删除/清空无确认弹窗
- 详情页数量无库存上限、售罄无禁用态
- menu-edit 库存/排序/基础价/加价的数字校验缺失（Bug 3 已覆盖加价）

## 五、确认的改进方案

### A. Bug 修复（必修）

| # | 改动 | 文件 |
|---|---|---|
| A1 | **请求封装层统一剔除 undefined/null 字段**（根治所有页面同类问题） | `miniapp/utils/admin-request.js`、`miniapp/utils/request.js` |
| A2 | 后端 DTO 状态校验 message 改对客文案（如「状态筛选不正确」，备用防御） | `backend/src/menu/dto/admin-menu-query.dto.ts`（可选，前端修复后不再触发） |
| A3 | 筛选状态统一转 Number：`onFilterTap` 存数字，wxml 比较同步 | `menu.js`、`menu.wxml` |
| A4 | `category.js` 启停比较转 `Number(status)` | `category.js` |
| A5 | menu-edit onSave 完整校验：组名/项名必填、加价合法数字（两位小数≥0）、库存/排序数字，**不合法 toast 提示、不静默丢弃** | `menu-edit.js` |
| A6 | 购物车空态按钮去 margin（`width:100%` 由父容器 padding 约束） | `cart.wxss` |

### B. 排版优化（视觉）

| # | 页面 | 方案 |
|---|---|---|
| B1 | 首页 | tab 栏吸顶 + 选中态强化；卡片间距加大、信息层级重排（加销量/库存小字）；顶部购物车入口加数量角标（读本地购物车） |
| B2 | 管理端登录页 | 主色视觉区（品牌名+副标题）、输入框图标、密码可见切换、按钮强调、底部版本号 |
| B3 | 管理端菜单列表 | 筛选栏独立成行、操作按钮右对齐、卡片信息层级重排 |
| B4 | 菜品详情页 | 无规格提示样式化、底栏加库存显示、售罄禁用 |
| B5 | 全局一致性 | 统一左右边距、卡片圆角阴影，全部走 `docs/design.md` token（`app.wxss` + `common.wxss` `c-` 类，禁止硬编码） |

### C. 操作逻辑优化

| # | 改动 |
|---|---|
| C1 | 购物车删除/清空加 `wx.showModal` 确认（对齐管理端删除交互） |
| C2 | 详情页数量加号触达库存上限禁用；库存 0 显示「已售罄」并禁用加购 |
| C3 | 结算保留现链路（模块 05 确认订单页落地前，结算确认弹窗说明） |
| C4 | menu-edit 表单校验补全（并入 A5） |

### 已排除
- 跳转/返回路径优化（用户确认忽略）
- 登录页/账号体系（保持静默登录，仅优化「我的」页登录状态展示——注意「我的」页优化不在本次清单内，可另起）

## 六、验收标准

1. 管理端：点【全部】正常展示全部菜品、无循环报错提示；【上架】【下架】筛选切换有选中态；switch 切换状态真实生效
2. 管理端：新增菜品规格加价保存后编辑回显正确；非法输入有明确提示、不静默丢失
3. 购物车：空态「去点餐」按钮居中；删除/清空有确认弹窗
4. 首页：tab 吸顶、卡片信息层级清晰、购物车角标数字正确
5. 详情页：数量不可超过库存、售罄禁用加购
6. 全部样式遵循 design.md token（无硬编码色值/字号/间距，白字 `#ffffff` 例外）
7. 后端测试基线全绿（20 suites / 109 tests）；本次无后端逻辑改动（除 A2 文案）

## 七、评审请求

1. 方案是否有遗漏的根因或关联 bug？
2. A1 请求层过滤 undefined 的写法是否有兼容性风险（POST body 与 GET query 场景）？
3. 实施顺序建议：A（bug）→ C（逻辑）→ B（视觉），是否合理？

---

## 八、Codex 评审与方案完善（2026-08-06）

### 8.1 总体结论

Claude 的四个 P0/P1 根因定位方向正确，A → C → B 的实施顺序合理，可以执行。但方案需要三处修订：A1 不能无差别剔除 `null`；`category.js` 的字符串比较根因需要真机复核（`data-status="{{item.status}}"` 这类 Mustache 绑定在微信中通常保留 number 类型，静态 `data-status="1"` 才是字符串）；另外有 3 个关联问题未被原方案覆盖。

### 8.2 根因复核

| 条目 | 复核结论 |
|---|---|
| Bug 1：全部筛选传 `undefined` 变成 `"undefined"` | ✅ 属实。`status || undefined` 与 `wx.request` GET 序列化共同导致，请求层清理是根治 |
| Bug 2：筛选按钮无选中态 | ✅ 属实。`data-status="1"` 是静态字符串，`status === 1` 恒 false |
| Bug 2 连带：`category.js` 启停字符串比较 | ⚠️ 待真机复核。`data-status="{{item.status}}"` 是插值绑定，微信 dataset 对插值数字通常保留 number；不排除个别基础库转字符串。无论是否复现，都应改为 `Number(status)` 防御，修复保留 |
| Bug 3：规格加价静默丢失 | ✅ 属实。创建走 `@IsOptional` 时 `null` 被跳过校验并兜底为 0；更新走 `@ValidateIf` 时 `null` 会返回 10001。前端完整校验后两路都被拦截 |
| Bug 4：购物车空态按钮溢出 | ✅ 属实。`width:100%` + 左右 margin 溢出，去掉 margin 即可 |

### 8.3 原方案修订

**A1 修订：区分 GET 与 POST，且不要剔除 `null`**

- GET query：剔除 `undefined` 和 `null`（query 中二者都无业务语义）。
- POST/PUT body：只剔除 `undefined`，**保留 `null`**。项目后端 DTO 特意用 `@ValidateIf` 让显式 `null` 进入校验并返回 10001（模块 02 已固化该行为），请求层删掉 `null` 会改变“清空字段”的语义。
- 建议实现为两个小函数：`cleanQuery(data)` 过滤 `undefined/null`，`cleanBody(data)` 只过滤 `undefined`，在 `request.js` / `admin-request.js` 按 `method` 选择。当前请求都是扁平对象，顶层过滤即可。
- 同时保留页面侧修复：`menu.js` 不要用 `status || undefined`，直接用 `status === '' ? {} : { status }`，双保险。

**A3 补漏：统一数字转换**

- `menu.js` 的 `onFilterTap`：`Number(e.currentTarget.dataset.status)`，`data.status` 统一存数字。
- `menu.js` 的 `onToggleStatus`：同样 `Number(status)` 后再比较和提交，避免静态/动态 dataset 类型差异。
- `category.js` 的 `onToggleStatus`：统一 `Number(status)`。
- `menu.wxml` 筛选高亮比较改为与数字一致。

**A5 细化：表单校验规则**

| 字段 | 规则 | 提示 |
|---|---|---|
| 基础价 | 必填，非负数字，最多两位小数 | 「请输入正确的基础价」 |
| 库存 | 可空（空=0），非空必须非负整数 | 「库存必须是非负整数」 |
| 排序 | 可空（空=0），非空必须非负整数 | 「排序必须是非负整数」 |
| 规格组名 | 非空 | 定位到第 N 组 |
| 规格项名 | 非空 | 定位到第 N 组第 M 项 |
| 加价 | 可空（空=0），非空必须非负数字且最多两位小数 | 定位到第 N 组第 M 项 |

- 校验失败时 `return`，不进入过滤/提交，不静默丢弃。
- 保存按钮加 `saving` 状态，请求期间禁用防重复提交。
- `category.js` 的分类表单 `sort` 也做非负整数校验，避免 `Number(sort) || 0` 静默兜底。

### 8.4 补充遗漏

1. **菜单上下架 switch 的类型防御**：`menu.js` `onToggleStatus` 当前用 `status === 1` 比较 dataset，统一 `Number(status)` 后 toast 文案和提交值才可靠。
2. **首页没有 `onShow`**：购物车角标在从购物车/详情返回首页时不会刷新。B1 要新增 `onShow` 重新读取角标。
3. **加载失败与空数据混为一谈**：首页和管理端列表失败时都显示「暂无菜品/暂无数据」，用户会误以为没数据。增加 `loadError` 状态，失败显示「加载失败，点击重试」。
4. **错误 toast 连弹**：管理端列表每次请求失败都 `wx.showToast`，筛选快速切换会连续弹多个。建议列表区显示错误态，toast 仅在用户操作（保存/删除）时使用。
5. **购物车过期项提示**：符合 04-cart「本地缓存可能过期」规则。购物车 `onShow` 对现有条目轻量请求 `/menu/:id` 校验最新上架/库存，过期项标记「已下架 / 库存不足」，结算时阻止并提示。模块 05 仍需服务端重算。
6. **详情页加购按钮禁用态**：库存 0 时不仅数量禁用，按钮也应变灰并显示「已售罄」。
7. **管理端登录/表单按钮防重复**：登录按钮已有 loading，但保存类按钮未统一禁用。

### 8.5 排版优化补强

- **首页角标**：`cart.js` 新增 `getCount()`（按总件数累加，超过 99 显示 `99+`），首页 header 用 token 样式实现 Badge，不引第三方。
- **首页 tab 吸顶**：分类栏 `position: sticky; top: 0; z-index`，与设计 token 对齐。
- **管理端登录页**：品牌区、输入框图标、密码可见切换（原生 `input password` + 切换按钮）、版本号；输入框使用 `--bg-muted` + `--border-strong`。
- **侧滑删除**：本轮保持按钮删除；若后续要做，参考 TDesign `SwipeCell` 或 WeUI 的 cell 结构，不建议为单个交互引入整个组件库。

### 8.6 参考 GitHub 资料

- Tencent/tdesign-miniprogram：Stepper、Input、Dialog、Toast、Badge、SwipeCell 的交互结构，可参考局部实现，不整体引入。
- Tencent/weui-wxss：微信官方基础样式，form/cell/dialog/toast/button 结构适合登录页和表单，可映射到本项目 token。
- wechat-miniprogram/miniprogram-demo：官方 demo，参考列表、表单、输入校验的写法。
- DearChen/wechat-form-validate / @wdcjs/we-validator：轻量表单校验思路，本项目表单少，建议页面级校验函数，不引库。
- 微信官方 `wx.request` 文档：GET data 转 query string，`undefined` 会被序列化成 `"undefined"`，请求层清理属于根因级修复。

### 8.7 实施顺序与提交建议

建议拆成 4 个提交，便于 reviewer 逐项复核：

1. `fix(admin): 修复筛选状态、启停切换与表单校验`：A1 修订版 + A2 + A3 + A4 + A5 + 8.4 的 1/3/4。
2. `fix(cart): 空态布局、确认弹窗与角标工具`：A6 + C1 + 8.4 的 2 + `cart.getCount()`。
3. `feat(menu): 详情页库存上限与售罄态`：C2 + 8.4 的 5/6。
4. `style(ux): 首页、登录页与管理端排版优化`：B1-B5 + 8.5。

### 8.8 验收补充

除原验收标准外，增加：

- 管理端「全部 / 上架 / 下架」切换后，请求参数中没有 `status=undefined`。
- switch 上下架后，列表状态与 toast 文案一致（真机验证）。
- 规格组名/项名/加价非法时，页面明确提示且不产生保存请求。
- 首页网络失败显示「加载失败，点击重试」，成功但空数据显示「暂无菜品」。
- 从购物车返回首页，角标数字立即更新。
- 购物车中已下架/库存不足的菜品有标记，不能结算。

---

## 九、Claude 方案定稿（2026-08-06，吸收 8.x 评审）

### 9.1 吸收的评审修订（相对第五章原方案）

| 原方案条目 | 修订 |
|---|---|
| A1 请求层剔 undefined/null | **改为区分方法**：GET query 剔 `undefined`+`null`；POST/PUT body 只剔 `undefined`、**保留 `null`**（后端 `@ValidateIf` 用显式 null 触发 10001"字段不能为空"，删 null 会改变清空字段语义）。实现为 `miniapp/utils/params.js` 的 `cleanQuery()` / `cleanBody()` 两个函数，`request.js` 与 `admin-request.js` 按 method 选择。页面侧双保险：`menu.js` 改用 `status === '' ? {} : { status }` |
| A3 类型统一 | `onFilterTap` 存 `Number(dataset.status)`；`onToggleStatus`（switch）同样 `Number()` 后比较提交；`category.js onToggleStatus` 统一 `Number()`（⚠️ 该处插值绑定 dataset 可能保留 number，真机复核，但防御修复保留）；`menu.wxml` 高亮比较与数字一致 |
| A5 表单校验 | 按 8.3 规则表细化（基础价/库存/排序/组名/项名/加价），校验失败 `return` 不静默丢弃；保存按钮加 `saving` 防重复；`category.js` 分类表单 `sort` 加非负整数校验 |
| 补充遗漏 7 项 | 全部并入（见 9.2 任务清单） |
| 排版补强 | `cart.js` 新增 `getCount()`（总件数、99+ 封顶）；首页分类栏 `position: sticky` 吸顶；登录页细节按 8.5 |

### 9.2 最终任务清单（4 个 Commit，逐项可验收）

**Commit 1 `fix(admin)`：筛选状态、启停切换、表单校验、错误提示**（已实施 `1cf8e30`）

- [x] `miniapp/utils/params.js`（新建）：`cleanQuery` / `cleanBody` 两个函数
- [x] `miniapp/utils/request.js`、`admin-request.js`：按 method 应用 cleanQuery / cleanBody
- [x] `pages/admin/menu/menu.js`：`onFilterTap` 存 Number；`onToggleStatus` Number 防御；请求参数 `status === '' ? {} : { status }`；新增 `loadError` 状态（失败显示错误态，不再每次 toast）
- [x] `pages/admin/menu/menu.wxml`：高亮比较对齐数字；错误态「加载失败，点击重试」+ 空数据「暂无菜品」分开
- [x] `pages/admin/category/category.js`：`onToggleStatus` Number 防御；`onFormSave` 的 sort 非负整数校验
- [x] `pages/admin/menu-edit/menu-edit.js`：onSave 完整校验（8.3 规则表）+ `saving` 防重复提交
- [x] `pages/admin/menu-edit/menu-edit.wxml`：保存按钮 loading/禁用态
- [x] `pages/index/index.js` + `index.wxml`：`loadError` 状态（加载失败与暂无菜品分开）
- [x] `backend/src/menu/dto/admin-menu-query.dto.ts`：状态 message 改对客文案（备用防御，可选）

**Commit 2 `fix(cart)`：空态布局、确认弹窗、角标工具**（已实施 `2148eff`）

- [x] `pages/cart/cart.wxss`：`.cart-empty__btn` 去 margin（A6）
- [x] `pages/cart/cart.js`：删除/清空加 `wx.showModal` 确认（C1，模块 04 已实现，复核确认）；新增 `getCount()`（99+ 封顶在显示层）
- [x] `pages/index/index.wxml` + `index.wxss`：购物车入口角标（token 实现，不引第三方）
- [x] `pages/index/index.js`：新增 `onShow` 刷新角标（8.4-2）

**Commit 3 `feat(menu)`：详情页库存上限与售罄态**（已实施 `4aa10dd`）

- [x] `pages/menu/detail/detail.js` + `detail.wxml` + `detail.wxss`：数量上限（stock）、库存 0 时数量控件与加购按钮都禁用、按钮显示「已售罄」（C2 + 8.4-6）
- [x] `pages/cart/cart.js`：购物车 `onShow` 对条目轻量请求 `/menu/:id` 校验上架/库存，过期项标记「已下架 / 库存不足」，结算阻止并提示（8.4-5，04-cart 关键规则落地；模块 05 仍服务端重算）

**Commit 4 `style(ux)`：首页、登录页、管理端排版优化**（已实施 `12bbfc5`）

- [x] 首页：分类栏 sticky 吸顶 + 选中态强化、卡片间距/信息层级（B1 + 8.5）
- [x] 管理端登录页：品牌区、输入框标签、密码可见切换、版本号（B2 + 8.5）
- [x] 管理端菜单列表：筛选栏独立成行、操作按钮右对齐（B3）
- [x] 菜品详情页排版：无规格提示样式化、底栏布局（B4）
- [x] 全局一致性：边距/圆角/阴影统一走 design.md token（B5）

---

## 十、实施记录（2026-08-06）

按 9.2 顺序完成 4 个提交，全部验证通过：

| Commit | 内容 | 验证 |
|---|---|---|
| `1cf8e30` | fix(admin)：筛选状态、启停切换、表单校验、错误提示 | node --check ✓、109 tests ✓ |
| `2148eff` | fix(cart)：空态按钮居中、角标工具与首页角标 | node --check ✓、getCount 模拟 ✓ |
| `4aa10dd` | feat(menu)：详情页库存上限与售罄态、购物车过期项校验 | node --check ✓、判定逻辑模拟 ✓ |
| `12bbfc5` | style(ux)：首页、登录页与管理端排版优化 | node --check ✓、样式全 token ✓ |

实施说明：
- C1（购物车删除/清空确认）复核时发现模块 04 已实现，未重复添加
- 首页 tab 选中态阴影原方案含硬编码 rgba，按 design.md 规范移除，仅保留加粗
- 购物车过期项校验失败（网络异常）不阻塞结算，模块 05 服务端仍会重算
- 真机验证清单见 8.8 验收补充（筛选切换无 status=undefined、switch 反馈、非法输入拦截、角标刷新、过期项阻止结算）

### 10.1 module-reviewer 验收与复审（2026-08-06）

首轮验收 **FAIL（2 阻断项）**，均在购物车过期项校验链路：
- **F1「已下架」标记完全失效**：后端 `GET /menu/:id` 对已下架菜品抛 31002（而非返回 status=0），`request.js` reject 的 Error 不带业务码，`validateItems` 无法区分业务错误与网络失败 → 下架条目永无标记
- **F2 标记不渲染**：`validateItems` 完成仅 `setData({ staleMap })`，wxml 绑定 `{{item.stale}}`（render 时快照）→ 首次进入不显示，直到下次交互触发 render

修复提交 `f55a2f1`：request 封装 reject 挂 `err.code`；validateItems 按 `err.code === 31002` 判定已下架、网络失败不标记；校验完成后追加 `render()`。顺带修复：menu-edit 图片清空失效（`form.image || undefined` 吞掉空串）、「月售」改「销量」（累计销量语义）、角标定位 token 化。

**复审 PASS**：时序竞态静态核对 + 4 场景模拟通过（已下架/库存不足/网络失败/正常）；err.code 挂载覆盖所有 reject 路径，唯一已知限制为 access+refresh 双失效边缘场景不挂 code（`/menu/:id` 公开接口不会走该链，可接受）；image 清图链路后端实际置空确认；109 tests 全绿、工作区干净。

新增真机验证项：① 购物车首次进入过期标记立即显示且结算被阻止；② 首页角标 `calc()` + CSS 变量渲染（基础库版本支持）；③ 管理端编辑「删除图片」后保存图片真正清除。

### 10.2 Codex 复审（2026-08-06）：1 个必修 + 2 个建议，已修复并验证

codex 对 10.1 复审给出 **P1 必修 + P2/P3 建议**，全部核对属实并修复：

**P1（必修）首页「全部」tab 同源 bug**（与 B1 同根因）：`index.wxml` 的「全部」是静态 `data-id="0"`，dataset 拿到字符串 `"0"`；`onCategoryTap` 直接用原始值 → `activeCategoryId` 变字符串 `"0"`，`=== 0` 选中态恒 false；`loadMenus` 里 `categoryId ? {...} : {}` 把字符串 `"0"` 当 truthy 发送 `categoryId=0` → 后端按分类 0 过滤 → 空列表。修复：`onCategoryTap` 统一 `Number()`，`loadMenus` 改为 `categoryId > 0 ? { categoryId } : {}`。

**P2（建议）购物车过期校验只在进入时跑一次**：改数量后不重新校验、加号不按库存封顶、校验异步完成前可点结算绕过。修复：`validateItems` 拆分出 `checkItem`（单条校验，返回 `{key, stale, stock}`），新增 `stockMap`（库存快照，加号触顶）、`revalidateItem`（数量变更后重查单条，可解除「库存不足」）、`startValidate/endValidate`（计数式 `validating`，并发校验全部结束后才放行结算）；`onCheckout` 校验中拦截；wxml 加号 `item.count >= item.maxCount || item.stale` 禁用态。

**P3（建议）分类保存无防重复提交**：`category.js` 补 `saving` 状态（校验后置位、成功/失败复位），wxml 保存按钮 `loading/disabled` + 「保存中...」。

**验证（Node 模拟，16 项断言全过）**：P1 字符串 "0"/"2"/数字 3 三种 dataset → 选中态、幂等、请求参数全正确；P2 四场景（结算窗口拦截、加号触顶、减量解除标记、已下架拦截、网络失败不阻塞）+ validating 计数复位；P3 连点仅 1 请求、成功关弹层、失败复位。三个 JS 文件 `node --check` 通过；后端未改动。

### 9.3 验收标准（合并原 7 条 + 评审 6 条）

1. 管理端：点【全部】正常展示全部菜品、请求参数无 `status=undefined`、无循环报错；筛选切换有选中态；switch 上下架状态与 toast 文案一致（真机）
2. 规格组名/项名/加价/库存/排序非法时，页面明确提示且**不产生保存请求**；合法加价保存后编辑回显正确
3. 购物车：空态「去点餐」居中；删除/清空有确认弹窗；已下架/库存不足条目有标记、不能结算
4. 首页：tab 吸顶；网络失败显示「加载失败，点击重试」、空数据显示「暂无菜品」；从购物车返回角标立即更新
5. 详情页：数量不可超过库存；库存 0 售罄禁用（数量控件 + 加购按钮）
6. 全部样式遵循 design.md token（无硬编码色值/字号/间距，白字 `#ffffff` 与 `confirmColor` 主色例外）
7. 后端测试基线全绿（20 suites / 109 tests）；本次仅 A2 一处后端文案改动
8. 不引入任何组件库（TDesign/WeUI 仅作局部交互参考）

### 9.4 环境问题（不在本次范围，建议同时处理）

- **管理员端线上登录 20003**：云托管数据库未跑过 seed，需重新部署让 `prisma db seed` 生效（默认账号 admin/admin123456，上线前改密码）
- **开发者工具 `cart.wxml not found`**：工具缓存陈旧，文件存在；重启工具或清缓存即可

### 9.5 实施约束

- 参考 TDesign Stepper/Input/Dialog/Badge、WeUI form/cell 的交互结构做局部实现，**不引入组件库**
- 页面级表单校验函数即可（表单少，不引 we-validator）
- 每个 Commit 完成后跑 `node --check` + 后端 jest 基线 + 真机验证对应项
