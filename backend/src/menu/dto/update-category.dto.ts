import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateIf } from 'class-validator';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * 修改分类：全字段可选。
 * 用 @ValidateIf 而非 @IsOptional：避免显式传 null 时静默清空字段。
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: '分类名称', example: '奶茶' })
  @ValidateIf((o: UpdateCategoryDto) => o.name !== undefined)
  @IsString({ message: '分类名称必须为字符串' })
  @IsNotEmpty({ message: '分类名称不能为空' })
  @MaxLength(20, { message: '分类名称最长 20 字' })
  name?: string;

  @ApiPropertyOptional({ description: '排序值（越小越靠前）', example: 0 })
  @ValidateIf((o: UpdateCategoryDto) => o.sort !== undefined)
  @IsInt({ message: '排序值必须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @ApiPropertyOptional({ description: '状态：0停用 1启用', example: 1 })
  @ValidateIf((o: UpdateCategoryDto) => o.status !== undefined)
  @IsInt({ message: '状态必须为整数' })
  @IsIn([0, 1], { message: '状态只能为 0 或 1' })
  status?: number;
}
