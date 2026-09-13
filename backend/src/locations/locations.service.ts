import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateLocationDto) {
    const name = dto.name.trim();
    const locationType = dto.locationType.trim().toLowerCase();

    if (!name) {
      throw new BadRequestException('Location name is required.');
    }

    if (!locationType) {
      throw new BadRequestException(
        'Location type is required.',
      );
    }

    if (dto.parentId) {
      const parent = await this.prisma.location.findFirst({
        where: {
          id: dto.parentId,
          orgId,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent location not found.');
      }
    }

    const duplicate = await this.prisma.location.findFirst({
      where: {
        orgId,
        name,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'A location with this name already exists.',
      );
    }

    return this.prisma.location.create({
      data: {
        orgId,
        name,
        locationType,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.location.findMany({
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
    const location = await this.prisma.location.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        parent: true,
        children: true,
        inventories: {
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found.');
    }

    return location;
  }

  async update(
    orgId: string,
    id: string,
    dto: UpdateLocationDto,
  ) {
    const existing = await this.prisma.location.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Location not found.');
    }

    if (dto.parentId === id) {
      throw new BadRequestException(
        'A location cannot be its own parent.',
      );
    }

    if (dto.parentId) {
      const parent = await this.prisma.location.findFirst({
        where: {
          id: dto.parentId,
          orgId,
        },
        select: {
          id: true,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent location not found.');
      }

      await this.ensureNoCircularHierarchy(
        orgId,
        id,
        dto.parentId,
      );
    }

    const newName = dto.name?.trim();

    if (newName) {
      const duplicate = await this.prisma.location.findFirst({
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
          'A location with this name already exists.',
        );
      }
    }

    const newLocationType = dto.locationType
      ?.trim()
      .toLowerCase();

    return this.prisma.location.update({
      where: {
        id,
      },
      data: {
        ...(newName !== undefined && {
          name: newName,
        }),
        ...(newLocationType !== undefined && {
          locationType: newLocationType,
        }),
        ...(dto.parentId !== undefined && {
          parentId: dto.parentId,
        }),
      },
    });
  }

  async remove(orgId: string, id: string) {
    const location = await this.prisma.location.findFirst({
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
        inventories: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found.');
    }

    if (location.children.length > 0) {
      throw new ConflictException(
        'Cannot delete a location that has child locations.',
      );
    }

    if (location.inventories.length > 0) {
      throw new ConflictException(
        'Cannot delete a location that contains inventory.',
      );
    }

    await this.prisma.location.delete({
      where: {
        id: location.id,
      },
    });

    return {
      message: 'Location deleted successfully.',
    };
  }

  private async ensureNoCircularHierarchy(
    orgId: string,
    locationId: string,
    proposedParentId: string,
  ): Promise<void> {
    let currentParentId: string | null = proposedParentId;

    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new BadRequestException(
          'Location hierarchy contains a circular reference.',
        );
      }

      visited.add(currentParentId);

      if (currentParentId === locationId) {
        throw new BadRequestException(
          'This parent would create a circular location hierarchy.',
        );
      }

      const parent: { parentId: string | null } | null =
        await this.prisma.location.findFirst({
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
          'Parent location not found.',
        );
      }

      currentParentId = parent.parentId;
    }
  }
}