import { Prisma } from '@prisma/client';

/**
 * 金额格式化：保留两位小数返回字符串。
 * Prisma.Decimal.toString() 会去掉小数尾零（如 10.00 → '10'），
 * 直接返回会导致前端显示缺失小数位，违反「金额精确到分」约定。
 */
export function formatMoney(value: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(value).toFixed(2);
}
