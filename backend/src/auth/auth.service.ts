import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const SYSTEM_PERMISSIONS = [
  {
    code: 'item.view',
    description: 'View inventory items.',
  },
  {
    code: 'item.create',
    description: 'Create inventory items.',
  },
  {
    code: 'item.update',
    description: 'Update inventory items.',
  },
  {
    code: 'item.archive',
    description: 'Archive inventory items.',
  },

  {
    code: 'category.view',
    description: 'View categories.',
  },
  {
    code: 'category.create',
    description: 'Create categories.',
  },
  {
    code: 'category.update',
    description: 'Update categories.',
  },
  {
    code: 'category.delete',
    description: 'Delete categories.',
  },

  {
    code: 'supplier.view',
    description: 'View suppliers.',
  },
  {
    code: 'supplier.create',
    description: 'Create suppliers.',
  },
  {
    code: 'supplier.update',
    description: 'Update suppliers.',
  },
  {
    code: 'supplier.delete',
    description: 'Delete suppliers.',
  },

  {
    code: 'location.view',
    description: 'View stock locations.',
  },
  {
    code: 'location.create',
    description: 'Create stock locations.',
  },
  {
    code: 'location.update',
    description: 'Update stock locations.',
  },
  {
    code: 'location.delete',
    description: 'Delete stock locations.',
  },

  {
    code: 'stock.receive',
    description: 'Receive stock.',
  },
  {
    code: 'stock.issue',
    description: 'Issue stock.',
  },
  {
    code: 'stock.adjust',
    description: 'Adjust stock quantities.',
  },
  {
    code: 'stock.transfer',
    description: 'Transfer stock between locations.',
  },
  {
    code: 'stock.view_history',
    description: 'View stock transaction history.',
  },

  {
    code: 'report.view',
    description: 'View inventory reports.',
  },
  {
    code: 'report.export',
    description: 'Export inventory reports.',
  },

  {
    code: 'user.view',
    description: 'View organization users.',
  },
  {
    code: 'user.invite',
    description: 'Invite organization users.',
  },
  {
    code: 'user.update_role',
    description: 'Update organization user roles.',
  },
  {
    code: 'user.disable',
    description: 'Disable organization users.',
  },

  {
    code: 'organization.update',
    description: 'Update organization settings.',
  },
] as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email
      .trim()
      .toLowerCase();

    const existingUser =
      await this.prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists.',
      );
    }

    const passwordHash =
      await bcrypt.hash(
        dto.password,
        12,
      );

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * --------------------------------------------------
           * 1. Make sure all system permissions exist.
           * --------------------------------------------------
           *
           * This is important because a fresh database reset
           * removes permission records. Registration must not
           * depend on a previous seed having been executed.
           */
          await tx.permission.createMany({
            data: SYSTEM_PERMISSIONS.map(
              (permission) => ({
                code: permission.code,
                description:
                  permission.description,
              }),
            ),
            skipDuplicates: true,
          });

          /*
           * --------------------------------------------------
           * 2. Create user
           * --------------------------------------------------
           */
          const user =
            await tx.user.create({
              data: {
                name: dto.name.trim(),
                email,
                passwordHash,
              },
            });

          /*
           * --------------------------------------------------
           * 3. Create organization
           * --------------------------------------------------
           */
          const organization =
            await tx.organization.create({
              data: {
                name:
                  dto.organizationName.trim(),
                industryType:
                  dto.industryType
                    .trim()
                    .toLowerCase(),
              },
            });

          /*
           * --------------------------------------------------
           * 4. Create Owner role
           * --------------------------------------------------
           */
          const ownerRole =
            await tx.role.create({
              data: {
                orgId:
                  organization.id,
                name: 'Owner',
                roleType: 'system',
                description:
                  'Full access to the organization.',
              },
            });

          /*
           * --------------------------------------------------
           * 5. Fetch all system permissions
           * --------------------------------------------------
           */
          const permissions =
            await tx.permission.findMany({
              select: {
                id: true,
              },
            });

          /*
           * --------------------------------------------------
           * 6. Give Owner every permission
           * --------------------------------------------------
           */
          if (
            permissions.length > 0
          ) {
            await tx.rolePermission.createMany(
              {
                data: permissions.map(
                  (permission) => ({
                    roleId:
                      ownerRole.id,
                    permissionId:
                      permission.id,
                  }),
                ),
                skipDuplicates: true,
              },
            );
          }

          /*
           * --------------------------------------------------
           * 7. Attach user to organization
           * --------------------------------------------------
           */
          const membership =
            await tx.organizationMember.create(
              {
                data: {
                  orgId:
                    organization.id,
                  userId: user.id,
                  roleId:
                    ownerRole.id,
                  status: 'active',
                },
              },
            );

          return {
            user,
            organization,
            membership,
          };
        },
      );

    /*
     * ----------------------------------------------------
     * 8. Return authenticated session
     * ----------------------------------------------------
     */
    return this.createAuthResponse(
      result.user.id,
      result.user.email,
      result.organization.id,
      result.membership.roleId,
    );
  }

  async login(dto: LoginDto) {
    const email = dto.email
      .trim()
      .toLowerCase();

    const user =
      await this.prisma.user.findUnique({
        where: {
          email,
        },
        include: {
          memberships: {
            where: {
              status: 'active',
            },
            include: {
              organization: true,
              role: true,
            },
          },
        },
      });

    if (
      !user ||
      !user.passwordHash
    ) {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        dto.password,
        user.passwordHash,
      );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    if (
      user.memberships.length === 0
    ) {
      throw new UnauthorizedException(
        'Your account is not attached to an active organization.',
      );
    }

    const membership =
      user.memberships[0];

    if (!membership) {
      throw new UnauthorizedException(
        'Your account is not attached to an active organization.',
      );
    }

    return this.createAuthResponse(
      user.id,
      user.email,
      membership.orgId,
      membership.roleId,
    );
  }

  async getCurrentUser(
    payload: JwtPayload,
  ) {
    const membership =
      await this.prisma.organizationMember.findFirst(
        {
          where: {
            orgId: payload.orgId,
            userId: payload.sub,
            status: 'active',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                industryType: true,
                status: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      );

    if (!membership) {
      throw new UnauthorizedException(
        'Your account is not attached to an active organization.',
      );
    }

    return {
      user: membership.user,
      organization:
        membership.organization,
      role: membership.role,
    };
  }

  private async createAuthResponse(
    userId: string,
    email: string,
    organizationId: string,
    roleId: string,
  ) {
    const payload = {
      sub: userId,
      email,
      orgId: organizationId,
      roleId,
    };

    const accessToken =
      await this.jwtService.signAsync(
        payload,
      );

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: userId,
        email,
      },
      organization: {
        id: organizationId,
      },
      role: {
        id: roleId,
      },
    };
  }
}