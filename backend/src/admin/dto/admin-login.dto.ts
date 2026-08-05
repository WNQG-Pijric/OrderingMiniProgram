import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** 管理员账号密码登录 */
export class AdminLoginDto {
  @ApiProperty({ description: '管理员登录名', example: 'admin' })
  @IsString({ message: '登录名必须为字符串' })
  @IsNotEmpty({ message: '登录名不能为空' })
  @MaxLength(32, { message: '登录名最长 32 位' })
  username: string;

  @ApiProperty({ description: '管理员密码', example: 'admin123456' })
  @IsString({ message: '密码必须为字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(64, { message: '密码最长 64 位' })
  password: string;
}
