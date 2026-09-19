import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AdministrationService } from './administration.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('administration')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdministrationController {
  constructor(
    private readonly administrationService: AdministrationService,
  ) {}

  @Get('organization')
  getOrganization(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.administrationService.getOrganization(
      request.user.orgId,
    );
  }

  @Patch('organization')
  @RequirePermissions('organization.update')
  updateOrganization(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.administrationService.updateOrganization(
      request.user.orgId,
      dto,
    );
  }

  @Get('users')
  @RequirePermissions('user.view')
  getUsers(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.administrationService.getUsers(
      request.user.orgId,
    );
  }

  @Patch('users/:memberId/role')
  @RequirePermissions('user.update_role')
  updateUserRole(
    @Req() request: AuthenticatedRequest,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.administrationService.updateUserRole(
      request.user.orgId,
      memberId,
      dto,
    );
  }

  @Patch('users/:memberId/status')
  @RequirePermissions('user.disable')
  updateUserStatus(
    @Req() request: AuthenticatedRequest,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.administrationService.updateUserStatus(
      request.user.orgId,
      memberId,
      dto,
      request.user.sub,
    );
  }

  @Get('roles')
  @RequirePermissions('user.view')
  getRoles(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.administrationService.getRoles(
      request.user.orgId,
    );
  }

  @Get('permissions')
  @RequirePermissions('user.view')
  getPermissions() {
    return this.administrationService.getPermissions();
  }
}