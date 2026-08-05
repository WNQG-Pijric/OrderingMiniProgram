import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    walletLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  /** 构造一个可用的用户对象（balance 用字符串模拟 Decimal） */
  const buildUser = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    openid: 'openid-test',
    nickname: '小食客',
    avatar: 'https://example.com/avatar.png',
    role: 'USER',
    balance: '10.00',
    status: 1,
    createdAt: new Date('2026-08-05T00:00:00Z'),
    updatedAt: new Date('2026-08-05T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  });

  /** 构造一条钱包流水（金额用字符串模拟 Decimal） */
  const buildLog = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    userId: 1,
    orderId: null,
    change: '-5.00',
    balanceAfter: '5.00',
    type: 'pay',
    remark: '订单消费',
    createdAt: new Date('2026-08-05T00:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('返回安全字段：不含 openid / deletedAt，balance 为字符串', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      const profile = await service.getProfile(1);
      expect(profile.id).toBe(1);
      expect(profile.nickname).toBe('小食客');
      expect(profile.balance).toBe('10.00');
      expect(profile).not.toHaveProperty('openid');
      expect(profile).not.toHaveProperty('deletedAt');
    });

    it('用户不存在 → 30001', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile(999)).rejects.toMatchObject({
        response: { code: ErrorCode.USER_NOT_FOUND },
      });
    });

    it('禁用用户（status=0）→ 20004 账号已被禁用', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser({ status: 0 }));
      await expect(service.getProfile(1)).rejects.toMatchObject({
        response: { code: ErrorCode.ACCOUNT_DISABLED },
      });
    });
  });

  describe('updateProfile', () => {
    it('只改昵称：update data 只含 nickname，返回更新后的安全字段', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      mockPrisma.user.update.mockResolvedValue(
        buildUser({ nickname: '新昵称' }),
      );

      const result = await service.updateProfile(1, { nickname: '新昵称' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nickname: '新昵称' },
      });
      expect(result.nickname).toBe('新昵称');
      expect(result).not.toHaveProperty('openid');
    });

    it('只改头像：update data 只含 avatar', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      mockPrisma.user.update.mockResolvedValue(
        buildUser({ avatar: 'https://example.com/new.png' }),
      );

      await service.updateProfile(1, {
        avatar: 'https://example.com/new.png',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { avatar: 'https://example.com/new.png' },
      });
    });

    it('昵称和头像都不传 → 10001 参数错误（不落库）', async () => {
      await expect(service.updateProfile(1, {})).rejects.toMatchObject({
        response: { code: ErrorCode.PARAM_ERROR },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('用户不存在 → 30001', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateProfile(999, { nickname: '新昵称' }),
      ).rejects.toMatchObject({
        response: { code: ErrorCode.USER_NOT_FOUND },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('getWallet', () => {
    it('返回余额字符串', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      const result = await service.getWallet(1);
      expect(result).toEqual({ balance: '10.00' });
    });

    it('用户不存在 → 30001', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getWallet(999)).rejects.toMatchObject({
        response: { code: ErrorCode.USER_NOT_FOUND },
      });
    });
  });

  describe('getWalletLogs', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(buildUser());
      mockPrisma.walletLog.findMany.mockResolvedValue([
        buildLog({ id: 2, change: '5.00', balanceAfter: '15.00' }),
        buildLog({ id: 1 }),
      ]);
      mockPrisma.walletLog.count.mockResolvedValue(2);
      mockPrisma.$transaction.mockImplementation(
        (queries: Promise<unknown>[]) => Promise.all(queries),
      );
    });

    it('created_at 倒序分页：skip/take 按 page/pageSize 计算', async () => {
      const result = await service.getWalletLogs(1, 2, 10);

      expect(mockPrisma.walletLog.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(mockPrisma.walletLog.count).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(result.total).toBe(2);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      // 金额转字符串，避免浮点误差
      expect(result.list[0].change).toBe('5.00');
      expect(result.list[0].balanceAfter).toBe('15.00');
      expect(result.list[1].type).toBe('pay');
    });

    it('用户不存在 → 30001（不查流水）', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getWalletLogs(999, 1, 10)).rejects.toMatchObject({
        response: { code: ErrorCode.USER_NOT_FOUND },
      });
      expect(mockPrisma.walletLog.findMany).not.toHaveBeenCalled();
    });
  });
});
