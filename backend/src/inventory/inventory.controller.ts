import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
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

import { InventoryService } from './inventory.service';

import { ReceiveStockDto } from './dto/receive-stock.dto';

import { AdjustStockDto } from './dto/adjust-stock.dto';

import { IssueStockDto } from './dto/issue-stock.dto';

import { TransferStockDto } from './dto/transfer-stock.dto';

import { OpeningBalanceDto } from './dto/opening-balance.dto';

import { StockHistoryDto } from './dto/stock-history.dto';

import { InventoryActivityDto } from './dto/inventory-activity.dto';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  // --------------------------------------------------
  // ITEM INVENTORY
  // --------------------------------------------------

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

  @Delete('items/:itemId/locations/:locationId')
  @RequirePermissions('item.update')
  removeItemLocation(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.inventoryService.removeItemLocation(
      request.user.orgId,
      itemId,
      locationId,
    );
  }

  // --------------------------------------------------
  // OPENING BALANCE
  // --------------------------------------------------

  @Post('items/:itemId/locations/:locationId/opening-balance')
  @RequirePermissions('stock.receive')
  createOpeningBalance(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
    @Body() dto: OpeningBalanceDto,
  ) {
    return this.inventoryService.createOpeningBalance(
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

  // --------------------------------------------------
  // TRANSACTION HISTORY
  // --------------------------------------------------

  @Get('items/:itemId/transactions')
  @RequirePermissions('stock.view_history')
  getItemTransactions(
    @Req() request: AuthenticatedRequest,
    @Param(
      'itemId',
      new ParseUUIDPipe({ version: '4' }),
    )
    itemId: string,
    @Query() filters: StockHistoryDto,
  ) {
    return this.inventoryService.getItemTransactions(
      request.user.orgId,
      itemId,
      filters,
    );
  }

  @Get('items/:itemId/locations/:locationId/transactions')
  @RequirePermissions('stock.view_history')
  getItemLocationTransactions(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Param('locationId') locationId: string,
    @Query() filters: StockHistoryDto,
  ) {
    return this.inventoryService.getItemLocationTransactions(
      request.user.orgId,
      itemId,
      locationId,
      filters,
    );
  }

  // --------------------------------------------------
  // STOCK OPERATIONS
  // --------------------------------------------------

  @Post('items/:itemId/locations/:locationId/receive')
  @RequirePermissions('stock.receive')
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
  @RequirePermissions('stock.adjust')
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
      dto.idempotencyKey,
      dto.reference,
      dto.notes,
    );
  }

  @Post('items/:itemId/locations/:locationId/issue')
  @RequirePermissions('stock.issue')
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
  @RequirePermissions('stock.transfer')
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

  // --------------------------------------------------
  // STOCK MOVEMENT
  // --------------------------------------------------

  @Get('movement-trend')
  @RequirePermissions('item.view')
  getStockMovementTrend(
    @Req() request: AuthenticatedRequest,
    @Query(
      'days',
      new DefaultValuePipe(30),
      ParseIntPipe,
    )
    days: number,
  ) {
    return this.inventoryService.getStockMovementTrend(
      request.user.orgId,
      days,
    );
  }

  // --------------------------------------------------
  // RECONCILIATION
  // --------------------------------------------------

  @Get('reconcile')
  @RequirePermissions('item.view')
  reconcileInventory(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.reconcileInventory(
      request.user.orgId,
    );
  }

  // --------------------------------------------------
  // INVENTORY SUMMARY
  // --------------------------------------------------

  @Get('items/:itemId/summary')
  @RequirePermissions('item.view')
  getInventorySummary(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    return this.inventoryService.getInventorySummary(
      request.user.orgId,
      itemId,
    );
  }

  @Get('summary')
  @RequirePermissions('item.view')
  getOrganizationInventorySummary(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.getOrganizationInventorySummary(
      request.user.orgId,
    );
  }

  // --------------------------------------------------
  // STOCK ALERTS / ANALYSIS
  // --------------------------------------------------

  @Get('low-stock')
  @RequirePermissions('item.view')
  getLowStockItems(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.getLowStockItems(
      request.user.orgId,
    );
  }

  @Get('out-of-stock')
  @RequirePermissions('item.view')
  getOutOfStockItems(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.getOutOfStockItems(
      request.user.orgId,
    );
  }

  @Get('activity')
  @RequirePermissions('item.view')
  getInventoryActivity(
    @Req() request: AuthenticatedRequest,
    @Query() filters: InventoryActivityDto,
  ) {
    return this.inventoryService.getInventoryActivity(
      request.user.orgId,
      filters.itemId,
      filters.locationId,
      filters.fromDate,
      filters.toDate,
    );
  }

  @Get('reorder-analysis')
  @RequirePermissions('item.view')
  getReorderAnalysis(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.getReorderAnalysis(
      request.user.orgId,
    );
  }

  @Get('alerts')
  @RequirePermissions('item.view')
  getInventoryAlerts(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.getInventoryAlerts(
      request.user.orgId,
    );
  }

  @Get('location-reorder-analysis')
  @RequirePermissions('item.view')
  getLocationReorderAnalysis(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.getLocationReorderAnalysis(
      request.user.orgId,
    );
  }

  // --------------------------------------------------
  // RECENT ACTIVITY
  // --------------------------------------------------

  @Get('activity/recent')
  @RequirePermissions('item.view')
  getRecentInventoryActivity(
    @Req() request: AuthenticatedRequest,
    @Query(
      'limit',
      new DefaultValuePipe(50),
      ParseIntPipe,
    )
    limit: number,
  ) {
    return this.inventoryService.getRecentInventoryActivity(
      request.user.orgId,
      limit,
    );
  }

  // --------------------------------------------------
  // INVENTORY REGISTER
  // --------------------------------------------------

  @Get('register')
  @RequirePermissions('item.view')
  getInventoryRegister(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventoryService.getInventoryRegister(
      request.user.orgId,
    );
  }
}