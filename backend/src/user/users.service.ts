import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { formatMoney } from '../common/money';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** 用户资料查看 / 修改、钱包余额与流水查询 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    // 活跃用户查询（存在 + status=1 + 未软删除）收敛在 AuthService 统一维护
    private readonly authService: AuthService,
  ) {}

  /** 当前登录用户资料 + 余额（不含 openid 等敏感字段） */
  async getProfile(userId: number) {
    const user = await this.findActiveUser(userId);
    return this.toSafeUser(user);
  }

  /**
   * 修改昵称 / 头像：只允许操作自己的数据（userId 取自 JWT），
   * 昵称与头像至少修改一项，逐字段更新。
   */
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    if (dto.nickname === undefined && dto.avatar === undefined) {
      throw new BizException(ErrorCode.PARAM_ERROR, '昵称和头像至少修改一项');
    }
    const user = await this.findActiveUser(userId);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(dto.nickname !== undefined ? { nickname: dto.nickname } : {}),
        ...(dto.avatar !== undefined ? { avatar: dto.avatar } : {}),
      },
    });
    return this.toSafeUser(updated);
  }

  /** 钱包余额（金额保留两位小数返回） */
  async getWallet(userId: number) {
    const user = await this.findActiveUser(userId);
    return { balance: formatMoney(user.balance) };
  }

  /** 钱包流水：按 created_at 倒序分页，金额转字符串返回 */
  async getWalletLogs(userId: number, page: number, pageSize: number) {
    await this.findActiveUser(userId);
    const where = { userId };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.walletLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.walletLog.count({ where }),
    ]);
    return {
      list: list.map((log) => ({
        ...log,
        change: formatMoney(log.change),
        balanceAfter: formatMoney(log.balanceAfter),
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 活跃用户查询：委托 AuthService 统一实现（存在 + status=1 + 未软删除） */
  private async findActiveUser(userId: number): Promise<User> {
    return this.authService.findActiveUser(userId);
  }

  /** 剔除敏感字段；balance 保留两位小数返回 */
  private toSafeUser(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      balance: formatMoney(user.balance),
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
