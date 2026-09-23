import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AdministrationService } from './administration.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
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
      request.user.sub,
      dto,
    );
  }

  @Patch('organization/status')
  @RequirePermissions('organization.update')
  updateOrganizationStatus(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateOrganizationStatusDto,
  ) {
    return this.administrationService.updateOrganizationStatus(
      request.user.orgId,
      request.user.sub,
      dto,
    );
  }

  @Post('users')
  @RequirePermissions('user.invite')
  createUser(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ) {
    return this.administrationService.createUser(
      request.user.orgId,
      request.user.sub,
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
      request.user.sub,
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

  @Get('audit-logs')
  @RequirePermissions('user.view')
  getAuditLogs(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.administrationService.getAuditLogs(
      request.user.orgId,
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