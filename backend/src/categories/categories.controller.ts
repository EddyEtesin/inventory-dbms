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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get()
  @RequirePermissions('category.view')
  findAll(@Req() request: AuthenticatedRequest) {
    return this.categoriesService.findAll(request.user.orgId);
  }

  @Get(':id')
  @RequirePermissions('category.view')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.categoriesService.findOne(
      request.user.orgId,
      id,
    );
  }

  @Post()
  @RequirePermissions('category.create')
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(
      request.user.orgId,
      dto,
    );
  }

  @Patch(':id')
  @RequirePermissions('category.update')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      request.user.orgId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @RequirePermissions('category.delete')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.categoriesService.remove(
      request.user.orgId,
      id,
    );
  }
}