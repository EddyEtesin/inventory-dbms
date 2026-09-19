import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  NotEquals,
} from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  @NotEquals(0)
  quantity!: number;

  @IsNotEmpty()
  @IsString()
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}