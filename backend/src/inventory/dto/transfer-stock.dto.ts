import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class TransferStockDto {
  @IsUUID()
  fromLocationId!: string;

  @IsUUID()
  toLocationId!: string;

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