import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** 规格项（如：半糖、加珍珠） */
export class CreateSpecItemDto {
  @ApiProperty({ description: '规格项名称', example: '半糖' })
  @IsString({ message: '规格项名称必须为字符串' })
  @IsNotEmpty({ message: '规格项名称不能为空' })
  @MaxLength(20, { message: '规格项名称最长 20 字' })
  name: string;

  @ApiPropertyOptional({ description: '加价金额（元）', example: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '加价金额最多两位小数' })
  @Min(0, { message: '加价金额不能为负数' })
  priceDelta?: number;

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

/** 规格组（如：甜度、温度、加料） */
export class CreateSpecGroupDto {
  @ApiProperty({ description: '规格组名称', example: '甜度' })
  @IsString({ message: '规格组名称必须为字符串' })
  @IsNotEmpty({ message: '规格组名称不能为空' })
  @MaxLength(20, { message: '规格组名称最长 20 字' })
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

  @ApiPropertyOptional({ description: '规格项列表', type: [CreateSpecItemDto] })
  @IsOptional()
  @IsArray({ message: '规格项必须为数组' })
  @ArrayMaxSize(30, { message: '每个规格组最多 30 个规格项' })
  @ValidateNested({ each: true })
  @Type(() => CreateSpecItemDto)
  items?: CreateSpecItemDto[];
}

/** 新增菜品（含规格组 / 规格项） */
export class CreateMenuDto {
  @ApiProperty({ description: '所属分类 ID', example: 1 })
  @IsInt({ message: '分类 ID 必须为整数' })
  @Min(1, { message: '分类 ID 不合法' })
  categoryId: number;

  @ApiProperty({ description: '菜品名称', example: '珍珠奶茶' })
  @IsString({ message: '菜品名称必须为字符串' })
  @IsNotEmpty({ message: '菜品名称不能为空' })
  @MaxLength(50, { message: '菜品名称最长 50 字' })
  name: string;

  @ApiPropertyOptional({
    description: '菜品描述',
    example: '现煮珍珠，口感 Q 弹',
  })
  @IsOptional()
  @IsString({ message: '描述必须为字符串' })
  @MaxLength(200, { message: '描述最长 200 字' })
  description?: string;

  @ApiPropertyOptional({
    description: '菜品图片 URL（COS）',
    example: 'https://xxx.cos.ap-shanghai.myqcloud.com/menu/xxx.jpg',
  })
  @IsOptional()
  @IsString({ message: '图片地址必须为字符串' })
  @MaxLength(500, { message: '图片地址过长' })
  image?: string;

  @ApiProperty({ description: '基础价（元）', example: 10 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: '基础价最多两位小数' })
  @Min(0, { message: '基础价不能为负数' })
  @Max(99999999, { message: '基础价超出范围' })
  price: number;

  @ApiPropertyOptional({ description: '库存', example: 100 })
  @IsOptional()
  @IsInt({ message: '库存必须为整数' })
  @Min(0, { message: '库存不能为负数' })
  stock?: number;

  @ApiPropertyOptional({ description: '状态：0下架 1上架', example: 1 })
  @IsOptional()
  @IsInt({ message: '状态必须为整数' })
  @IsIn([0, 1], { message: '状态只能为 0 或 1' })
  status?: number;

  @ApiPropertyOptional({
    description: '是否有规格（缺省按规格组是否为空自动推断）',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isSpec 必须为布尔值' })
  isSpec?: boolean;

  @ApiPropertyOptional({ description: '排序值（越小越靠前）', example: 0 })
  @IsOptional()
  @IsInt({ message: '排序值必须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @ApiPropertyOptional({
    description: '规格组列表',
    type: [CreateSpecGroupDto],
  })
  @IsOptional()
  @IsArray({ message: '规格组必须为数组' })
  @ArrayMaxSize(10, { message: '最多 10 个规格组' })
  @ValidateNested({ each: true })
  @Type(() => CreateSpecGroupDto)
  specGroups?: CreateSpecGroupDto[];
}
