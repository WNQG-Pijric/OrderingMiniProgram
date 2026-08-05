import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * 修改个人资料：昵称 / 头像均可选，但至少修改一项（Service 层校验）。
 * 用 ValidateIf（仅 undefined 跳过）而非 IsOptional：IsOptional 会把 null
 * 也当作不校验，导致 { nickname: null } 静默落库清空字段。
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '昵称', example: '小食客' })
  @ValidateIf((o: UpdateProfileDto) => o.nickname !== undefined)
  @IsString({ message: '昵称必须为字符串' })
  @MinLength(1, { message: '昵称不能为空' })
  @MaxLength(30, { message: '昵称最长 30 个字符' })
  nickname?: string;

  @ApiPropertyOptional({
    description: '头像 URL（模块 03 支持 COS 临时密钥直传）',
    example: 'https://example.com/avatar.png',
  })
  @ValidateIf((o: UpdateProfileDto) => o.avatar !== undefined)
  @IsUrl({ require_protocol: true }, { message: '头像必须为合法 URL' })
  avatar?: string;
}
