import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockMovementReport(
    orgId: string,
    query: StockMovementQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    if (query.fromDate && query.toDate) {
      const from = new Date(query.fromDate);
      const to = new Date(query.toDate);

      if (from > to) {
        throw new BadRequestException(
          'fromDate cannot be later than toDate',
        );
      }
    }

    const where: any = {
      orgId,
    };

    if (query.itemId) {
      where.itemId = query.itemId;
    }

    if (query.locationId) {
      where.locationId = query.locationId;
    }

    if (query.txnType) {
      where.txnType = query.txnType;
    }

    if (query.categoryId) {
      where.item = {
        categoryId: query.categoryId,
      };
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};

      if (query.fromDate) {
        const from = new Date(query.fromDate);
        from.setHours(0, 0, 0, 0);
        where.createdAt.gte = from;
      }

      if (query.toDate) {
        const to = new Date(query.toDate);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.stockTransaction.count({
        where,
      }),

      this.prisma.stockTransaction.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
        select: {
          id: true,
          txnType: true,
          quantity: true,
          reference: true,
          notes: true,
          transferId: true,
          createdAt: true,

          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              unitOfMeasure: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          location: {
            select: {
              id: true,
              name: true,
              locationType: true,
            },
          },

          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const data = rows.map((row) => ({
      id: row.id,
      date: row.createdAt,
      action: this.formatTransactionType(row.txnType),
      txnType: row.txnType,
      quantity: row.quantity,
      reference: row.reference,
      notes: row.notes,
      transferId: row.transferId,

      item: row.item,

      location: row.location,

      performedBy: {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email,
      },
    }));

    const summary = {
      transactionCount: total,
      totalReceived: await this.getQuantityTotal(
        orgId,
        where,
        [
          TransactionType.receive,
          TransactionType.opening_balance,
          TransactionType.return,
        ],
      ),
      totalIssued: await this.getAbsoluteQuantityTotal(
        orgId,
        where,
        [TransactionType.issue],
      ),
      totalAdjusted: await this.getNetQuantityTotal(
        orgId,
        where,
        [TransactionType.adjustment],
      ),
      totalTransferred: await this.getQuantityTotal(
        orgId,
        {
            ...where,
            quantity: {
            gt: 0,
            },
        },
        [TransactionType.transfer],
        ),
    };

    return {
      summary,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private async getQuantityTotal(
    orgId: string,
    where: any,
    transactionTypes: TransactionType[],
  ): Promise<number> {
    const result = await this.prisma.stockTransaction.aggregate({
      where: {
        ...where,
        orgId,
        txnType: {
          in: transactionTypes,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity ?? 0;
  }

  private async getAbsoluteQuantityTotal(
    orgId: string,
    where: any,
    transactionTypes: TransactionType[],
  ): Promise<number> {
    const rows = await this.prisma.stockTransaction.findMany({
      where: {
        ...where,
        orgId,
        txnType: {
          in: transactionTypes,
        },
      },
      select: {
        quantity: true,
      },
    });

    return rows.reduce(
      (total, row) => total + Math.abs(row.quantity),
      0,
    );
  }

  private async getNetQuantityTotal(
    orgId: string,
    where: any,
    transactionTypes: TransactionType[],
  ): Promise<number> {
    const result = await this.prisma.stockTransaction.aggregate({
      where: {
        ...where,
        orgId,
        txnType: {
          in: transactionTypes,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity ?? 0;
  }

  private formatTransactionType(type: TransactionType): string {
    switch (type) {
      case TransactionType.opening_balance:
        return 'Opening Balance';
      case TransactionType.receive:
        return 'Receive';
      case TransactionType.issue:
        return 'Issue';
      case TransactionType.adjustment:
        return 'Adjustment';
      case TransactionType.transfer:
        return 'Transfer';
      case TransactionType.return:
        return 'Return';
      case TransactionType.damage:
        return 'Damage';
      case TransactionType.expiry:
        return 'Expiry';
      case TransactionType.loss:
        return 'Loss';
      default:
        return type;
    }
  }
}