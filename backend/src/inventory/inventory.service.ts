import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private getStockStatus(
    totalQuantity: number,
    locationQuantities: number[],
    reorderLevel: number,
  ):
    | 'IN_STOCK'
    | 'LOW_STOCK'
    | 'OUT_OF_STOCK' {
    if (totalQuantity === 0) {
      return 'OUT_OF_STOCK';
    }

    const hasLowLocation =
      locationQuantities.some(
        (quantity) =>
          quantity <=
          reorderLevel,
      );

    return hasLowLocation
      ? 'LOW_STOCK'
      : 'IN_STOCK';
  }


  private getReferencePrefix(
    transactionType: TransactionType,
  ): string {
    switch (transactionType) {
      case TransactionType.receive:
        return 'REC';

      case TransactionType.issue:
        return 'ISS';

      case TransactionType.adjustment:
        return 'ADJ';

      case TransactionType.transfer:
        return 'TRF';

      case TransactionType.return:
        return 'RET';

      case TransactionType.damage:
        return 'DMG';

      case TransactionType.expiry:
        return 'EXP';

      case TransactionType.loss:
        return 'LOS';

      case TransactionType.opening_balance:
        return 'OPN';

      default:
        return 'TXN';
    }
  }

  private formatReferenceDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}${month}${year}`;
  }

  private async generateTransactionReference(
    tx: Prisma.TransactionClient,
    orgId: string,
    transactionType: TransactionType,
    sku: string,
    now = new Date(),
  ): Promise<string> {
    const sequenceDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    const prefix = this.getReferencePrefix(transactionType);
    const datePart = this.formatReferenceDate(now);

    const sequence =
      await tx.transactionSequence.upsert({
        where: {
          orgId_transactionType_sequenceDate: {
            orgId,
            transactionType,
            sequenceDate,
          },
        },
        create: {
          orgId,
          transactionType,
          sequenceDate,
          lastNumber: 1,
        },
        update: {
          lastNumber: {
            increment: 1,
          },
        },
      });

    const sequenceNumber = String(
      sequence.lastNumber,
    ).padStart(4, '0');

    return `${prefix}-${sku}-${datePart}-${sequenceNumber}`;
  }

  private isUniqueConstraintError(
    error: unknown,
  ): boolean {
    return (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private isRetryableTransactionError(
    error: unknown,
  ): boolean {
    return (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }

  private async ensureSetupInProgress(
    orgId: string,
  ) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: orgId,
        },
        select: {
          setupStatus: true,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    if (
      organization.setupStatus !==
      'IN_PROGRESS'
    ) {
      throw new ConflictException(
        'Opening stock can only be recorded while organization setup is in progress.',
      );
    }
  }

  async getOrCreateBalance(
    orgId: string,
    itemId: string,
    locationId: string,
  ) {
    const item =
      await this.prisma.item.findFirst({
        where: {
          id: itemId,
          orgId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    if (item.status === 'archived') {
      throw new ConflictException(
        'Archived items cannot hold new inventory.',
      );
    }

    const location =
      await this.prisma.location.findFirst({
        where: {
          id: locationId,
          orgId,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

    if (!location) {
      throw new NotFoundException(
        'Location not found in this organization.',
      );
    }

    if (location.status !== 'active') {
      throw new ConflictException(
        'Inventory cannot be assigned to an inactive location.',
      );
    }

    return this.prisma.itemLocation.upsert({
      where: {
        orgId_itemId_locationId: {
          orgId,
          itemId,
          locationId,
        },
      },
      update: {},
      create: {
        orgId,
        itemId,
        locationId,
        quantity: 0,
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            locationType: true,
          },
        },
      },
    });
  }

  async getBalance(
    orgId: string,
    itemId: string,
    locationId: string,
  ) {
    const balance =
      await this.prisma.itemLocation.findFirst({
        where: {
          orgId,
          itemId,
          locationId,
        },
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              status: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
              locationType: true,
              status: true,
            },
          },
        },
      });

    if (!balance) {
      throw new NotFoundException(
        'Inventory balance not found for this item at this location.',
      );
    }

    return balance;
  }

  async getItemInventory(
    orgId: string,
    itemId: string,
  ) {
    const item =
      await this.prisma.item.findFirst({
        where: {
          orgId,
          id: itemId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    return this.prisma.itemLocation.findMany({
      where: {
        orgId,
        itemId,
      },
      orderBy: {
        location: {
          name: 'asc',
        },
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            locationType: true,
          },
        },
      },
    });
  }

  async getLocationInventory(
    orgId: string,
    locationId: string,
  ) {
    const location =
      await this.prisma.location.findFirst({
        where: {
          orgId,
          id: locationId,
        },
        select: {
          id: true,
          name: true,
          locationType: true,
          status: true,
        },
      });

    if (!location) {
      throw new NotFoundException(
        'Location not found in this organization.',
      );
    }

    return this.prisma.itemLocation.findMany({
      where: {
        orgId,
        locationId,
      },
      orderBy: {
        item: {
          name: 'asc',
        },
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            unitOfMeasure: true,
            unitPrice: true,
            status: true,
          },
        },
      },
    });
  }

  async createOpeningBalance(
    orgId: string,
    itemId: string,
    locationId: string,
    quantity: number,
    performedBy: string,
    idempotencyKey: string,
    reference?: string,
    notes?: string,
  ) {
    void reference;

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new ConflictException(
        'Opening balance quantity must be a positive whole number.',
      );
    }

    if (
      !idempotencyKey ||
      !idempotencyKey.trim()
    ) {
      throw new ConflictException(
        'An idempotency key is required for opening balances.',
      );
    }

    await this.ensureSetupInProgress(
      orgId,
    );

    const item =
      await this.prisma.item.findFirst({
        where: {
          id: itemId,
          orgId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    if (item.status === 'archived') {
      throw new ConflictException(
        'Archived items cannot receive new inventory.',
      );
    }

    const location =
      await this.prisma.location.findFirst({
        where: {
          id: locationId,
          orgId,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

    if (!location) {
      throw new NotFoundException(
        'Location not found in this organization.',
      );
    }

    if (location.status !== 'active') {
      throw new ConflictException(
        'Inventory cannot be assigned to an inactive location.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existingTransaction =
            await tx.stockTransaction.findFirst({
              where: {
                orgId,
                idempotencyKey,
              },
            });

          if (existingTransaction) {
            const sameRequest =
              existingTransaction.itemId ===
                itemId &&
              existingTransaction.locationId ===
                locationId &&
              existingTransaction.quantity ===
                quantity &&
              existingTransaction.txnType ===
                'opening_balance' &&
              existingTransaction.notes ===
                notes;

            if (!sameRequest) {
              throw new ConflictException(
                'This idempotency key has already been used for a different opening balance.',
              );
            }

            return {
              balance:
                await tx.itemLocation.findUnique(
                  {
                    where: {
                      orgId_itemId_locationId: {
                        orgId,
                        itemId:
                          existingTransaction.itemId,
                        locationId:
                          existingTransaction.locationId,
                      },
                    },
                  },
                ),
              transaction:
                existingTransaction,
              replayed: true,
            };
          }

          const previousOpeningBalance =
            await tx.stockTransaction.findFirst(
              {
                where: {
                  orgId,
                  itemId,
                  locationId,
                  txnType:
                    'opening_balance',
                },
                select: {
                  id: true,
                },
              },
            );

          if (previousOpeningBalance) {
            throw new ConflictException(
              'Opening balance has already been recorded for this item at this location.',
            );
          }

          await tx.itemLocation.upsert({
            where: {
              orgId_itemId_locationId: {
                orgId,
                itemId,
                locationId,
              },
            },
            update: {},
            create: {
              orgId,
              itemId,
              locationId,
              quantity: 0,
            },
          });

          const claimedBalance =
            await tx.itemLocation.updateMany(
              {
                where: {
                  orgId,
                  itemId,
                  locationId,
                  quantity: 0,
                },
                data: {
                  quantity: {
                    increment:
                      quantity,
                  },
                },
              },
            );

          if (claimedBalance.count !== 1) {
            throw new ConflictException(
              'Opening balance can only be created when the current inventory balance is zero.',
            );
          }

          const generatedReference =
            await this.generateTransactionReference(
              tx,
              orgId,
              TransactionType.opening_balance,
              item.sku,
            );

          const transaction =
            await tx.stockTransaction.create({
              data: {
                orgId,
                itemId,
                locationId,
                txnType:
                  'opening_balance',
                quantity,
                performedBy,
                idempotencyKey,
                reference:
                  generatedReference,
                notes,
              },
            });

          const updatedBalance =
            await tx.itemLocation.findUnique(
              {
                where: {
                  orgId_itemId_locationId: {
                    orgId,
                    itemId,
                    locationId,
                  },
                },
              },
            );

          return {
            balance: updatedBalance,
            transaction,
            replayed: false,
          };
        },
      );
    } catch (error) {
      if (
        !this.isUniqueConstraintError(
          error,
        )
      ) {
        throw error;
      }

      const existingTransaction =
        await this.prisma.stockTransaction.findFirst(
          {
            where: {
              orgId,
              idempotencyKey,
            },
          },
        );

      if (!existingTransaction) {
        throw error;
      }

      const sameRequest =
        existingTransaction.itemId ===
          itemId &&
        existingTransaction.locationId ===
          locationId &&
        existingTransaction.quantity ===
          quantity &&
        existingTransaction.txnType ===
          'opening_balance' &&
        existingTransaction.notes ===
          notes;

      if (!sameRequest) {
        throw new ConflictException(
          'This idempotency key has already been used for a different opening balance.',
        );
      }

      return {
        balance:
          await this.prisma.itemLocation.findUnique(
            {
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId:
                    existingTransaction.itemId,
                  locationId:
                    existingTransaction.locationId,
                },
              },
            },
          ),
        transaction:
          existingTransaction,
        replayed: true,
      };
    }
  }

  async getItemTransactions(
    orgId: string,
    itemId: string,
    filters?: {
      locationId?: string;
      txnType?: TransactionType;
      reference?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const item =
      await this.prisma.item.findFirst({
        where: {
          orgId,
          id: itemId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    let selectedLocation: {
      id: string;
      name: string;
      locationType: string;
    } | null = null;

    if (filters?.locationId) {
      selectedLocation =
        await this.prisma.location.findFirst({
          where: {
            orgId,
            id: filters.locationId,
          },
          select: {
            id: true,
            name: true,
            locationType: true,
          },
        });

      if (!selectedLocation) {
        throw new NotFoundException(
          'Location not found in this organization.',
        );
      }
    }

    const page =
      filters?.page ?? 1;

    const pageSize =
      filters?.pageSize ?? 20;

    const skip =
      (page - 1) * pageSize;

    if (
      filters?.fromDate &&
      filters?.toDate
    ) {
      const from = new Date(
        filters.fromDate,
      );

      const to = new Date(
        filters.toDate,
      );

      if (from > to) {
        throw new ConflictException(
          'fromDate cannot be later than toDate.',
        );
      }
    }

    const createdAtFilter =
      filters?.fromDate ||
      filters?.toDate
        ? {
            ...(filters.fromDate
              ? {
                  gte: new Date(
                    filters.fromDate,
                  ),
                }
              : {}),
            ...(filters.toDate
              ? {
                  lt: new Date(
                    new Date(
                      filters.toDate,
                    ).getTime() +
                      24 *
                        60 *
                        60 *
                        1000,
                  ),
                }
              : {}),
          }
        : undefined;

    const where: Prisma.StockTransactionWhereInput =
      {
        orgId,
        itemId,

        ...(filters?.locationId
          ? {
              locationId:
                filters.locationId,
            }
          : {}),

        ...(filters?.txnType
          ? {
              txnType:
                filters.txnType,
            }
          : {}),

        ...(filters?.reference
          ? {
              reference: {
                contains:
                  filters.reference,
                mode: 'insensitive',
              },
            }
          : {}),

        ...(createdAtFilter
          ? {
              createdAt:
                createdAtFilter,
            }
          : {}),
      };

    const [
      transactions,
      total,
      aggregate,
    ] =
      await this.prisma.$transaction([
        this.prisma.stockTransaction.findMany(
          {
            where,

            orderBy: [
              {
                createdAt:
                  'desc',
              },
              {
                id: 'desc',
              },
            ],

            skip,
            take: pageSize,

            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        ),

        this.prisma.stockTransaction.count(
          {
            where,
          },
        ),

        this.prisma.itemLocation.aggregate(
          {
            where: {
              orgId,
              itemId,

              ...(filters?.locationId
                ? {
                    locationId:
                      filters.locationId,
                  }
                : {}),
            },

            _sum: {
              quantity: true,
            },
          },
        ),
      ]);

    const totalPages =
      Math.ceil(
        total / pageSize,
      );

    return {
      summary: {
        item,

        location:
          selectedLocation
            ? {
                id:
                  selectedLocation.id,
                name:
                  selectedLocation.name,
              }
            : null,

        currentQuantity:
          aggregate._sum.quantity ??
          0,

        transactionCount:
          total,
      },

      data: transactions,

      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    };
  }

  async getItemLocationTransactions(
    orgId: string,
    itemId: string,
    locationId: string,
    filters?: {
      txnType?: TransactionType;
      reference?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const balance =
      await this.prisma.itemLocation.findFirst(
        {
          where: {
            orgId,
            itemId,
            locationId,
          },

          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                unitOfMeasure:
                  true,
              },
            },

            location: {
              select: {
                id: true,
                name: true,
                locationType:
                  true,
              },
            },
          },
        },
      );

    if (!balance) {
      throw new NotFoundException(
        'Inventory balance not found for this item at this location.',
      );
    }

    const page =
      filters?.page ?? 1;

    const pageSize =
      filters?.pageSize ?? 20;

    const skip =
      (page - 1) * pageSize;

    if (
      filters?.fromDate &&
      filters?.toDate
    ) {
      const from = new Date(
        filters.fromDate,
      );

      const to = new Date(
        filters.toDate,
      );

      if (from > to) {
        throw new ConflictException(
          'fromDate cannot be later than toDate.',
        );
      }
    }

    const createdAtFilter =
      filters?.fromDate ||
      filters?.toDate
        ? {
            ...(filters.fromDate
              ? {
                  gte: new Date(
                    filters.fromDate,
                  ),
                }
              : {}),

            ...(filters.toDate
              ? {
                  lt: new Date(
                    new Date(
                      filters.toDate,
                    ).getTime() +
                      24 *
                        60 *
                        60 *
                        1000,
                  ),
                }
              : {}),
          }
        : undefined;

    const where: Prisma.StockTransactionWhereInput =
      {
        orgId,
        itemId,
        locationId,

        ...(filters?.txnType
          ? {
              txnType:
                filters.txnType,
            }
          : {}),

        ...(filters?.reference
          ? {
              reference: {
                contains:
                  filters.reference,
                mode: 'insensitive',
              },
            }
          : {}),

        ...(createdAtFilter
          ? {
              createdAt:
                createdAtFilter,
            }
          : {}),
      };

    const [
      transactions,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.stockTransaction.findMany(
          {
            where,

            orderBy: {
              createdAt:
                'desc',
            },

            skip,
            take: pageSize,

            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        ),

        this.prisma.stockTransaction.count(
          {
            where,
          },
        ),
      ]);

    const totalPages =
      Math.ceil(
        total / pageSize,
      );

    return {
      summary: {
        item:
          balance.item,

        location:
          balance.location,

        currentQuantity:
          balance.quantity,

        transactionCount:
          total,
      },

      data: transactions,

      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    };
  }

  async receiveStock(
    orgId: string,
    itemId: string,
    locationId: string,
    quantity: number,
    performedBy: string,
    idempotencyKey: string,
    reference?: string,
    notes?: string,
  ) {
    void reference;

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new ConflictException(
        'Received stock quantity must be a positive whole number.',
      );
    }

    if (
      !idempotencyKey ||
      !idempotencyKey.trim()
    ) {
      throw new ConflictException(
        'An idempotency key is required for stock receipts.',
      );
    }

    const item =
      await this.prisma.item.findFirst({
        where: {
          id: itemId,
          orgId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    if (item.status === 'archived') {
      throw new ConflictException(
        'Archived items cannot receive new inventory.',
      );
    }

    const location =
      await this.prisma.location.findFirst({
        where: {
          id: locationId,
          orgId,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

    if (!location) {
      throw new NotFoundException(
        'Location not found in this organization.',
      );
    }

    if (location.status !== 'active') {
      throw new ConflictException(
        'Inventory cannot be assigned to an inactive location.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existingTransaction =
            await tx.stockTransaction.findFirst({
              where: {
                orgId,
                idempotencyKey,
              },
            });

          if (existingTransaction) {
            const sameRequest =
              existingTransaction.itemId ===
                itemId &&
              existingTransaction.locationId ===
                locationId &&
              existingTransaction.quantity ===
                quantity &&
              existingTransaction.txnType ===
                'receive' &&
              existingTransaction.notes ===
                notes;

            if (!sameRequest) {
              throw new ConflictException(
                'This idempotency key has already been used for a different stock receipt.',
              );
            }

            return {
              balance:
                await tx.itemLocation.findUnique(
                  {
                    where: {
                      orgId_itemId_locationId: {
                        orgId,
                        itemId:
                          existingTransaction.itemId,
                        locationId:
                          existingTransaction.locationId,
                      },
                    },
                  },
                ),
              transaction:
                existingTransaction,
              replayed: true,
            };
          }

          const balance =
            await tx.itemLocation.upsert(
              {
                where: {
                  orgId_itemId_locationId: {
                    orgId,
                    itemId,
                    locationId,
                  },
                },
                update: {},
                create: {
                  orgId,
                  itemId,
                  locationId,
                  quantity: 0,
                },
              },
            );

          const generatedReference =
            await this.generateTransactionReference(
              tx,
              orgId,
              TransactionType.receive,
              item.sku,
            );

          const transaction =
            await tx.stockTransaction.create({
              data: {
                orgId,
                itemId,
                locationId,
                txnType: 'receive',
                quantity,
                performedBy,
                idempotencyKey,
                reference:
                  generatedReference,
                notes,
              },
            });

          const updatedBalance =
            await tx.itemLocation.update({
              where: {
                id: balance.id,
              },
              data: {
                quantity: {
                  increment:
                    quantity,
                },
              },
            });

          return {
            balance: updatedBalance,
            transaction,
            replayed: false,
          };
        },
      );
    } catch (error) {
      if (
        !this.isUniqueConstraintError(
          error,
        )
      ) {
        throw error;
      }

      const existingTransaction =
        await this.prisma.stockTransaction.findFirst(
          {
            where: {
              orgId,
              idempotencyKey,
            },
          },
        );

      if (!existingTransaction) {
        throw error;
      }

      const sameRequest =
        existingTransaction.itemId ===
          itemId &&
        existingTransaction.locationId ===
          locationId &&
        existingTransaction.quantity ===
          quantity &&
        existingTransaction.txnType ===
          'receive' &&
        existingTransaction.notes ===
          notes;

      if (!sameRequest) {
        throw new ConflictException(
          'This idempotency key has already been used for a different stock receipt.',
        );
      }

      return {
        balance:
          await this.prisma.itemLocation.findUnique(
            {
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId:
                    existingTransaction.itemId,
                  locationId:
                    existingTransaction.locationId,
                },
              },
            },
          ),
        transaction:
          existingTransaction,
        replayed: true,
      };
    }
  }

  async adjustStock(
    orgId: string,
    itemId: string,
    locationId: string,
    quantity: number,
    performedBy: string,
    idempotencyKey: string,
    reference?: string,
    notes?: string,
  ) {
    void reference;

    if (
      !Number.isInteger(quantity) ||
      quantity === 0
    ) {
      throw new ConflictException(
        'Adjustment quantity must be a non-zero whole number.',
      );
    }

    if (
      !idempotencyKey ||
      !idempotencyKey.trim()
    ) {
      throw new ConflictException(
        'An idempotency key is required for stock adjustments.',
      );
    }

    const item =
      await this.prisma.item.findFirst({
        where: {
          id: itemId,
          orgId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    if (item.status === 'archived') {
      throw new ConflictException(
        'Archived items cannot have inventory adjusted.',
      );
    }

    const location =
      await this.prisma.location.findFirst({
        where: {
          id: locationId,
          orgId,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

    if (!location) {
      throw new NotFoundException(
        'Location not found in this organization.',
      );
    }

    if (location.status !== 'active') {
      throw new ConflictException(
        'Inventory cannot be adjusted at an inactive location.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existingTransaction =
            await tx.stockTransaction.findFirst({
              where: {
                orgId,
                idempotencyKey,
              },
            });

          if (existingTransaction) {
            const sameRequest =
              existingTransaction.itemId ===
                itemId &&
              existingTransaction.locationId ===
                locationId &&
              existingTransaction.quantity ===
                quantity &&
              existingTransaction.txnType ===
                'adjustment' &&
              existingTransaction.notes ===
                notes;

            if (!sameRequest) {
              throw new ConflictException(
                'This idempotency key has already been used for a different stock adjustment.',
              );
            }

            return {
              balance:
                await tx.itemLocation.findUnique(
                  {
                    where: {
                      orgId_itemId_locationId: {
                        orgId,
                        itemId:
                          existingTransaction.itemId,
                        locationId:
                          existingTransaction.locationId,
                      },
                    },
                  },
                ),
              transaction:
                existingTransaction,
              replayed: true,
            };
          }

          if (quantity > 0) {
            await tx.itemLocation.upsert({
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId,
                  locationId,
                },
              },
              update: {
                quantity: {
                  increment: quantity,
                },
              },
              create: {
                orgId,
                itemId,
                locationId,
                quantity,
              },
            });
          } else {
            const balance =
              await tx.itemLocation.findUnique(
                {
                  where: {
                    orgId_itemId_locationId: {
                      orgId,
                      itemId,
                      locationId,
                    },
                  },
                  select: {
                    quantity: true,
                  },
                },
              );

            if (!balance) {
              throw new ConflictException(
                'Inventory balance not found for this item at this location.',
              );
            }

            const reduced =
              await tx.itemLocation.updateMany(
                {
                  where: {
                    orgId,
                    itemId,
                    locationId,
                    quantity: {
                      gte: -quantity,
                    },
                  },
                  data: {
                    quantity: {
                      decrement: -quantity,
                    },
                  },
                },
              );

            if (reduced.count !== 1) {
              throw new ConflictException(
                `Stock adjustment cannot reduce inventory below zero. Available quantity is ${balance.quantity}.`,
              );
            }
          }

          const generatedReference =
            await this.generateTransactionReference(
              tx,
              orgId,
              TransactionType.adjustment,
              item.sku,
            );

          const transaction =
            await tx.stockTransaction.create({
              data: {
                orgId,
                itemId,
                locationId,
                txnType: 'adjustment',
                quantity,
                performedBy,
                idempotencyKey,
                reference:
                  generatedReference,
                notes,
              },
            });

          const updatedBalance =
            await tx.itemLocation.findUnique(
              {
                where: {
                  orgId_itemId_locationId: {
                    orgId,
                    itemId,
                    locationId,
                  },
                },
              },
            );

          return {
            balance: updatedBalance,
            transaction,
            replayed: false,
          };
        },
      );
    } catch (error) {
      if (
        !this.isUniqueConstraintError(
          error,
        )
      ) {
        throw error;
      }

      const existingTransaction =
        await this.prisma.stockTransaction.findFirst(
          {
            where: {
              orgId,
              idempotencyKey,
            },
          },
        );

      if (!existingTransaction) {
        throw error;
      }

      const sameRequest =
        existingTransaction.itemId ===
          itemId &&
        existingTransaction.locationId ===
          locationId &&
        existingTransaction.quantity ===
          quantity &&
        existingTransaction.txnType ===
          'adjustment' &&
        existingTransaction.notes ===
          notes;

      if (!sameRequest) {
        throw new ConflictException(
          'This idempotency key has already been used for a different stock adjustment.',
        );
      }

      return {
        balance:
          await this.prisma.itemLocation.findUnique(
            {
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId:
                    existingTransaction.itemId,
                  locationId:
                    existingTransaction.locationId,
                },
              },
            },
          ),
        transaction:
          existingTransaction,
        replayed: true,
      };
    }
  }

  async issueStock(
    orgId: string,
    itemId: string,
    locationId: string,
    quantity: number,
    performedBy: string,
    idempotencyKey: string,
    reference?: string,
    notes?: string,
  ) {
    void reference;

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new ConflictException(
        'Issued stock quantity must be a positive whole number.',
      );
    }

    if (
      !idempotencyKey ||
      !idempotencyKey.trim()
    ) {
      throw new ConflictException(
        'An idempotency key is required for stock issues.',
      );
    }

    const item =
      await this.prisma.item.findFirst({
        where: {
          id: itemId,
          orgId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    if (item.status === 'archived') {
      throw new ConflictException(
        'Archived items cannot be issued.',
      );
    }

    const location =
      await this.prisma.location.findFirst({
        where: {
          id: locationId,
          orgId,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

    if (!location) {
      throw new NotFoundException(
        'Location not found in this organization.',
      );
    }

    if (location.status !== 'active') {
      throw new ConflictException(
        'Inventory cannot be issued from an inactive location.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existingTransaction =
            await tx.stockTransaction.findFirst({
              where: {
                orgId,
                idempotencyKey,
              },
            });

          if (existingTransaction) {
            const sameRequest =
              existingTransaction.itemId ===
                itemId &&
              existingTransaction.locationId ===
                locationId &&
              existingTransaction.quantity ===
                -quantity &&
              existingTransaction.txnType ===
                'issue' &&
              existingTransaction.notes ===
                notes;

            if (!sameRequest) {
              throw new ConflictException(
                'This idempotency key has already been used for a different stock issue.',
              );
            }

            return {
              balance:
                await tx.itemLocation.findUnique(
                  {
                    where: {
                      orgId_itemId_locationId: {
                        orgId,
                        itemId:
                          existingTransaction.itemId,
                        locationId:
                          existingTransaction.locationId,
                      },
                    },
                  },
                ),
              transaction:
                existingTransaction,
              replayed: true,
            };
          }

          const balance =
            await tx.itemLocation.findUnique({
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId,
                  locationId,
                },
              },
            });

          if (!balance) {
            throw new NotFoundException(
              'Inventory balance not found for this item at this location.',
            );
          }

          const reduced =
            await tx.itemLocation.updateMany({
              where: {
                id: balance.id,
                orgId,
                itemId,
                locationId,
                quantity: {
                  gte: quantity,
                },
              },
              data: {
                quantity: {
                  decrement: quantity,
                },
              },
            });

          if (reduced.count !== 1) {
            throw new ConflictException(
              `Insufficient stock. Available quantity is ${balance.quantity}.`,
            );
          }

          const generatedReference =
            await this.generateTransactionReference(
              tx,
              orgId,
              TransactionType.issue,
              item.sku,
            );

          const transaction =
            await tx.stockTransaction.create({
              data: {
                orgId,
                itemId,
                locationId,
                txnType: 'issue',
                quantity: -quantity,
                performedBy,
                idempotencyKey,
                reference:
                  generatedReference,
                notes,
              },
            });

          const updatedBalance =
            await tx.itemLocation.findUnique(
              {
                where: {
                  orgId_itemId_locationId: {
                    orgId,
                    itemId,
                    locationId,
                  },
                },
              },
            );

          return {
            balance: updatedBalance,
            transaction,
            replayed: false,
          };
        },
      );
    } catch (error) {
      if (
        !this.isUniqueConstraintError(
          error,
        )
      ) {
        throw error;
      }

      const existingTransaction =
        await this.prisma.stockTransaction.findFirst(
          {
            where: {
              orgId,
              idempotencyKey,
            },
          },
        );

      if (!existingTransaction) {
        throw error;
      }

      const sameRequest =
        existingTransaction.itemId ===
          itemId &&
        existingTransaction.locationId ===
          locationId &&
        existingTransaction.quantity ===
          -quantity &&
        existingTransaction.txnType ===
          'issue' &&
        existingTransaction.notes ===
          notes;

      if (!sameRequest) {
        throw new ConflictException(
          'This idempotency key has already been used for a different stock issue.',
        );
      }

      return {
        balance:
          await this.prisma.itemLocation.findUnique(
            {
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId:
                    existingTransaction.itemId,
                  locationId:
                    existingTransaction.locationId,
                },
              },
            },
          ),
        transaction:
          existingTransaction,
        replayed: true,
      };
    }
  }

  async transferStock(
    orgId: string,
    itemId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    performedBy: string,
    idempotencyKey: string,
    reference?: string,
    notes?: string,
  ) {
    void reference;

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new ConflictException(
        'Transfer quantity must be a positive whole number.',
      );
    }

    if (
      !idempotencyKey ||
      !idempotencyKey.trim()
    ) {
      throw new ConflictException(
        'An idempotency key is required for stock transfers.',
      );
    }

    if (
      fromLocationId ===
      toLocationId
    ) {
      throw new ConflictException(
        'Source and destination locations must be different.',
      );
    }

    const item =
      await this.prisma.item.findFirst({
        where: {
          id: itemId,
          orgId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    if (item.status === 'archived') {
      throw new ConflictException(
        'Archived items cannot be transferred.',
      );
    }

    const locations =
      await this.prisma.location.findMany({
        where: {
          orgId,
          id: {
            in: [
              fromLocationId,
              toLocationId,
            ],
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

    if (locations.length !== 2) {
      throw new NotFoundException(
        'One or both transfer locations were not found in this organization.',
      );
    }

    const fromLocation =
      locations.find(
        (location) =>
          location.id ===
          fromLocationId,
      );

    const toLocation =
      locations.find(
        (location) =>
          location.id ===
          toLocationId,
      );

    if (
      !fromLocation ||
      !toLocation
    ) {
      throw new NotFoundException(
        'One or both transfer locations were not found in this organization.',
      );
    }

    if (
      fromLocation.status !==
        'active' ||
      toLocation.status !==
        'active'
    ) {
      throw new ConflictException(
        'Stock can only be transferred between active locations.',
      );
    }

    try {
      for (
        let attempt = 0;
        attempt < 3;
        attempt += 1
      ) {
        try {
          return await this.prisma.$transaction(
            async (tx) => {
              const existingTransaction =
                await tx.stockTransaction.findFirst(
                  {
                    where: {
                      orgId,
                      idempotencyKey,
                    },
                  },
                );

              if (
                existingTransaction
              ) {
                const transfer =
                  existingTransaction.transferId
                    ? await tx.stockTransfer.findUnique(
                        {
                          where: {
                            id: existingTransaction.transferId,
                          },
                        },
                      )
                    : null;

                const sameRequest =
                  existingTransaction.txnType ===
                    'transfer' &&
                  existingTransaction.itemId ===
                    itemId &&
                  existingTransaction.quantity ===
                    -quantity &&
                  existingTransaction.notes ===
                    notes &&
                  transfer?.fromLocationId ===
                    fromLocationId &&
                  transfer?.toLocationId ===
                    toLocationId &&
                  transfer?.quantity ===
                    quantity;

                if (!sameRequest) {
                  throw new ConflictException(
                    'This idempotency key has already been used for a different stock transfer.',
                  );
                }

                return {
                  transfer,

                  fromBalance:
                    await tx.itemLocation.findUnique(
                      {
                        where: {
                          orgId_itemId_locationId: {
                            orgId,
                            itemId,
                            locationId:
                              fromLocationId,
                          },
                        },
                      },
                    ),

                  toBalance:
                    await tx.itemLocation.findUnique(
                      {
                        where: {
                          orgId_itemId_locationId: {
                            orgId,
                            itemId,
                            locationId:
                              toLocationId,
                          },
                        },
                      },
                    ),

                  fromTransaction:
                    existingTransaction,

                  toTransaction: transfer
                    ? await tx.stockTransaction.findFirst(
                        {
                          where: {
                            orgId,
                            transferId:
                              transfer.id,
                            locationId:
                              toLocationId,
                          },
                        },
                      )
                    : null,

                  replayed: true,
                };
              }

              const fromBalance =
                await tx.itemLocation.findUnique(
                  {
                    where: {
                      orgId_itemId_locationId: {
                        orgId,
                        itemId,
                        locationId:
                          fromLocationId,
                      },
                    },
                  },
                );

              if (!fromBalance) {
                throw new NotFoundException(
                  'Source inventory balance not found for this item at this location.',
                );
              }

              const reduceSource =
                async () => {
                  const reduced =
                    await tx.itemLocation.updateMany(
                      {
                        where: {
                          id: fromBalance.id,
                          orgId,
                          itemId,
                          locationId:
                            fromLocationId,
                          quantity: {
                            gte: quantity,
                          },
                        },
                        data: {
                          quantity: {
                            decrement:
                              quantity,
                          },
                        },
                      },
                    );

                  if (
                    reduced.count !==
                    1
                  ) {
                    throw new ConflictException(
                      `Insufficient stock at the source location. Available quantity is ${fromBalance.quantity}.`,
                    );
                  }
                };

              const increaseDestination =
                async () => {
                  await tx.itemLocation.upsert(
                    {
                      where: {
                        orgId_itemId_locationId: {
                          orgId,
                          itemId,
                          locationId:
                            toLocationId,
                        },
                      },
                      update: {
                        quantity: {
                          increment:
                            quantity,
                        },
                      },
                      create: {
                        orgId,
                        itemId,
                        locationId:
                          toLocationId,
                        quantity,
                      },
                    },
                  );
                };

              if (
                fromLocationId.localeCompare(
                  toLocationId,
                ) < 0
              ) {
                await reduceSource();
                await increaseDestination();
              } else {
                await increaseDestination();
                await reduceSource();
              }

              const updatedFromBalance =
                await tx.itemLocation.findUnique(
                  {
                    where: {
                      orgId_itemId_locationId: {
                        orgId,
                        itemId,
                        locationId:
                          fromLocationId,
                      },
                    },
                  },
                );

              const updatedToBalance =
                await tx.itemLocation.findUnique(
                  {
                    where: {
                      orgId_itemId_locationId: {
                        orgId,
                        itemId,
                        locationId:
                          toLocationId,
                      },
                    },
                  },
                );

              const generatedReference =
                await this.generateTransactionReference(
                  tx,
                  orgId,
                  TransactionType.transfer,
                  item.sku,
                );

              const transfer =
                await tx.stockTransfer.create(
                  {
                    data: {
                      orgId,
                      itemId,
                      fromLocationId,
                      toLocationId,
                      quantity,
                      status:
                        'completed',
                      reference:
                        generatedReference,
                      performedBy,
                      completedAt:
                        new Date(),
                    },
                  },
                );

              const fromTransaction =
                await tx.stockTransaction.create(
                  {
                    data: {
                      orgId,
                      itemId,
                      locationId:
                        fromLocationId,
                      txnType:
                        'transfer',
                      quantity:
                        -quantity,
                      reference:
                        generatedReference,
                      transferId:
                        transfer.id,
                      performedBy,
                      idempotencyKey,
                      notes,
                    },
                  },
                );

              const toTransaction =
                await tx.stockTransaction.create(
                  {
                    data: {
                      orgId,
                      itemId,
                      locationId:
                        toLocationId,
                      txnType:
                        'transfer',
                      quantity,
                      reference:
                        generatedReference,
                      transferId:
                        transfer.id,
                      performedBy,
                      notes,
                    },
                  },
                );

              return {
                transfer,
                fromBalance:
                  updatedFromBalance,
                toBalance:
                  updatedToBalance,
                fromTransaction,
                toTransaction,
                replayed: false,
              };
            },
            {
              isolationLevel:
                Prisma.TransactionIsolationLevel.Serializable,
            },
          );
        } catch (error) {
          if (
            !this.isRetryableTransactionError(
              error,
            ) ||
            attempt === 2
          ) {
            throw error;
          }

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                25 *
                  (attempt + 1),
              ),
          );
        }
      }

      throw new ConflictException(
        'Stock transfer could not be completed. Please try again.',
      );
    } catch (error) {
      if (
        !this.isUniqueConstraintError(
          error,
        )
      ) {
        throw error;
      }

      const existingTransaction =
        await this.prisma.stockTransaction.findFirst(
          {
            where: {
              orgId,
              idempotencyKey,
            },
          },
        );

      if (!existingTransaction) {
        throw error;
      }

      const transfer =
        existingTransaction.transferId
          ? await this.prisma.stockTransfer.findUnique(
              {
                where: {
                  id: existingTransaction.transferId,
                },
              },
            )
          : null;

      const sameRequest =
        existingTransaction.txnType ===
          'transfer' &&
        existingTransaction.itemId ===
          itemId &&
        existingTransaction.quantity ===
          -quantity &&
        existingTransaction.notes ===
          notes &&
        transfer?.fromLocationId ===
          fromLocationId &&
        transfer?.toLocationId ===
          toLocationId &&
        transfer?.quantity ===
          quantity;

      if (!sameRequest) {
        throw new ConflictException(
          'This idempotency key has already been used for a different stock transfer.',
        );
      }

      return {
        transfer,

        fromBalance:
          await this.prisma.itemLocation.findUnique(
            {
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId,
                  locationId:
                    fromLocationId,
                },
              },
            },
          ),

        toBalance:
          await this.prisma.itemLocation.findUnique(
            {
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId,
                  locationId:
                    toLocationId,
                },
              },
            },
          ),

        fromTransaction:
          existingTransaction,

        toTransaction: transfer
          ? await this.prisma.stockTransaction.findFirst(
              {
                where: {
                  orgId,
                  transferId:
                    transfer.id,
                  locationId:
                    toLocationId,
                },
              },
            )
          : null,

        replayed: true,
      };
    }
  }

  async reconcileInventory(
    orgId: string,
    itemId?: string,
    locationId?: string,
  ) {
    const balances =
      await this.prisma.itemLocation.findMany({
        where: {
          orgId,
          ...(itemId
            ? { itemId }
            : {}),
          ...(locationId
            ? { locationId }
            : {}),
        },
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            item: {
              name: 'asc',
            },
          },
          {
            location: {
              name: 'asc',
            },
          },
        ],
      });

    const results =
      await Promise.all(
        balances.map(
          async (balance) => {
            const ledgerResult =
              await this.prisma.stockTransaction.aggregate(
                {
                  where: {
                    orgId,
                    itemId:
                      balance.itemId,
                    locationId:
                      balance.locationId,
                  },
                  _sum: {
                    quantity: true,
                  },
                },
              );

            const ledgerQuantity =
              ledgerResult._sum
                .quantity ?? 0;

            const difference =
              balance.quantity -
              ledgerQuantity;

            const negativeBalance =
              balance.quantity < 0;

            let status = 'OK';

            if (difference !== 0) {
              status =
                'MISMATCH';
            } else if (
              negativeBalance
            ) {
              status =
                'NEGATIVE_BALANCE';
            }

            return {
              item: balance.item,
              location:
                balance.location,
              balanceQuantity:
                balance.quantity,
              ledgerQuantity,
              difference,
              negativeBalance,
              status,
            };
          },
        ),
      );

    const mismatches =
      results.filter(
        (result) =>
          result.status ===
          'MISMATCH',
      );

    const negativeBalances =
      results.filter(
        (result) =>
          result.negativeBalance,
      );

    return {
      organizationId: orgId,

      status:
        mismatches.length === 0 &&
        negativeBalances.length === 0
          ? 'OK'
          : 'ATTENTION_REQUIRED',

      totalChecked:
        results.length,

      mismatches:
        mismatches.length,

      negativeBalances:
        negativeBalances.length,

      results,
    };
  }

  async getInventorySummary(
    orgId: string,
    itemId: string,
  ) {
    const item =
      await this.prisma.item.findFirst({
        where: {
          orgId,
          id: itemId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure:
            true,
          reorderLevel: true,
          status: true,
          unitPrice: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    const balances =
      await this.prisma.itemLocation.findMany({
        where: {
          orgId,
          itemId,
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              locationType:
                true,
              status: true,
            },
          },
        },
        orderBy: {
          location: {
            name: 'asc',
          },
        },
      });

    const totalQuantity =
      balances.reduce(
        (total, balance) =>
          total + balance.quantity,
        0,
      );

    const stockStatus =
      this.getStockStatus(
        totalQuantity,
        balances.map(
          (balance) =>
            balance.quantity,
        ),
        item.reorderLevel,
      );

    return {
      item: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        unitOfMeasure:
          item.unitOfMeasure,
        unitPrice:
          item.unitPrice,
        reorderLevel:
          item.reorderLevel,
        status: item.status,
      },

      totalQuantity,
      stockStatus,

      locations:
        balances.map(
          (balance) => ({
            location:
              balance.location,
            quantity:
              balance.quantity,
          }),
        ),
    };
  }

  async getOrganizationInventorySummary(
    orgId: string,
  ) {
    const [
      items,
      balances,
    ] =
      await this.prisma.$transaction([
        this.prisma.item.findMany({
          where: {
            orgId,
            status: 'active',
          },
          select: {
            id: true,
            sku: true,
            name: true,
            unitOfMeasure:
              true,
            unitPrice: true,
            reorderLevel: true,
          },
        }),

        this.prisma.itemLocation.findMany(
          {
            where: {
              orgId,
            },
            select: {
              itemId: true,
              locationId: true,
              quantity: true,
              location: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        ),
      ]);

    const balancesByItem =
      new Map<
        string,
        {
          locationId: string;
          quantity: number;
        }[]
      >();

    for (const balance of balances) {
      const current =
        balancesByItem.get(
          balance.itemId,
        ) ?? [];

      current.push({
        locationId:
          balance.locationId,
        quantity:
          balance.quantity,
      });

      balancesByItem.set(
        balance.itemId,
        current,
      );
    }

    let totalUnitsInStock =
      0;

    let totalInventoryValue =
      0;

    let lowStockItems = 0;
    let outOfStockItems = 0;

    const itemSummaries =
      items.map((item) => {
        const itemBalances =
          balancesByItem.get(
            item.id,
          ) ?? [];

        const totalQuantity =
          itemBalances.reduce(
            (total, balance) =>
              total +
              balance.quantity,
            0,
          );

        const inventoryValue =
          totalQuantity *
          Number(item.unitPrice);

        const stockStatus =
          this.getStockStatus(
            totalQuantity,
            itemBalances.map(
              (balance) =>
                balance.quantity,
            ),
            item.reorderLevel,
          );

        totalUnitsInStock +=
          totalQuantity;

        totalInventoryValue +=
          inventoryValue;

        if (
          stockStatus ===
          'OUT_OF_STOCK'
        ) {
          outOfStockItems++;
        } else if (
          stockStatus ===
          'LOW_STOCK'
        ) {
          lowStockItems++;
        }

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          unitOfMeasure:
            item.unitOfMeasure,
          unitPrice:
            item.unitPrice,
          reorderLevel:
            item.reorderLevel,
          totalQuantity,
          inventoryValue,
          stockStatus,
        };
      });

    const locationSummaries =
      balances.reduce(
        (result, balance) => {
          const existing =
            result.get(
              balance.locationId,
            );

          if (existing) {
            existing.totalQuantity +=
              balance.quantity;
          } else {
            result.set(
              balance.locationId,
              {
                id: balance.location.id,
                name:
                  balance.location.name,
                status:
                  balance.location.status,
                totalQuantity:
                  balance.quantity,
              },
            );
          }

          return result;
        },
        new Map<
          string,
          {
            id: string;
            name: string;
            status: string;
            totalQuantity: number;
          }
        >(),
      );

    return {
      totals: {
        activeItems:
          items.length,
        totalUnitsInStock,
        lowStockItems,
        outOfStockItems,
        totalInventoryValue,
      },

      items:
        itemSummaries,

      locations:
        Array.from(
          locationSummaries.values(),
        ).sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
            ),
        ),
    };
  }

  async getLowStockItems(
    orgId: string,
  ) {
    const items =
      await this.prisma.item.findMany({
        where: {
          orgId,
          status: 'active',
        },
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure:
            true,
          unitPrice: true,
          reorderLevel: true,
        },
      });

    const balances =
      await this.prisma.itemLocation.findMany({
        where: {
          orgId,
        },
        select: {
          itemId: true,
          quantity: true,
          locationId: true,
        },
      });

    const balancesByItem =
      new Map<
        string,
        number[]
      >();

    for (const balance of balances) {
      const current =
        balancesByItem.get(
          balance.itemId,
        ) ?? [];

      current.push(
        balance.quantity,
      );

      balancesByItem.set(
        balance.itemId,
        current,
      );
    }

    return items
      .map((item) => {
        const locationQuantities =
          balancesByItem.get(
            item.id,
          ) ?? [];

        const totalQuantity =
          locationQuantities.reduce(
            (total, quantity) =>
              total + quantity,
            0,
          );

        const stockStatus =
          this.getStockStatus(
            totalQuantity,
            locationQuantities,
            item.reorderLevel,
          );

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          unitOfMeasure:
            item.unitOfMeasure,
          unitPrice:
            item.unitPrice,
          reorderLevel:
            item.reorderLevel,
          totalQuantity,

          stockStatus,
        };
      })
      .filter(
        (item) =>
          item.stockStatus ===
          'LOW_STOCK',
      );
  }

  async getOutOfStockItems(
    orgId: string,
  ) {
    const items =
      await this.prisma.item.findMany({
        where: {
          orgId,
          status: 'active',
        },
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure:
            true,
          unitPrice: true,
          reorderLevel: true,
        },
      });

    const balances =
      await this.prisma.itemLocation.findMany({
        where: {
          orgId,
        },
        select: {
          itemId: true,
          quantity: true,
        },
      });

    const quantityByItem =
      new Map<string, number>();

    for (const balance of balances) {
      quantityByItem.set(
        balance.itemId,
        (quantityByItem.get(
          balance.itemId,
        ) ?? 0) +
          balance.quantity,
      );
    }

    return items
      .map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        unitOfMeasure:
          item.unitOfMeasure,
        unitPrice:
          item.unitPrice,
        reorderLevel:
          item.reorderLevel,
        totalQuantity:
          quantityByItem.get(
            item.id,
          ) ?? 0,
      }))
      .filter(
        (item) =>
          item.totalQuantity === 0,
      )
      .map((item) => ({
        ...item,
        stockStatus:
          'OUT_OF_STOCK',
      }));
  }

  async getInventoryActivity(
    orgId: string,
    itemId?: string,
    locationId?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    if (fromDate && toDate) {
      const from = new Date(
        fromDate,
      );

      const to = new Date(
        toDate,
      );

      if (from > to) {
        throw new ConflictException(
          'fromDate cannot be later than toDate.',
        );
      }
    }

    const createdAtFilter =
      fromDate || toDate
        ? {
            ...(fromDate
              ? {
                  gte: new Date(
                    fromDate,
                  ),
                }
              : {}),

            ...(toDate
              ? {
                  lt: new Date(
                    new Date(
                      toDate,
                    ).getTime() +
                      24 *
                        60 *
                        60 *
                        1000,
                  ),
                }
              : {}),
          }
        : undefined;

    const transactions =
      await this.prisma.stockTransaction.findMany(
        {
          where: {
            orgId,

            ...(itemId
              ? {
                  itemId,
                }
              : {}),

            ...(locationId
              ? {
                  locationId,
                }
              : {}),

            ...(createdAtFilter
              ? {
                  createdAt:
                    createdAtFilter,
                }
              : {}),
          },

          select: {
            txnType: true,
            quantity: true,
          },
        },
      );

    let openingStock = 0;
    let supplierReceipts = 0;
    let issued = 0;
    let transferredIn = 0;
    let transferredOut = 0;
    let adjustments = 0;

    for (
      const transaction of
        transactions
    ) {
      switch (
        transaction.txnType
      ) {
        case 'opening_balance':
          openingStock +=
            transaction.quantity;
          break;

        case 'receive':
          supplierReceipts +=
            transaction.quantity;
          break;

        case 'issue':
          issued += Math.abs(
            transaction.quantity,
          );
          break;

        case 'transfer':
          if (
            transaction.quantity >
            0
          ) {
            transferredIn +=
              transaction.quantity;
          } else {
            transferredOut +=
              Math.abs(
                transaction.quantity,
              );
          }
          break;

        case 'adjustment':
          adjustments +=
            transaction.quantity;
          break;

        default:
          break;
      }
    }

    return {
      filters: {
        itemId:
          itemId ?? null,
        locationId:
          locationId ?? null,
        fromDate:
          fromDate ?? null,
        toDate:
          toDate ?? null,
      },

      totals: {
        openingStock,
        supplierReceipts,
        issued,
        transferredIn,
        transferredOut,
        adjustments,
        transactionCount:
          transactions.length,
      },
    };
  }

  async getReorderAnalysis(
    orgId: string,
  ) {
    const items =
      await this.prisma.item.findMany({
        where: {
          orgId,
          status: 'active',
        },
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure:
            true,
          unitPrice: true,
          reorderLevel: true,
        },
      });

    const balances =
      await this.prisma.itemLocation.findMany({
        where: {
          orgId,
        },
        select: {
          itemId: true,
          quantity: true,
          locationId: true,
        },
      });

    const balancesByItem =
      new Map<
        string,
        number[]
      >();

    for (const balance of balances) {
      const current =
        balancesByItem.get(
          balance.itemId,
        ) ?? [];

      current.push(
        balance.quantity,
      );

      balancesByItem.set(
        balance.itemId,
        current,
      );
    }

    return items
      .map((item) => {
        const locationQuantities =
          balancesByItem.get(
            item.id,
          ) ?? [];

        const currentQuantity =
          locationQuantities.reduce(
            (total, quantity) =>
              total + quantity,
            0,
          );

        const stockStatus =
          this.getStockStatus(
            currentQuantity,
            locationQuantities,
            item.reorderLevel,
          );

        const suggestedOrderQuantity =
          locationQuantities.reduce(
            (total, quantity) =>
              total +
              Math.max(
                item.reorderLevel -
                  quantity,
                0,
              ),
            0,
          );

        const suggestedOrderValue =
          suggestedOrderQuantity *
          Number(item.unitPrice);

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          unitOfMeasure:
            item.unitOfMeasure,
          unitPrice:
            item.unitPrice,
          reorderLevel:
            item.reorderLevel,
          currentQuantity,
          suggestedOrderQuantity,
          suggestedOrderValue,

          stockStatus,
        };
      })
      .filter(
        (item) =>
          item.stockStatus ===
          'LOW_STOCK' ||
          item.stockStatus ===
            'OUT_OF_STOCK',
      );
  }

  async getInventoryAlerts(
    orgId: string,
  ) {
    const items =
      await this.prisma.item.findMany({
        where: {
          orgId,
          status: 'active',
        },
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure:
            true,
          unitPrice: true,
          reorderLevel: true,
        },
      });

    const balances =
      await this.prisma.itemLocation.findMany({
        where: {
          orgId,
        },
        select: {
          itemId: true,
          quantity: true,
        },
      });

    const balancesByItem =
      new Map<
        string,
        number[]
      >();

    for (const balance of balances) {
      const current =
        balancesByItem.get(
          balance.itemId,
        ) ?? [];

      current.push(
        balance.quantity,
      );

      balancesByItem.set(
        balance.itemId,
        current,
      );
    }

    return items
      .map((item) => {
        const locationQuantities =
          balancesByItem.get(
            item.id,
          ) ?? [];

        const currentQuantity =
          locationQuantities.reduce(
            (total, quantity) =>
              total + quantity,
            0,
          );

        const stockStatus =
          this.getStockStatus(
            currentQuantity,
            locationQuantities,
            item.reorderLevel,
          );

        const alertType =
          stockStatus ===
          'OUT_OF_STOCK'
            ? 'OUT_OF_STOCK'
            : stockStatus ===
                'LOW_STOCK'
              ? 'LOW_STOCK'
              : null;

        const suggestedOrderQuantity =
          locationQuantities.reduce(
            (total, quantity) =>
              total +
              Math.max(
                item.reorderLevel -
                  quantity,
                0,
              ),
            0,
          );

        const suggestedOrderValue =
          suggestedOrderQuantity *
          Number(item.unitPrice);

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          unitOfMeasure:
            item.unitOfMeasure,
          unitPrice:
            item.unitPrice,
          reorderLevel:
            item.reorderLevel,
          currentQuantity,
          alertType,
          suggestedOrderQuantity,
          suggestedOrderValue,
        };
      })
      .filter(
        (item) =>
          item.alertType !== null,
      )
      .sort((a, b) => {
        if (
          a.alertType ===
            'OUT_OF_STOCK' &&
          b.alertType !==
            'OUT_OF_STOCK'
        ) {
          return -1;
        }

        if (
          a.alertType !==
            'OUT_OF_STOCK' &&
          b.alertType ===
            'OUT_OF_STOCK'
        ) {
          return 1;
        }

        return a.name.localeCompare(
          b.name,
        );
      });
  }

  async getLocationReorderAnalysis(
    orgId: string,
  ) {
    const balances =
      await this.prisma.itemLocation.findMany(
        {
          where: {
            orgId,
          },
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                unitOfMeasure:
                  true,
                unitPrice:
                  true,
                reorderLevel:
                  true,
                status: true,
              },
            },

            location: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },

          orderBy: [
            {
              item: {
                name: 'asc',
              },
            },
            {
              location: {
                name: 'asc',
              },
            },
          ],
        },
      );

    const quantityByItem =
      new Map<string, number>();

    for (const balance of balances) {
      quantityByItem.set(
        balance.itemId,
        (quantityByItem.get(
          balance.itemId,
        ) ?? 0) +
          balance.quantity,
      );
    }

    return balances
      .filter(
        (balance) =>
          balance.item.status ===
          'active',
      )
      .map((balance) => {
        const organizationQuantity =
          quantityByItem.get(
            balance.itemId,
          ) ?? 0;

        const reorderLevel =
          balance.item.reorderLevel;

        let stockStatus:
          | 'OUT_OF_STOCK'
          | 'LOW_STOCK'
          | 'IN_STOCK';

        if (
          organizationQuantity ===
          0
        ) {
          stockStatus =
            'OUT_OF_STOCK';
        } else if (
          balance.quantity <=
          reorderLevel
        ) {
          stockStatus =
            'LOW_STOCK';
        } else {
          stockStatus =
            'IN_STOCK';
        }

        const suggestedOrderQuantity =
          Math.max(
            reorderLevel -
              balance.quantity,
            0,
          );

        const suggestedOrderValue =
          suggestedOrderQuantity *
          Number(
            balance.item.unitPrice,
          );

        return {
          item: {
            id:
              balance.item.id,
            sku:
              balance.item.sku,
            name:
              balance.item.name,
            unitOfMeasure:
              balance.item
                .unitOfMeasure,
            unitPrice:
              balance.item
                .unitPrice,
          },

          location: {
            id:
              balance.location.id,
            name:
              balance.location.name,
            status:
              balance.location.status,
          },

          currentQuantity:
            balance.quantity,

          organizationQuantity,

          reorderLevel,

          suggestedOrderQuantity,

          suggestedOrderValue,

          stockStatus,
        };
      })
      .filter(
        (entry) =>
          entry.stockStatus !==
          'IN_STOCK',
      );
  }

  async getStockMovementTrend(
  orgId: string,
  days = 30,
) {
  const safeDays = Math.min(
    Math.max(Math.floor(days), 7),
    90,
  );

  const now = new Date();

  const endDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  const startDate = new Date(endDate);

  startDate.setUTCDate(
    startDate.getUTCDate() -
      (safeDays - 1),
  );

  startDate.setUTCHours(
    0,
    0,
    0,
    0,
  );

  /*
   * Movement definitions
   *
   * RECEIVED     = positive receive quantity
   * ISSUED       = absolute issue quantity
   * ADJUSTED     = absolute adjustment quantity
   * TRANSFERRED  = positive transfer quantity
   *
   * Transfers are represented by a negative source
   * movement and a positive destination movement,
   * so only positive transfer quantities are counted.
   */

  const transactions =
    await this.prisma.stockTransaction.findMany({
      where: {
        orgId,

        createdAt: {
          gte: startDate,
          lte: endDate,
        },

        txnType: {
          in: [
            'receive',
            'issue',
            'adjustment',
            'transfer',
          ],
        },
      },

      select: {
        txnType: true,
        quantity: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

  let received = 0;
  let issued = 0;
  let adjusted = 0;
  let transferred = 0;

  for (const transaction of transactions) {
    switch (transaction.txnType) {
      case 'receive':
        received += transaction.quantity;
        break;

      case 'issue':
        issued += Math.abs(
          transaction.quantity,
        );
        break;

      case 'adjustment':
        adjusted += Math.abs(
          transaction.quantity,
        );
        break;

      case 'transfer':
        if (
          transaction.quantity > 0
        ) {
          transferred +=
            transaction.quantity;
        }
        break;

      default:
        break;
    }
  }

  const buckets = new Map<
    string,
    {
      date: string;
      received: number;
      issued: number;
      adjusted: number;
      transferred: number;
    }
  >();

  for (
    let index = 0;
    index < safeDays;
    index += 1
  ) {
    const date = new Date(
      startDate,
    );

    date.setUTCDate(
      startDate.getUTCDate() +
        index,
    );

    const key =
      date
        .toISOString()
        .slice(0, 10);

    buckets.set(key, {
      date: key,
      received: 0,
      issued: 0,
      adjusted: 0,
      transferred: 0,
    });
  }

  for (const transaction of transactions) {
    const dateKey =
      transaction.createdAt
        .toISOString()
        .slice(0, 10);

    const bucket =
      buckets.get(dateKey);

    if (!bucket) {
      continue;
    }

    switch (transaction.txnType) {
      case 'receive':
        bucket.received +=
          transaction.quantity;
        break;

      case 'issue':
        bucket.issued +=
          Math.abs(
            transaction.quantity,
          );
        break;

      case 'adjustment':
        bucket.adjusted +=
          Math.abs(
            transaction.quantity,
          );
        break;

      case 'transfer':
        if (
          transaction.quantity > 0
        ) {
          bucket.transferred +=
            transaction.quantity;
        }
        break;

      default:
        break;
    }
  }

  return {
    days: safeDays,

    fromDate: startDate,

    toDate: endDate,

    totals: {
      received,
      issued,
      adjusted,
      transferred,
    },

    data: Array.from(
      buckets.values(),
    ),
  };
}

  async getRecentInventoryActivity(
    orgId: string,
    limit = 10,
  ) {
    const transactions =
      await this.prisma.stockTransaction.findMany(
        {
          where: {
            orgId,
          },

          orderBy: {
            createdAt: 'desc',
          },

          take: Math.min(
            Math.max(
              limit,
              1,
            ),
            50,
          ),

          select: {
            id: true,
            txnType: true,
            quantity: true,
            reference: true,
            notes: true,
            createdAt: true,

            item: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },

            location: {
              select: {
                id: true,
                name: true,
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
        },
      );

    return {
      data: transactions.map(
        (transaction) => ({
          id:
            transaction.id,
          timestamp:
            transaction.createdAt,
          action:
            transaction.txnType,
          quantity:
            transaction.quantity,
          reference:
            transaction.reference,
          notes:
            transaction.notes,

          item: {
            id:
              transaction.item.id,
            name:
              transaction.item.name,
            sku:
              transaction.item.sku,
          },

          location: {
            id:
              transaction.location
                .id,
            name:
              transaction.location
                .name,
          },

          performedBy: {
            id:
              transaction.user.id,
            name:
              transaction.user.name,
            email:
              transaction.user.email,
          },
        }),
      ),

      pagination: {
        limit: Math.min(
          Math.max(
            limit,
            1,
          ),
          50,
        ),
        count:
          transactions.length,
      },
    };
  }

  async getInventoryRegister(
    orgId: string,
  ) {
    const items =
      await this.prisma.item.findMany({
        where: {
          orgId,
          status: 'active',
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure:
            true,
          unitPrice:
            true,
          sellingPrice:
            true,
          reorderLevel:
            true,

          category: {
            select: {
              id: true,
              name: true,
            },
          },

          locations: {
            select: {
              id: true,
              quantity: true,

              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },

            orderBy: {
              location: {
                name: 'asc',
              },
            },
          },
        },
      });

    return {
      data: items.map(
        (item) => {
          const totalQuantity =
            item.locations.reduce(
              (
                sum,
                location,
              ) =>
                sum +
                location.quantity,
              0,
            );

          const locationCount =
            item.locations
              .length;

          const status =
            this.getStockStatus(
              totalQuantity,
              item.locations.map(
                (location) =>
                  location.quantity,
              ),
              item.reorderLevel,
            );

          return {
            id: item.id,
            sku: item.sku,
            name: item.name,

            category:
              item.category
                ? {
                    id:
                      item.category
                        .id,
                    name:
                      item.category
                        .name,
                  }
                : null,

            unitOfMeasure:
              item.unitOfMeasure,

            unitPrice:
              Number(
                item.unitPrice,
              ),

            sellingPrice:
              item.sellingPrice ===
              null
                ? null
                : Number(
                    item.sellingPrice,
                  ),

            quantity:
              totalQuantity,

            locations:
              locationCount,

            reorderLevel:
              item.reorderLevel,

            status,

            locationBreakdown:
              item.locations.map(
                (entry) => ({
                  id:
                    entry.id,
                  locationId:
                    entry.location
                      .id,
                  locationName:
                    entry.location
                      .name,
                  quantity:
                    entry.quantity,
                }),
              ),
          };
        },
      ),
    };
  }

  async removeItemLocation(
    orgId: string,
    itemId: string,
    locationId: string,
  ) {
    const item =
      await this.prisma.item.findFirst({
        where: {
          orgId,
          id: itemId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found in this organization.',
      );
    }

    const balance =
      await this.prisma.itemLocation.findUnique({
        where: {
          orgId_itemId_locationId: {
            orgId,
            itemId,
            locationId,
          },
        },
      });

    if (!balance) {
      return {
        removed: false,
        message:
          'Item is not assigned to this location.',
      };
    }

    if (
      balance.quantity !== 0
    ) {
      throw new ConflictException(
        `Cannot remove this location because ${item.name} currently has ${balance.quantity} ${
          balance.quantity === 1
            ? 'unit'
            : 'units'
        } of stock there. Transfer or issue the stock first.`,
      );
    }

    await this.prisma.itemLocation.delete(
      {
        where: {
          orgId_itemId_locationId: {
            orgId,
            itemId,
            locationId,
          },
        },
      },
    );

    return {
      removed: true,
      itemId,
      locationId,
    };
  }
}