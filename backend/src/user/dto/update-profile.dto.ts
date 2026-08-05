import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/** 修改个人资料：昵称 / 头像均可选，但至少修改一项（Service 层校验） */
export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '昵称', example: '小食客' })
  @IsOptional()
  @IsString({ message: '昵称必须为字符串' })
  @MinLength(1, { message: '昵称不能为空' })
  @MaxLength(30, { message: '昵称最长 30 个字符' })
  nickname?: string;

  @ApiPropertyOptional({
    description: '头像 URL（模块 03 支持 COS 临时密钥直传）',
    example: 'https://example.com/avatar.png',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: '头像必须为合法 URL' })
  avatar?: string;
}
