import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** 新增分类 */
export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称', example: '奶茶' })
  @IsString({ message: '分类名称必须为字符串' })
  @IsNotEmpty({ message: '分类名称不能为空' })
  @MaxLength(20, { message: '分类名称最长 20 字' })
  name: string;

  @ApiPropertyOptional({ description: '排序值（越小越靠前）', example: 0 })
  @IsOptional()
  @IsInt({ message: '排序值必须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @ApiPropertyOptional({ description: '状态：0停用 1启用', example: 1 })
  @IsOptional()
  @IsInt({ message: '状态必须为整数' })
  @IsIn([0, 1], { message: '状态只能为 0 或 1' })
  status?: number;
}
