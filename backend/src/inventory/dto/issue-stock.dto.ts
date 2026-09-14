import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class IssueStockDto {
  @IsInt()
  @Min(1)
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