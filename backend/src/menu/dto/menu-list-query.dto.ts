import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** 用户端菜品列表查询：可选按分类过滤 */
export class MenuListQueryDto {
  @ApiPropertyOptional({
    description: '分类 ID（可选，缺省返回全部分类下的菜品）',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '分类 ID 必须为整数' })
  @Min(1, { message: '分类 ID 不合法' })
  categoryId?: number;
}
