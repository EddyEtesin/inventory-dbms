import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateSupplierDto) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Supplier name is required.');
    }

    const existing = await this.prisma.supplier.findFirst({
      where: {
        orgId,
        name,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A supplier with this name already exists.',
      );
    }

    return this.prisma.supplier.create({
      data: {
        orgId,
        name,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        address: dto.address?.trim() || null,
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.supplier.findMany({
      where: {
        orgId,
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });
  }

  async findOne(orgId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        items: {
          select: {
            id: true,
            sku: true,
            name: true,
            status: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    return supplier;
  }

  async update(
    orgId: string,
    id: string,
    dto: UpdateSupplierDto,
  ) {
    const existing = await this.prisma.supplier.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Supplier not found.');
    }

    const newName = dto.name?.trim();

    if (newName) {
      const duplicate = await this.prisma.supplier.findFirst({
        where: {
          orgId,
          name: newName,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'A supplier with this name already exists.',
        );
      }
    }

    return this.prisma.supplier.update({
      where: {
        id: existing.id,
      },
      data: {
        ...(newName !== undefined && {
          name: newName,
        }),
        ...(dto.phone !== undefined && {
          phone: dto.phone.trim() || null,
        }),
        ...(dto.email !== undefined && {
          email: dto.email.trim().toLowerCase() || null,
        }),
        ...(dto.address !== undefined && {
          address: dto.address.trim() || null,
        }),
      },
    });
  }

  async remove(orgId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        items: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    if (supplier.items.length > 0) {
      throw new ConflictException(
        'Cannot delete a supplier that is assigned to an item.',
      );
    }

    await this.prisma.supplier.delete({
      where: {
        id: supplier.id,
      },
    });

    return {
      message: 'Supplier deleted successfully.',
    };
  }
}