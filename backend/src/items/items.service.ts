import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateItemDto) {
    const sku = dto.sku.trim();
    const name = dto.name.trim();
    const unitOfMeasure = dto.unitOfMeasure.trim();

    if (!sku) {
      throw new BadRequestException('SKU is required.');
    }

    if (!name) {
      throw new BadRequestException('Item name is required.');
    }

    if (!unitOfMeasure) {
      throw new BadRequestException(
        'Unit of measure is required.',
      );
    }

    this.validateMoney(dto.unitPrice, 'Unit price');

    const existing = await this.prisma.item.findFirst({
      where: {
        orgId,
        sku,
      },
    });

    if (existing) {
      throw new ConflictException(
        'An item with this SKU already exists.',
      );
    }

    if (dto.categoryId) {
      await this.ensureCategoryBelongsToOrganization(
        orgId,
        dto.categoryId,
      );
    }

    if (dto.supplierId) {
      await this.ensureSupplierBelongsToOrganization(
        orgId,
        dto.supplierId,
      );
    }

    return this.prisma.item.create({
      data: {
        orgId,
        sku,
        name,
        description: dto.description?.trim() || null,
        categoryId: dto.categoryId ?? null,
        supplierId: dto.supplierId ?? null,
        unitOfMeasure,
        unitPrice: dto.unitPrice,
        reorderLevel: dto.reorderLevel,
      },
      include: {
        category: true,
        supplier: true,
      },
    });
  }

  async findAll(
    orgId: string,
    options?: {
      search?: string;
      categoryId?: string;
      supplierId?: string;
      status?: string;
    },
  ) {
    const search = options?.search?.trim();

    return this.prisma.item.findMany({
      where: {
        orgId,

        ...(search
          ? {
              OR: [
                {
                  sku: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),

        ...(options?.categoryId
          ? {
              categoryId: options.categoryId,
            }
          : {}),

        ...(options?.supplierId
          ? {
              supplierId: options.supplierId,
            }
          : {}),

        ...(options?.status
          ? {
              status: options.status as
                | 'active'
                | 'discontinued'
                | 'archived',
            }
          : {}),
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        category: true,
        supplier: true,
      },
    });
  }

  async findOne(orgId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        orgId,
        id,
      },
      include: {
        category: true,
        supplier: true,
        attributes: true,
        extension: true,
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found.');
    }

    return item;
  }

  async update(
    orgId: string,
    id: string,
    dto: UpdateItemDto,
  ) {
    const existing = await this.prisma.item.findFirst({
      where: {
        orgId,
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Item not found.');
    }

    const newSku = dto.sku?.trim();
    const newName = dto.name?.trim();
    const newUnit = dto.unitOfMeasure?.trim();

    if (newSku) {
      const duplicate = await this.prisma.item.findFirst({
        where: {
          orgId,
          sku: newSku,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'An item with this SKU already exists.',
        );
      }
    }

    if (newSku === '') {
      throw new BadRequestException('SKU cannot be empty.');
    }

    if (newName === '') {
      throw new BadRequestException(
        'Item name cannot be empty.',
      );
    }

    if (newUnit === '') {
      throw new BadRequestException(
        'Unit of measure cannot be empty.',
      );
    }

    if (dto.unitPrice !== undefined) {
      this.validateMoney(dto.unitPrice, 'Unit price');
    }

    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        await this.ensureCategoryBelongsToOrganization(
          orgId,
          dto.categoryId,
        );
      }
    }

    if (dto.supplierId !== undefined) {
      if (dto.supplierId) {
        await this.ensureSupplierBelongsToOrganization(
          orgId,
          dto.supplierId,
        );
      }
    }

    return this.prisma.item.update({
      where: {
        id,
      },
      data: {
        ...(newSku !== undefined && {
          sku: newSku,
        }),
        ...(newName !== undefined && {
          name: newName,
        }),
        ...(dto.description !== undefined && {
          description: dto.description.trim() || null,
        }),
        ...(dto.categoryId !== undefined && {
          categoryId: dto.categoryId || null,
        }),
        ...(dto.supplierId !== undefined && {
          supplierId: dto.supplierId || null,
        }),
        ...(newUnit !== undefined && {
          unitOfMeasure: newUnit,
        }),
        ...(dto.unitPrice !== undefined && {
          unitPrice: dto.unitPrice,
        }),
        ...(dto.reorderLevel !== undefined && {
          reorderLevel: dto.reorderLevel,
        }),
      },
      include: {
        category: true,
        supplier: true,
      },
    });
  }

  async archive(orgId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        orgId,
        id,
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found.');
    }

    if (item.status === 'archived') {
      return item;
    }

    return this.prisma.item.update({
      where: {
        id,
      },
      data: {
        status: 'archived',
      },
    });
  }

  private async ensureCategoryBelongsToOrganization(
    orgId: string,
    categoryId: string,
  ) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        orgId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException(
        'Category not found in this organization.',
      );
    }
  }

  private async ensureSupplierBelongsToOrganization(
    orgId: string,
    supplierId: string,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: supplierId,
        orgId,
      },
      select: {
        id: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found in this organization.',
      );
    }
  }

  private validateMoney(
    value: string,
    fieldName: string,
  ) {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException(
        `${fieldName} must be a valid non-negative amount.`,
      );
    }

    const decimalPart = value.split('.')[1];

    if (decimalPart && decimalPart.length > 2) {
      throw new BadRequestException(
        `${fieldName} cannot have more than 2 decimal places.`,
      );
    }
  }
}