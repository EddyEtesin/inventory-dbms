import {
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  unitOfMeasure!: string;

  @IsDecimal(
    {
      decimal_digits: '0,2',
      force_decimal: false,
    },
  )
  unitPrice!: string;

  @IsInt()
  @Min(0)
  reorderLevel!: number;
}