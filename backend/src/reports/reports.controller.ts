import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

import { ReportsService } from './reports.service';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stock-movement')
  @RequirePermissions('report.view')
  async getStockMovementReport(
    @Req() req: any,
    @Query() query: StockMovementQueryDto,
  ) {
    return this.reportsService.getStockMovementReport(
      req.user.orgId,
      query,
    );
  }
}