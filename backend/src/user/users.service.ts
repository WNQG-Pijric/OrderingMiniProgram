import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** 用户资料查看 / 修改、钱包余额与流水查询 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** 钱包余额（Decimal 序列化为字符串，避免浮点误差） */
  async getWallet(userId: number) {
    const user = await this.findActiveUser(userId);
    return { balance: user.balance.toString() };
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
        change: log.change.toString(),
        balanceAfter: log.balanceAfter.toString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 查询用户并校验：不存在抛 30001，禁用（status=0）抛 20004 */
  private async findActiveUser(userId: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BizException(ErrorCode.USER_NOT_FOUND);
    }
    if (user.status !== 1) {
      throw new BizException(ErrorCode.ACCOUNT_DISABLED);
    }
    return user;
  }

  /** 剔除敏感字段；balance（Decimal）序列化为字符串 */
  private toSafeUser(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      balance: user.balance.toString(),
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
