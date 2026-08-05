import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateSpecGroupDto } from './create-menu.dto';

/**
 * 修改菜品：全字段可选。
 * 用 @ValidateIf 而非 @IsOptional：避免显式传 null 时静默清空字段。
 * 规格处理约定：传 specGroups → 全量替换；不传 → 规格保持不变。
 */
export class UpdateMenuDto {
  @ApiPropertyOptional({ description: '所属分类 ID', example: 1 })
  @ValidateIf((o: UpdateMenuDto) => o.categoryId !== undefined)
  @IsInt({ message: '分类 ID 必须为整数' })
  @Min(1, { message: '分类 ID 不合法' })
  categoryId?: number;

  @ApiPropertyOptional({ description: '菜品名称', example: '珍珠奶茶' })
  @ValidateIf((o: UpdateMenuDto) => o.name !== undefined)
  @IsString({ message: '菜品名称必须为字符串' })
  @IsNotEmpty({ message: '菜品名称不能为空' })
  @MaxLength(50, { message: '菜品名称最长 50 字' })
  name?: string;

  @ApiPropertyOptional({
    description: '菜品描述',
    example: '现煮珍珠，口感 Q 弹',
  })
  @ValidateIf((o: UpdateMenuDto) => o.description !== undefined)
  @IsString({ message: '描述必须为字符串' })
  @MaxLength(200, { message: '描述最长 200 字' })
  description?: string;

  @ApiPropertyOptional({ description: '菜品图片 URL（COS）' })
  @ValidateIf((o: UpdateMenuDto) => o.image !== undefined)
  @IsString({ message: '图片地址必须为字符串' })
  @MaxLength(500, { message: '图片地址过长' })
  image?: string;

  @ApiPropertyOptional({ description: '基础价（元）', example: 10 })
  @ValidateIf((o: UpdateMenuDto) => o.price !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '基础价最多两位小数' })
  @Min(0, { message: '基础价不能为负数' })
  @Max(99999999, { message: '基础价超出范围' })
  price?: number;

  @ApiPropertyOptional({ description: '库存', example: 100 })
  @ValidateIf((o: UpdateMenuDto) => o.stock !== undefined)
  @IsInt({ message: '库存必须为整数' })
  @Min(0, { message: '库存不能为负数' })
  stock?: number;

  @ApiPropertyOptional({ description: '状态：0下架 1上架', example: 1 })
  @ValidateIf((o: UpdateMenuDto) => o.status !== undefined)
  @IsInt({ message: '状态必须为整数' })
  @IsIn([0, 1], { message: '状态只能为 0 或 1' })
  status?: number;

  @ApiPropertyOptional({ description: '是否有规格' })
  @ValidateIf((o: UpdateMenuDto) => o.isSpec !== undefined)
  @IsBoolean({ message: 'isSpec 必须为布尔值' })
  isSpec?: boolean;

  @ApiPropertyOptional({ description: '排序值（越小越靠前）', example: 0 })
  @ValidateIf((o: UpdateMenuDto) => o.sort !== undefined)
  @IsInt({ message: '排序值必须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @ApiPropertyOptional({
    description: '规格组列表（传则全量替换）',
    type: [CreateSpecGroupDto],
  })
  @ValidateIf((o: UpdateMenuDto) => o.specGroups !== undefined)
  @IsArray({ message: '规格组必须为数组' })
  @ArrayMaxSize(10, { message: '最多 10 个规格组' })
  @ValidateNested({ each: true })
  @Type(() => CreateSpecGroupDto)
  specGroups?: CreateSpecGroupDto[];
}
