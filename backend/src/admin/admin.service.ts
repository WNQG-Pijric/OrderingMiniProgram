import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Admin } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { BizException } from '../common/exceptions/biz.exception';
import { ErrorCode } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';

/**
 * 管理员认证（最小实现，模块 03 前置给 /admin/* 接口鉴权；
 * 完整的管理员模块在 10-admin 扩展）。
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 管理员账号密码登录：校验通过后签发 admin JWT（2h） */
  async login(dto: AdminLoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });
    // 账号不存在与密码错误统一返回 20003，避免暴露账号是否存在
    const passwordOk =
      admin && (await bcrypt.compare(dto.password, admin.password));
    if (!admin || !passwordOk) {
      throw new BizException(ErrorCode.ACCOUNT_OR_PASSWORD_ERROR);
    }
    this.assertActive(admin);

    const accessToken = await this.jwtService.signAsync(
      {
        adminId: admin.id,
        username: admin.username,
        type: 'admin-access' as const,
      },
      { secret: this.jwtSecret, expiresIn: '2h' },
    );
    return { accessToken, admin: this.toSafeAdmin(admin) };
  }

  /** 管理员状态校验：status=0 禁用 → 20004 */
  private assertActive(admin: Admin): void {
    if (admin.status !== 1) {
      throw new BizException(ErrorCode.ACCOUNT_DISABLED);
    }
  }

  /** 剔除密码等敏感字段 */
  private toSafeAdmin(admin: Admin) {
    return {
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      status: admin.status,
    };
  }

  private get jwtSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }
}
