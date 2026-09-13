import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateCategoryDto) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Category name is required.');
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: {
          id: dto.parentId,
          orgId,
        },
      });

      if (!parent) {
        throw new NotFoundException(
          'Parent category not found.',
        );
      }
    }

    const existing = await this.prisma.category.findFirst({
      where: {
        orgId,
        name,
        parentId: dto.parentId ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A category with this name already exists at this level.',
      );
    }

    return this.prisma.category.create({
      data: {
        orgId,
        name,
        description: dto.description?.trim() || null,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.category.findMany({
      where: {
        orgId,
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        children: true,
      },
    });
  }

  async findOne(orgId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        parent: true,
        children: true,
        items: {
          select: {
            id: true,
            sku: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  async update(
    orgId: string,
    id: string,
    dto: UpdateCategoryDto,
  ) {
    const existing = await this.prisma.category.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Category not found.');
    }

    if (dto.parentId === id) {
      throw new BadRequestException(
        'A category cannot be its own parent.',
      );
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: {
          id: dto.parentId,
          orgId,
        },
      });

      if (!parent) {
        throw new NotFoundException(
          'Parent category not found.',
        );
      }

      await this.ensureNoCircularHierarchy(
        orgId,
        id,
        dto.parentId,
      );
    }

    const newName = dto.name?.trim();

    if (newName) {
      const duplicate = await this.prisma.category.findFirst({
        where: {
          orgId,
          name: newName,
          parentId:
            dto.parentId !== undefined
              ? dto.parentId
              : existing.parentId,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'A category with this name already exists at this level.',
        );
      }
    }

    return this.prisma.category.update({
      where: {
        id,
      },
      data: {
        ...(newName !== undefined && {
          name: newName,
        }),
        ...(dto.description !== undefined && {
          description: dto.description.trim() || null,
        }),
        ...(dto.parentId !== undefined && {
          parentId: dto.parentId,
        }),
      },
    });
  }

  async remove(orgId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        children: {
          select: {
            id: true,
          },
        },
        items: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    if (category.children.length > 0) {
      throw new ConflictException(
        'Cannot delete a category that has child categories.',
      );
    }

    if (category.items.length > 0) {
      throw new ConflictException(
        'Cannot delete a category that is assigned to an item.',
      );
    }

    await this.prisma.category.delete({
      where: {
        id: category.id,
      },
    });

    return {
      message: 'Category deleted successfully.',
    };
  }

  private async ensureNoCircularHierarchy(
    orgId: string,
    categoryId: string,
    proposedParentId: string,
  ): Promise<void> {
    let currentParentId: string | null = proposedParentId;

    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new BadRequestException(
          'Category hierarchy contains a circular reference.',
        );
      }

      visited.add(currentParentId);

      if (currentParentId === categoryId) {
        throw new BadRequestException(
          'This parent would create a circular category hierarchy.',
        );
      }

      const parent: { parentId: string | null } | null =
        await this.prisma.category.findFirst({
            where: {
                id: currentParentId,
                orgId,
            },
            select: {
                parentId: true,
            },
        });

      if (!parent) {
        throw new NotFoundException(
          'Parent category not found.',
        );
      }

      currentParentId = parent.parentId;
    }
  }
}