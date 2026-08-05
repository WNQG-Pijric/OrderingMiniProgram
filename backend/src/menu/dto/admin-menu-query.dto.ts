import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** 管理端菜品列表查询：分页 + 状态 / 关键字过滤（含下架菜品） */
export class AdminMenuQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须为整数' })
  @Min(1, { message: '页码最小为 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页条数（默认 10，最大 50）',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数必须为整数' })
  @Min(1, { message: '每页条数最小为 1' })
  @Max(50, { message: '每页条数最大为 50' })
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description: '状态过滤：0下架 1上架（缺省返回全部）',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '状态必须为整数' })
  @IsIn([0, 1], { message: '状态只能为 0 或 1' })
  status?: number;

  @ApiPropertyOptional({ description: '菜品名称关键字', example: '奶茶' })
  @IsOptional()
  @IsString({ message: '关键字必须为字符串' })
  @MaxLength(50, { message: '关键字最长 50 字' })
  keyword?: string;
}
