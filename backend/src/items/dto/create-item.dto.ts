import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsString()
  @IsNotEmpty()
  unitOfMeasure!: string;

  @IsString()
  @IsNotEmpty()
  unitPrice!: string;

  @IsOptional()
  @IsString()
  sellingPrice?: string | null;

  @IsInt()
  @Min(0)
  reorderLevel!: number;
}