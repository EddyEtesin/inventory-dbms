import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
  ) {}

  @Get()
  @RequirePermissions('item.view')
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
  ) {
    return this.itemsService.findAll(
      request.user.orgId,
      {
        search,
        categoryId,
        supplierId,
        status,
      },
    );
  }

  @Get(':id')
  @RequirePermissions('item.view')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.itemsService.findOne(
      request.user.orgId,
      id,
    );
  }

  @Post()
  @RequirePermissions('item.create')
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateItemDto,
  ) {
    return this.itemsService.create(
      request.user.orgId,
      dto,
    );
  }

  @Patch(':id')
  @RequirePermissions('item.update')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsService.update(
      request.user.orgId,
      id,
      dto,
    );
  }

  @Post(':id/archive')
  @RequirePermissions('item.archive')
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.itemsService.archive(
      request.user.orgId,
      id,
    );
  }
}