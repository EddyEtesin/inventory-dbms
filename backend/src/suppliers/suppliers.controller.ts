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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
  ) {}

  @Get()
  @RequirePermissions('supplier.view')
  findAll(@Req() request: AuthenticatedRequest) {
    return this.suppliersService.findAll(request.user.orgId);
  }

  @Get(':id')
  @RequirePermissions('supplier.view')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.suppliersService.findOne(
      request.user.orgId,
      id,
    );
  }

  @Post()
  @RequirePermissions('supplier.create')
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(
      request.user.orgId,
      dto,
    );
  }

  @Patch(':id')
  @RequirePermissions('supplier.update')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(
      request.user.orgId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @RequirePermissions('supplier.delete')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.suppliersService.remove(
      request.user.orgId,
      id,
    );
  }
}