import { IsInt, IsOptional, IsString, NotEquals } from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  @NotEquals(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}