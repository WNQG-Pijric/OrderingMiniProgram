import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** 微信登录请求：wx.login 获取的临时 code */
export class LoginDto {
  @ApiProperty({ description: 'wx.login 获取的临时 code' })
  @IsString()
  @IsNotEmpty({ message: 'code 不能为空' })
  code: string;
}
