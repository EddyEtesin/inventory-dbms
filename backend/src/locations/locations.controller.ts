import {
  Body,
  Controller,
  Delete,
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
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
  ) {}

  @Get()
  @RequirePermissions('location.view')
  findAll(@Req() request: AuthenticatedRequest) {
    return this.locationsService.findAll(request.user.orgId);
  }

  @Get(':id')
  @RequirePermissions('location.view')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.locationsService.findOne(
      request.user.orgId,
      id,
    );
  }

  @Post()
  @RequirePermissions('location.create')
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateLocationDto,
  ) {
    return this.locationsService.create(
      request.user.orgId,
      dto,
    );
  }

  @Patch(':id')
  @RequirePermissions('location.update')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(
      request.user.orgId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @RequirePermissions('location.delete')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.locationsService.remove(
      request.user.orgId,
      id,
    );
  }
}