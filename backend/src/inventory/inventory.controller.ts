import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { InventoryService } from './inventory.service';
import { Body } from '@nestjs/common';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { IssueStockDto } from './dto/issue-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  @Get('items/:itemId')
  @RequirePermissions('item.view')
  getItemInventory(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    return this.inventoryService.getItemInventory(
      request.user.orgId,
      itemId,
    );
  }

  @Get('locations/:locationId')
  @RequirePermissions('location.view')
  getLocationInventory(
    @Req() request: AuthenticatedRequest,
    @Param('locationId') locationId: string,
  ) {
    return this.inventoryService.getLocationInventory(
      request.user.orgId,
      locationId,
    );
  }

  @Get('items/:itemId/locations/:locationId')
  @RequirePermissions('item.view')
  getBalance(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.inventoryService.getBalance(
      request.user.orgId,
      itemId,
      locationId,
    );
  }

  @Post('items/:itemId/locations/:locationId/initialize')
  @RequirePermissions('item.update')
  initializeBalance(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.inventoryService.getOrCreateBalance(
      request.user.orgId,
      itemId,
      locationId,
    );
  }

  @Post('items/:itemId/locations/:locationId/opening-balance')
  @RequirePermissions('item.update')
  createOpeningBalance(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.inventoryService.createOpeningBalance(
      request.user.orgId,
      itemId,
      locationId,
      100,
      request.user.sub,
      'OPENING-001',
      'Initial opening stock',
    );
  }

  @Get('items/:itemId/locations/:locationId/transactions')
  @RequirePermissions('item.view')
  getItemLocationTransactions(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.inventoryService.getItemLocationTransactions(
      request.user.orgId,
      itemId,
      locationId,
    );
  }

  @Post('items/:itemId/locations/:locationId/receive')
  @RequirePermissions('item.update')
  receiveStock(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
    @Body() dto: ReceiveStockDto,
  ) {
    return this.inventoryService.receiveStock(
      request.user.orgId,
      itemId,
      locationId,
      dto.quantity,
      request.user.sub,
      dto.idempotencyKey,
      dto.reference,
      dto.notes,
    );
  }

  @Post('items/:itemId/locations/:locationId/adjust')
  @RequirePermissions('item.update')
  adjustStock(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(
      request.user.orgId,
      itemId,
      locationId,
      dto.quantity,
      request.user.sub,
      dto.reference,
      dto.notes,
    );
  }

    @Post('items/:itemId/locations/:locationId/issue')
  @RequirePermissions('item.update')
  issueStock(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
    @Body() dto: IssueStockDto,
  ) {
    return this.inventoryService.issueStock(
      request.user.orgId,
      itemId,
      locationId,
      dto.quantity,
      request.user.sub,
      dto.idempotencyKey,
      dto.reference,
      dto.notes,
    );
  }

  @Post('items/:itemId/transfer')
  @RequirePermissions('item.update')
  transferStock(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() dto: TransferStockDto,
  ) {
    return this.inventoryService.transferStock(
      request.user.orgId,
      itemId,
      dto.fromLocationId,
      dto.toLocationId,
      dto.quantity,
      request.user.sub,
      dto.idempotencyKey,
      dto.reference,
      dto.notes,
    );
  }

  @Get('reconcile')
  @RequirePermissions('item.view')
  reconcileInventory(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.reconcileInventory(
      request.user.orgId,
    );
  }
}