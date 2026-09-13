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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName.trim(),
          industryType: dto.industryType.trim().toLowerCase(),
        },
      });

      const ownerRole = await tx.role.create({
        data: {
          orgId: organization.id,
          name: 'Owner',
          roleType: 'system',
          description: 'Full access to the organization.',
        },
      });

      const membership = await tx.organizationMember.create({
        data: {
          orgId: organization.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: 'active',
        },
      });

      return {
        user,
        organization,
        membership,
      };
    });

    return this.createAuthResponse(
      result.user.id,
      result.user.email,
      result.organization.id,
      result.membership.roleId,
    );
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
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

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.memberships.length === 0) {
      throw new UnauthorizedException(
        'Your account is not attached to an active organization.',
      );
    }

    const membership = user.memberships[0];

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

    const accessToken = await this.jwtService.signAsync(payload);

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