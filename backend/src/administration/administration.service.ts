import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

const SYSTEM_ROLE_PERMISSIONS: Record<string, string[] | 'ALL'> = {
  Owner: 'ALL',

  Admin: [
    'item.view',
    'item.create',
    'item.update',
    'item.archive',

    'category.view',
    'category.create',
    'category.update',
    'category.delete',

    'supplier.view',
    'supplier.create',
    'supplier.update',
    'supplier.delete',

    'location.view',
    'location.create',
    'location.update',
    'location.delete',

    'stock.receive',
    'stock.issue',
    'stock.adjust',
    'stock.transfer',
    'stock.view_history',

    'report.view',
    'report.export',

    'user.view',
    'user.invite',
    'user.update_role',
    'user.disable',
  ],

  Manager: [
    'item.view',
    'item.create',
    'item.update',

    'category.view',
    'category.create',
    'category.update',

    'supplier.view',
    'supplier.create',
    'supplier.update',

    'location.view',
    'location.create',
    'location.update',

    'stock.receive',
    'stock.issue',
    'stock.adjust',
    'stock.transfer',
    'stock.view_history',

    'report.view',
    'report.export',
  ],

  Staff: [
    'item.view',
    'category.view',
    'supplier.view',
    'location.view',
    'stock.receive',
    'stock.issue',
    'stock.transfer',
    'stock.view_history',
  ],

  Viewer: [
    'item.view',
    'category.view',
    'supplier.view',
    'location.view',
    'stock.view_history',
    'report.view',
  ],
};

const SYSTEM_ROLE_DESCRIPTIONS: Record<string, string> = {
  Owner: 'Full control of the organization.',
  Admin:
    'Manage users, inventory operations, and system administration.',
  Manager:
    'Manage inventory setup and day-to-day stock operations.',
  Staff:
    'Handle routine stock operations and view inventory information.',
  Viewer:
    'View inventory information, history, and reports.',
};

@Injectable()
export class AdministrationService {
  constructor(private readonly prisma: PrismaService) {}

  private async writeAuditLog(params: {
    orgId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: Prisma.InputJsonValue;
    newValues?: Prisma.InputJsonValue;
  }) {
    await this.prisma.auditLog.create({
      data: {
        orgId: params.orgId,
        ...(params.userId !== undefined
          ? {
              userId: params.userId,
            }
          : {}),
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ...(params.oldValues !== undefined
          ? {
              oldValues: params.oldValues,
            }
          : {}),
        ...(params.newValues !== undefined
          ? {
              newValues: params.newValues,
            }
          : {}),
      },
    });
  }

  private async ensureSystemRoles(orgId: string) {
    const permissions = await this.prisma.permission.findMany({
      select: {
        id: true,
        code: true,
      },
    });

    const permissionMap = new Map(
      permissions.map((permission) => [
        permission.code,
        permission.id,
      ]),
    );

    for (const [roleName, configuredPermissions] of Object.entries(
      SYSTEM_ROLE_PERMISSIONS,
    )) {
      const role = await this.prisma.role.upsert({
        where: {
          orgId_name: {
            orgId,
            name: roleName,
          },
        },
        update: {
          roleType: 'system',
          description: SYSTEM_ROLE_DESCRIPTIONS[roleName],
        },
        create: {
          orgId,
          name: roleName,
          roleType: 'system',
          description: SYSTEM_ROLE_DESCRIPTIONS[roleName],
        },
      });

      const permissionCodes =
        configuredPermissions === 'ALL'
          ? permissions.map((permission) => permission.code)
          : configuredPermissions;

      const rolePermissions = permissionCodes
        .map((code) => {
          const permissionId = permissionMap.get(code);

          if (!permissionId) {
            return null;
          }

          return {
            roleId: role.id,
            permissionId,
          };
        })
        .filter(
          (
            value,
          ): value is {
            roleId: string;
            permissionId: string;
          } => value !== null,
        );

      if (rolePermissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: rolePermissions,
          skipDuplicates: true,
        });
      }
    }
  }

  async getOrganization(orgId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: orgId,
      },
      select: {
        id: true,
        name: true,
        industryType: true,
        status: true,
        setupStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    return organization;
  }

  async updateOrganization(
    orgId: string,
    currentUserId: string,
    dto: UpdateOrganizationDto,
  ) {
    const data: {
      name?: string;
      industryType?: string;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();

      if (!data.name) {
        throw new BadRequestException(
          'Organization name cannot be empty.',
        );
      }
    }

    if (dto.industryType !== undefined) {
      data.industryType = dto.industryType
        .trim()
        .toLowerCase();

      if (!data.industryType) {
        throw new BadRequestException(
          'Industry type cannot be empty.',
        );
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'No organization changes were provided.',
      );
    }

    const organization = await this.prisma.organization.findUnique({
      where: {
        id: orgId,
      },
      select: {
        id: true,
        name: true,
        industryType: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    const updated = await this.prisma.organization.update({
      where: {
        id: orgId,
      },
      data,
      select: {
        id: true,
        name: true,
        industryType: true,
        status: true,
        setupStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.writeAuditLog({
      orgId,
      userId: currentUserId,
      action: 'ORGANIZATION_UPDATED',
      entityType: 'organization',
      entityId: orgId,
      oldValues: {
        name: organization.name,
        industryType: organization.industryType,
      },
      newValues: {
        name: updated.name,
        industryType: updated.industryType,
      },
    });

    return updated;
  }

  async updateOrganizationStatus(
    orgId: string,
    currentUserId: string,
    dto: UpdateOrganizationStatusDto,
  ) {
    const membership =
      await this.prisma.organizationMember.findFirst({
        where: {
          orgId,
          userId: currentUserId,
          status: 'active',
        },
        select: {
          id: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

    if (!membership) {
      throw new ForbiddenException(
        'Only an active organization owner can change organization status.',
      );
    }

    if (membership.role.name !== 'Owner') {
      throw new ForbiddenException(
        'Only the organization owner can change organization status.',
      );
    }

    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: orgId,
        },
        select: {
          id: true,
          name: true,
          industryType: true,
          status: true,
          setupStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    if (organization.status === dto.status) {
      return {
        message: `Organization is already ${dto.status}.`,
        organization,
      };
    }

    const updated =
      await this.prisma.organization.update({
        where: {
          id: orgId,
        },
        data: {
          status: dto.status,
        },
        select: {
          id: true,
          name: true,
          industryType: true,
          status: true,
          setupStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    await this.writeAuditLog({
      orgId,
      userId: currentUserId,
      action:
        dto.status === 'suspended'
          ? 'ORGANIZATION_SUSPENDED'
          : 'ORGANIZATION_REACTIVATED',
      entityType: 'organization',
      entityId: orgId,
      oldValues: {
        status: organization.status,
      },
      newValues: {
        status: updated.status,
      },
    });

    return {
      message:
        dto.status === 'suspended'
          ? 'Organization suspended successfully.'
          : 'Organization reactivated successfully.',
      organization: updated,
    };
  }

  async createUser(
    orgId: string,
    currentUserId: string,
    dto: CreateUserDto,
  ) {
    await this.ensureSystemRoles(orgId);

    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();

    if (!name) {
      throw new BadRequestException(
        'User name cannot be empty.',
      );
    }

    const existingUser =
      await this.prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists.',
      );
    }

    const role =
      await this.prisma.role.findFirst({
        where: {
          id: dto.roleId,
          orgId,
          roleType: 'system',
        },
        select: {
          id: true,
          name: true,
          roleType: true,
          description: true,
        },
      });

    if (!role) {
      throw new NotFoundException(
        'The selected role was not found in this organization.',
      );
    }

    if (role.name === 'Owner') {
      throw new ForbiddenException(
        'The Owner role cannot be assigned through user management.',
      );
    }

    const passwordHash =
      await bcrypt.hash(dto.password, 12);

    const created =
      await this.prisma.$transaction(
        async (tx) => {
          const user =
            await tx.user.create({
              data: {
                name,
                email,
                passwordHash,
              },
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              },
            });

          const membership =
            await tx.organizationMember.create({
              data: {
                orgId,
                userId: user.id,
                roleId: role.id,
                status: 'active',
              },
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                role: {
                  select: {
                    id: true,
                    name: true,
                    roleType: true,
                    description: true,
                  },
                },
              },
            });

          return {
            user,
            membership,
          };
        },
      );

    await this.writeAuditLog({
      orgId,
      userId: currentUserId,
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: created.user.id,
      newValues: {
        name: created.user.name,
        email: created.user.email,
        roleId: created.membership.role.id,
        roleName: created.membership.role.name,
        status: created.membership.status,
      },
    });

    return {
      message:
        'User created and activated successfully.',
      member: {
        id: created.membership.id,
        userId: created.user.id,
        name: created.user.name,
        email: created.user.email,
        role: created.membership.role,
        status: created.membership.status,
        joinedAt:
          created.membership.createdAt,
        userCreatedAt:
          created.user.createdAt,
        updatedAt:
          created.membership.updatedAt,
      },
    };
  }

  async getUsers(orgId: string) {
    const members =
      await this.prisma.organizationMember.findMany({
        where: {
          orgId,
          status: {
            not: 'removed',
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              roleType: true,
              description: true,
            },
          },
        },
      });

    return members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      status: member.status,
      joinedAt: member.createdAt,
      userCreatedAt: member.user.createdAt,
      updatedAt: member.updatedAt,
    }));
  }

  async updateUserRole(
    orgId: string,
    memberId: string,
    currentUserId: string,
    dto: UpdateUserRoleDto,
  ) {
    const membership =
      await this.prisma.organizationMember.findFirst({
        where: {
          id: memberId,
          orgId,
        },
        include: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

    if (!membership) {
      throw new NotFoundException(
        'Organization member not found.',
      );
    }

    if (membership.status === 'removed') {
      throw new BadRequestException(
        'A removed member cannot be assigned a role.',
      );
    }

    if (membership.role.name === 'Owner') {
      throw new ForbiddenException(
        'The Owner role cannot be changed.',
      );
    }

    const targetRole =
      await this.prisma.role.findFirst({
        where: {
          id: dto.roleId,
          orgId,
        },
        select: {
          id: true,
          name: true,
          roleType: true,
          description: true,
        },
      });

    if (!targetRole) {
      throw new NotFoundException(
        'The selected role was not found in this organization.',
      );
    }

    if (targetRole.name === 'Owner') {
      throw new ForbiddenException(
        'The Owner role cannot be assigned through user management.',
      );
    }

    if (targetRole.id === membership.roleId) {
      return {
        message: 'User already has this role.',
        member: {
          id: membership.id,
          userId: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          role: targetRole,
          status: membership.status,
        },
      };
    }

    const updated =
      await this.prisma.organizationMember.update({
        where: {
          id: membership.id,
        },
        data: {
          roleId: targetRole.id,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              roleType: true,
              description: true,
            },
          },
        },
      });

    await this.writeAuditLog({
      orgId,
      userId: currentUserId,
      action: 'USER_ROLE_UPDATED',
      entityType: 'user',
      entityId: updated.user.id,
      oldValues: {
        roleId: membership.role.id,
        roleName: membership.role.name,
      },
      newValues: {
        roleId: updated.role.id,
        roleName: updated.role.name,
      },
    });

    return {
      message: 'User role updated successfully.',
      member: {
        id: updated.id,
        userId: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.role,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async updateUserStatus(
    orgId: string,
    memberId: string,
    dto: UpdateUserStatusDto,
    currentUserId: string,
  ) {
    const membership =
      await this.prisma.organizationMember.findFirst({
        where: {
          id: memberId,
          orgId,
        },
        include: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

    if (!membership) {
      throw new NotFoundException(
        'Organization member not found.',
      );
    }

    if (membership.user.id === currentUserId) {
      throw new BadRequestException(
        'You cannot change your own account status.',
      );
    }

    if (membership.role.name === 'Owner') {
      throw new ForbiddenException(
        'The Owner account cannot be suspended.',
      );
    }

    if (membership.status === dto.status) {
      return {
        message: `User is already ${dto.status}.`,
        member: {
          id: membership.id,
          userId: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          role: membership.role,
          status: membership.status,
        },
      };
    }

    const updated =
      await this.prisma.organizationMember.update({
        where: {
          id: membership.id,
        },
        data: {
          status: dto.status,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              roleType: true,
              description: true,
            },
          },
        },
      });

    await this.writeAuditLog({
      orgId,
      userId: currentUserId,
      action:
        dto.status === 'suspended'
          ? 'USER_SUSPENDED'
          : 'USER_ACTIVATED',
      entityType: 'user',
      entityId: updated.user.id,
      oldValues: {
        status: membership.status,
      },
      newValues: {
        status: updated.status,
      },
    });

    return {
      message:
        dto.status === 'suspended'
          ? 'User suspended successfully.'
          : 'User activated successfully.',
      member: {
        id: updated.id,
        userId: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.role,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async getRoles(orgId: string) {
    await this.ensureSystemRoles(orgId);

    const roles =
      await this.prisma.role.findMany({
        where: {
          orgId,
          roleType: 'system',
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          roleType: true,
          description: true,
          permissions: {
            orderBy: {
              permission: {
                code: 'asc',
              },
            },
            select: {
              permission: {
                select: {
                  id: true,
                  code: true,
                  description: true,
                },
              },
            },
          },
        },
      });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      roleType: role.roleType,
      description: role.description,
      permissions: role.permissions.map(
        (rolePermission) =>
          rolePermission.permission,
      ),
    }));
  }

  async getPermissions() {
    return this.prisma.permission.findMany({
      orderBy: {
        code: 'asc',
      },
      select: {
        id: true,
        code: true,
        description: true,
      },
    });
  }

  async getAuditLogs(
    orgId: string,
    limit = 100,
  ) {
    const safeLimit = Math.min(
      Math.max(limit, 1),
      100,
    );

    return this.prisma.auditLog.findMany({
      where: {
        orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: safeLimit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        oldValues: true,
        newValues: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}