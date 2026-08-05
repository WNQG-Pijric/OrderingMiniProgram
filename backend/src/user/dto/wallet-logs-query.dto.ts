import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** 钱包流水分页查询参数（项目首个分页接口，统一 page/pageSize 命名） */
export class WalletLogsQueryDto {
  @ApiPropertyOptional({
    description: '页码，从 1 开始',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page 必须为整数' })
  @Min(1, { message: 'page 最小为 1' })
  page = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 10, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize 必须为整数' })
  @Min(1, { message: 'pageSize 最小为 1' })
  @Max(50, { message: 'pageSize 最大为 50' })
  pageSize = 10;
}
