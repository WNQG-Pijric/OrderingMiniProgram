# 前端设计规范（微信点餐小程序）

> 配套文件：`miniapp/app.wxss`（token 定义）、`miniapp/common.wxss`（公共样式类）
>
> 适用场景：原生微信小程序，AI Coding 模块化开发
>
> 版本：v1.0（2026-08-05，基于现有页面用色用字统计提炼）

---

## 一、核心约定（硬性）

1. **禁止硬编码**：所有页面样式一律引用 `app.wxss` 中 `page` 上定义的 CSS 变量（`var(--xxx)`），不得写死色值/字号/间距。
2. **优先复用 `c-` 公共类**：`common.wxss` 已覆盖按钮/卡片/列表/标签等高频场景，新页面优先组合，避免每页重写一套。
3. **模块 Prompt 必须引用本规范**：各模块 Prompt（`docs/prompts/`）追加「样式遵循 `docs/design.md`」约定，AI 生成的页面自动用 token。
4. **新增 token 双写**：在 `app.wxss` 新增变量的同时，必须同步更新本文档对应表格。

---

## 二、设计 Token 体系

### 2.1 色彩

| 变量 | 值 | 用途 |
|---|---|---|
| `--color-primary` | `#ff9f43` | 主色（暖橙）：主按钮、选中态、Tab 高亮 |
| `--color-primary-active` | `#ff8c42` | 主色按压态 |
| `--color-primary-deep` | `#ff6a3d` | 主色深变体：渐变终点 |
| `--color-primary-light` | `#fff3e6` | 主色浅底：标签底、选中项背景 |
| `--color-danger` | `#ff4d2e` | 强调红：**价格高亮**、删除/取消等危险操作 |
| `--color-success` | `#07c160` | 成功（微信绿）：完成态、可用余额 |
| `--color-link` | `#576b95` | 链接（微信蓝）：开放能力相关文字链接 |
| `--color-mask` | `rgba(0,0,0,.5)` | 遮罩层（弹窗/半屏） |

### 2.2 文本色阶

| 变量 | 值 | 用途 |
|---|---|---|
| `--text-primary` | `#333333` | 一级文本：标题、正文 |
| `--text-secondary` | `#666666` | 二级文本：说明、label |
| `--text-tertiary` | `#888888` | 三级文本：次要信息 |
| `--text-placeholder` | `#999999` | 占位符 |
| `--text-disabled` | `#cccccc` | 禁用文本 |

### 2.3 背景与边框

| 变量 | 值 | 用途 |
|---|---|---|
| `--bg-page` | `#f5f5f5` | 页面背景（`page` 默认） |
| `--bg-card` | `#ffffff` | 卡片/内容区背景 |
| `--bg-muted` | `#f0f0f0` | 次级背景：输入框底、分组底 |
| `--bg-disabled` | `#eeeeee` | 禁用态背景 |
| `--border-color` | `#eeeeee` | 分割线、弱边框 |
| `--border-strong` | `#dddddd` | 强调边框、输入框描边 |

### 2.4 字号阶梯（rpx）

| 变量 | 值 | 用途 |
|---|---|---|
| `--font-size-tag` | 22rpx | 标签、角标 |
| `--font-size-small` | 24rpx | 辅助说明 |
| `--font-size-body-sm` | 26rpx | 次要正文 |
| `--font-size-body` | 28rpx | **基础正文**（`page` 默认） |
| `--font-size-body-lg` | 30rpx | 强调正文、按钮文字 |
| `--font-size-title-sm` | 32rpx | 小标题 |
| `--font-size-title` | 36rpx | 标题 |
| `--font-size-title-lg` | 40rpx | 大标题 |
| `--font-size-page-title` | 44rpx | 页面大标题 |
| `--font-size-display` | 72rpx | 展示大数字（余额卡片等） |

### 2.5 间距阶梯（rpx）

4 的倍数梯度：`--space-xs: 8` / `--space-sm: 12` / `--space-md: 16` / `--space-lg: 20` / `--space-xl: 24` / `--space-2xl: 32` / `--space-3xl: 40` / `--space-4xl: 48` / `--space-5xl: 60` / `--space-6xl: 80`

高频组合：单元格 `xl`、卡片内边距 `xl`、页面留白 `2xl~3xl`、大区块 `5xl~6xl`。

> 微调间隙（小于 `space-xs` 的 4rpx / 6rpx 级紧凑间距，如文本行内 gap）允许字面量书写，属刻意例外。

### 2.6 圆角与阴影

| 变量 | 值 | 用途 |
|---|---|---|
| `--radius-sm` | 8rpx | 标签、小元素 |
| `--radius-md` | 12rpx | 输入框 |
| `--radius-lg` | 16rpx | **卡片** |
| `--radius-xl` | 28rpx | 大容器 |
| `--radius-full` | 44rpx | 胶囊按钮 |
| `--shadow-card` | `0 2rpx 8rpx rgba(0,0,0,.06)` | 卡片层级 |
| `--shadow-pop` | `0 4rpx 16rpx rgba(0,0,0,.12)` | 弹层/浮层 |

---

## 三、rpx 适配规范

- **设计稿基准 750rpx 宽**，1rpx = 1/750 屏宽（`1px = 2rpx`，iPhone 6/7/8 上等值）。
- 1 物理像素细线用 `2rpx`（而非 `1rpx`，避免部分机型发虚）——现有页面分割线即 2rpx。
- 元素间距、字号一律用 **4 的倍数**，与间距阶梯对齐。
- 底部栏必须处理安全区：`padding-bottom: env(safe-area-inset-bottom)`（`.c-safe-bottom` 已封装）。
- 禁止使用绝对 px 写死宽高（图标等固定位图除外）。

---

## 四、公共样式类（common.wxss，`c-` 前缀）

| 类名 | 说明 |
|---|---|
| `.c-btn` | 基础按钮；修饰：`--primary`（主色）`--danger`（红）`--ghost`（描边）`--disabled` `--block`（通栏）`--sm` `--lg` |
| `.c-card` | 白底卡片：圆角 16rpx + 卡片阴影 |
| `.c-cell` | 列表单元格（flex 两端对齐）；`--label`/`--value` 子元素 |
| `.c-tag` | 标签；修饰：`--danger` `--success` |
| `.c-price` | 价格文本：红色加粗，`::before` 自动加 ¥ |
| `.c-divider` | 2rpx 分割线 |
| `.c-ellipsis` / `.c-ellipsis-2` | 单行/两行省略 |
| `.c-text-primary/secondary/tertiary/placeholder` | 文本色工具类 |
| `.c-flex` / `.c-flex-between` | 布局工具 |
| `.c-safe-bottom` | 底部安全区内边距 |
| `.c-empty` | 空状态容器 |

**用法示例**：

```xml
<button class="c-btn c-btn--primary c-btn--block">确认下单</button>
<view class="c-card">
  <view class="c-cell"><text class="c-cell__label">数量</text><text class="c-cell__value">×2</text></view>
</view>
<text class="c-price">28.00</text>
```

---

## 五、组件视觉约定

| 组件 | 规范 |
|---|---|
| 主按钮 | 主色底白字，胶囊圆角（`radius-full`），高 80rpx，按压变 `--color-primary-active` |
| 危险按钮 | `--color-danger` 底白字 |
| 卡片 | 白底 + `radius-lg` + `shadow-card`，内边距 `space-xl` |
| 单元格 | 左右两端对齐，label 用 `--text-secondary`，`cell + cell` 顶部 2rpx 分割线 |
| 价格 | 一律 `.c-price`（红色加粗 + ¥ 前缀），禁止其他颜色表达价格 |
| 列表分隔 | `--border-color` 2rpx，禁止用粗线/背景色块区分 |
| 表单输入 | 白底（或 `--bg-muted`）+ `radius-md` + `--border-strong` 描边，占位符 `--text-placeholder` |
| 空状态 | `.c-empty` 居中，文字 `--text-tertiary` |

---

## 六、微信平台特性

1. **底部安全区**：iPhone 横条机型使用 `env(safe-area-inset-bottom)`；固定底栏时容器加 `.c-safe-bottom`，底栏背景色需延伸到安全区（深色底用深色延伸）。
2. **自定义导航栏**：若 `navigationStyle: custom`，顶部内容必须避让**胶囊按钮**（右上角约 87px 宽 × 32px 高区域），状态栏高度用 `wx.getSystemInfoSync().statusBarHeight` 动态预留。
3. **暗黑模式**：当前未启用 `darkmode`（`app.json` 无 `"darkmode": true`），若后续启用，token 中颜色需按 `@media (prefers-color-scheme: dark)` 提供暗色变体，页面不直接写死色值（正是 token 化的收益）。
4. **导航栏配置**：`app.json` 全局 `navigationBarBackgroundColor: #ffffff` + `navigationBarTextStyle: black`，与 `--bg-card` 一致；页面级如需彩色导航栏，与主色 `--color-primary` 呼应。

---

## 七、落地检查清单（模块验收时使用）

- [ ] 页面 wxss 中无硬编码色值（`#` 开头字符串全部来自 token 或 `common.wxss` 白字等少数例外）
- [ ] 字号使用 `--font-size-*`，间距使用 4 的倍数
- [ ] 按钮/卡片/列表/标签/价格使用了 `c-` 公共类而非重写
- [ ] 固定底栏处理了安全区
- [ ] 新增 token 已同步本文档
