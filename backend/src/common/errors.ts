/**
 * 错误码常量（唯一来源：docs/error-code.md，禁止自造未登记的错误码）
 *
 * 分段规则：1xxxx 通用/参数，2xxxx 认证/权限，3xxxx 用户/菜单业务，
 *          4xxxx 订单/钱包，5xxxx 系统/外部依赖。
 */
export const ErrorCode = {
  // ===== 通用（1xxxx） =====
  /** 参数错误：DTO 校验失败、字段缺失、格式非法 */
  PARAM_ERROR: 10001,
  /** 资源不存在：目标资源不存在或已删除 */
  RESOURCE_NOT_FOUND: 10002,
  /** 路由不存在：请求了未定义的接口路径 */
  ROUTE_NOT_FOUND: 10003,
  /** 请求过于频繁：限流触发（预留） */
  TOO_MANY_REQUESTS: 10004,

  // ===== 认证 / 权限（2xxxx） =====
  /** 未登录：未携带 token 或 token 缺失 */
  UNAUTHORIZED: 20001,
  /** 登录凭证无效：微信 code 换取会话失败 / openid 获取失败 */
  INVALID_CREDENTIALS: 20002,
  /** 账号或密码错误：管理员账号密码错误 */
  ACCOUNT_OR_PASSWORD_ERROR: 20003,
  /** 账号已被禁用：用户或管理员 status = 0 */
  ACCOUNT_DISABLED: 20004,
  /** 无权限访问：非管理员访问管理接口 */
  FORBIDDEN: 20005,
  /** token 过期或无效：过期、签名无效、被篡改 */
  TOKEN_EXPIRED: 40101,

  // ===== 用户 / 菜单业务（3xxxx） =====
  /** 用户不存在：openid 对应的用户不存在 */
  USER_NOT_FOUND: 30001,
  /** 分类不存在 */
  CATEGORY_NOT_FOUND: 31001,
  /** 菜品不存在或已删除 */
  MENU_NOT_FOUND: 31002,
  /** 规格项不存在 */
  SPEC_ITEM_NOT_FOUND: 31003,
  /** 公告不存在或已下线 */
  ANNOUNCEMENT_NOT_FOUND: 31004,
  /** 会话不存在 */
  CONVERSATION_NOT_FOUND: 31005,
  /** 无权访问该会话 */
  CONVERSATION_FORBIDDEN: 31006,
  /** 消息内容不合法 */
  INVALID_MESSAGE: 31007,
  /** 菜品上架中：删除前需先下架 */
  MENU_ON_SHELF_CANNOT_DELETE: 31008,
  /** 分类上架中：删除前需先下架 */
  CATEGORY_ENABLED_CANNOT_DELETE: 31009,

  // ===== 订单 / 钱包（4xxxx） =====
  /** 余额不足：扣款失败，不做部分扣款 */
  INSUFFICIENT_BALANCE: 40001,
  /** 库存不足：菜品库存不够下单数量 */
  INSUFFICIENT_STOCK: 40002,
  /** 菜品已下架 */
  MENU_OFF_SHELF: 40003,
  /** 订单状态不允许该操作 */
  ORDER_STATE_INVALID: 40004,
  /** 重复提交：相同 client_order_no 并发/重复请求 */
  DUPLICATE_SUBMIT: 40005,
  /** 订单不存在 */
  ORDER_NOT_FOUND: 40006,
  /** 无权操作该订单 */
  ORDER_FORBIDDEN: 40007,

  // ===== 系统 / 外部依赖（5xxxx） =====
  /** 系统内部错误：未预期的异常（兜底） */
  SYSTEM_ERROR: 50000,
  /** 微信服务调用失败：code2Session、订阅消息发送失败 */
  WECHAT_API_ERROR: 50001,
  /** 文件上传失败：COS 直传 / 服务端上传异常 */
  UPLOAD_FAILED: 50002,
} as const;

/** 错误码取值类型 */
export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 错误码 → 默认中文 message（用户可读） */
export const ErrorMessage: Record<ErrorCodeValue, string> = {
  [ErrorCode.PARAM_ERROR]: '参数错误',
  [ErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
  [ErrorCode.ROUTE_NOT_FOUND]: '接口不存在',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',

  [ErrorCode.UNAUTHORIZED]: '未登录',
  [ErrorCode.INVALID_CREDENTIALS]: '登录凭证无效',
  [ErrorCode.ACCOUNT_OR_PASSWORD_ERROR]: '账号或密码错误',
  [ErrorCode.ACCOUNT_DISABLED]: '账号已被禁用',
  [ErrorCode.FORBIDDEN]: '无权限访问',
  [ErrorCode.TOKEN_EXPIRED]: 'token 过期或无效',

  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.CATEGORY_NOT_FOUND]: '分类不存在',
  [ErrorCode.MENU_NOT_FOUND]: '菜品不存在',
  [ErrorCode.SPEC_ITEM_NOT_FOUND]: '规格项不存在',
  [ErrorCode.ANNOUNCEMENT_NOT_FOUND]: '公告不存在',
  [ErrorCode.CONVERSATION_NOT_FOUND]: '会话不存在',
  [ErrorCode.CONVERSATION_FORBIDDEN]: '无权访问该会话',
  [ErrorCode.INVALID_MESSAGE]: '消息内容不合法',
  [ErrorCode.MENU_ON_SHELF_CANNOT_DELETE]: '菜品上架中，请先下架再删除',
  [ErrorCode.CATEGORY_ENABLED_CANNOT_DELETE]: '分类上架中，请先下架再删除',

  [ErrorCode.INSUFFICIENT_BALANCE]: '余额不足',
  [ErrorCode.INSUFFICIENT_STOCK]: '库存不足',
  [ErrorCode.MENU_OFF_SHELF]: '菜品已下架',
  [ErrorCode.ORDER_STATE_INVALID]: '订单状态不允许该操作',
  [ErrorCode.DUPLICATE_SUBMIT]: '重复提交',
  [ErrorCode.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCode.ORDER_FORBIDDEN]: '无权操作该订单',

  [ErrorCode.SYSTEM_ERROR]: '系统内部错误',
  [ErrorCode.WECHAT_API_ERROR]: '微信服务调用失败',
  [ErrorCode.UPLOAD_FAILED]: '文件上传失败',
};
