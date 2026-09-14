import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType, } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

    private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async getOrCreateBalance(
    orgId: string,
    itemId: string,
    locationId: string,
  ) {
    const item = await this.prisma.item.findFirst({
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

    const location = await this.prisma.location.findFirst({
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
    const balance = await this.prisma.itemLocation.findFirst({
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
    const item = await this.prisma.item.findFirst({
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
            status: true,
          },
        },
      },
    });
  }

  async getLocationInventory(
    orgId: string,
    locationId: string,
  ) {
    const location = await this.prisma.location.findFirst({
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
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ConflictException(
        'Opening balance quantity must be a positive whole number.',
      );
    }

    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new ConflictException(
        'An idempotency key is required for opening balances.',
      );
    }

    const item = await this.prisma.item.findFirst({
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

    const location = await this.prisma.location.findFirst({
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
      return await this.prisma.$transaction(async (tx) => {
        const existingTransaction =
          await tx.stockTransaction.findFirst({
            where: {
              orgId,
              idempotencyKey,
            },
          });

        if (existingTransaction) {
          const sameRequest =
            existingTransaction.itemId === itemId &&
            existingTransaction.locationId === locationId &&
            existingTransaction.quantity === quantity &&
            existingTransaction.txnType === 'opening_balance' &&
            existingTransaction.reference === reference &&
            existingTransaction.notes === notes;

          if (!sameRequest) {
            throw new ConflictException(
              'This idempotency key has already been used for a different opening balance.',
            );
          }

          return {
            balance: await tx.itemLocation.findUnique({
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId: existingTransaction.itemId,
                  locationId: existingTransaction.locationId,
                },
              },
            }),
            transaction: existingTransaction,
            replayed: true,
          };
        }

        const existingBalance =
          await tx.itemLocation.findUnique({
            where: {
              orgId_itemId_locationId: {
                orgId,
                itemId,
                locationId,
              },
            },
          });

        if (
          existingBalance &&
          existingBalance.quantity !== 0
        ) {
          throw new ConflictException(
            'Opening balance can only be created when the current inventory balance is zero.',
          );
        }

        const balance = existingBalance
          ? existingBalance
          : await tx.itemLocation.create({
              data: {
                orgId,
                itemId,
                locationId,
                quantity: 0,
              },
            });

        const transaction =
          await tx.stockTransaction.create({
            data: {
              orgId,
              itemId,
              locationId,
              txnType: 'opening_balance',
              quantity,
              performedBy,
              idempotencyKey,
              reference,
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
                increment: quantity,
              },
            },
          });

        return {
          balance: updatedBalance,
          transaction,
          replayed: false,
        };
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const existingTransaction =
        await this.prisma.stockTransaction.findFirst({
          where: {
            orgId,
            idempotencyKey,
          },
        });

      if (!existingTransaction) {
        throw error;
      }

      const sameRequest =
        existingTransaction.itemId === itemId &&
        existingTransaction.locationId === locationId &&
        existingTransaction.quantity === quantity &&
        existingTransaction.txnType === 'opening_balance' &&
        existingTransaction.reference === reference &&
        existingTransaction.notes === notes;

      if (!sameRequest) {
        throw new ConflictException(
          'This idempotency key has already been used for a different opening balance.',
        );
      }

      return {
        balance: await this.prisma.itemLocation.findUnique({
          where: {
            orgId_itemId_locationId: {
              orgId,
              itemId: existingTransaction.itemId,
              locationId: existingTransaction.locationId,
            },
          },
        }),
        transaction: existingTransaction,
        replayed: true,
      };
    }
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
    const balance = await this.prisma.itemLocation.findFirst({
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
            unitOfMeasure: true,
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

    if (!balance) {
      throw new NotFoundException(
        'Inventory balance not found for this item at this location.',
      );
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    if (filters?.fromDate && filters?.toDate) {
      const from = new Date(filters.fromDate);
      const to = new Date(filters.toDate);

      if (from > to) {
        throw new ConflictException(
          'fromDate cannot be later than toDate.',
        );
      }
    }

    const createdAtFilter =
      filters?.fromDate || filters?.toDate
        ? {
            ...(filters.fromDate
              ? {
                  gte: new Date(filters.fromDate),
                }
              : {}),
            ...(filters.toDate
              ? {
                  lt: new Date(
                    new Date(filters.toDate).getTime() +
                      24 * 60 * 60 * 1000,
                  ),
                }
              : {}),
          }
        : undefined;

    const where: Prisma.StockTransactionWhereInput = {
      orgId,
      itemId,
      locationId,

      ...(filters?.txnType
        ? {
            txnType: filters.txnType,
          }
        : {}),

      ...(filters?.reference
        ? {
            reference: {
              contains: filters.reference,
              mode: 'insensitive',
            },
          }
        : {}),

      ...(createdAtFilter
        ? {
            createdAt: createdAtFilter,
          }
        : {}),
    };

    const [transactions, total] =
      await this.prisma.$transaction([
        this.prisma.stockTransaction.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: pageSize,
        }),

        this.prisma.stockTransaction.count({
          where,
        }),
      ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      summary: {
        item: balance.item,
        location: balance.location,
        currentQuantity: balance.quantity,
        transactionCount: total,
      },

      data: transactions,

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
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ConflictException(
        'Received stock quantity must be a positive whole number.',
      );
    }

    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new ConflictException(
        'An idempotency key is required for stock receipts.',
      );
    }

    const item = await this.prisma.item.findFirst({
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

    const location = await this.prisma.location.findFirst({
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
      return await this.prisma.$transaction(async (tx) => {
        const existingTransaction =
          await tx.stockTransaction.findFirst({
            where: {
              orgId,
              idempotencyKey,
            },
          });

        if (existingTransaction) {
          const sameRequest =
            existingTransaction.itemId === itemId &&
            existingTransaction.locationId === locationId &&
            existingTransaction.quantity === quantity &&
            existingTransaction.txnType === 'receive' &&
            existingTransaction.reference === reference &&
            existingTransaction.notes === notes;

          if (!sameRequest) {
            throw new ConflictException(
              'This idempotency key has already been used for a different stock receipt.',
            );
          }

          return {
            balance: await tx.itemLocation.findUnique({
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId: existingTransaction.itemId,
                  locationId: existingTransaction.locationId,
                },
              },
            }),
            transaction: existingTransaction,
            replayed: true,
          };
        }

        const balance = await tx.itemLocation.upsert({
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

        const transaction = await tx.stockTransaction.create({
          data: {
            orgId,
            itemId,
            locationId,
            txnType: 'receive',
            quantity,
            performedBy,
            idempotencyKey,
            reference,
            notes,
          },
        });

        const updatedBalance = await tx.itemLocation.update({
          where: {
            id: balance.id,
          },
          data: {
            quantity: {
              increment: quantity,
            },
          },
        });

        return {
          balance: updatedBalance,
          transaction,
          replayed: false,
        };
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const existingTransaction =
        await this.prisma.stockTransaction.findFirst({
          where: {
            orgId,
            idempotencyKey,
          },
        });

      if (!existingTransaction) {
        throw error;
      }

      const sameRequest =
        existingTransaction.itemId === itemId &&
        existingTransaction.locationId === locationId &&
        existingTransaction.quantity === quantity &&
        existingTransaction.txnType === 'receive' &&
        existingTransaction.reference === reference &&
        existingTransaction.notes === notes;

      if (!sameRequest) {
        throw new ConflictException(
          'This idempotency key has already been used for a different stock receipt.',
        );
      }

      return {
        balance: await this.prisma.itemLocation.findUnique({
          where: {
            orgId_itemId_locationId: {
              orgId,
              itemId: existingTransaction.itemId,
              locationId: existingTransaction.locationId,
            },
          },
        }),
        transaction: existingTransaction,
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
    reference?: string,
    notes?: string,
  ) {
    if (!Number.isInteger(quantity) || quantity === 0) {
      throw new ConflictException(
        'Adjustment quantity must be a non-zero whole number.',
      );
    }

    const item = await this.prisma.item.findFirst({
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

    const location = await this.prisma.location.findFirst({
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

    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.itemLocation.upsert({
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

      const newQuantity = balance.quantity + quantity;

      if (newQuantity < 0) {
        throw new ConflictException(
          'Stock adjustment cannot reduce inventory below zero.',
        );
      }

      const transaction = await tx.stockTransaction.create({
        data: {
          orgId,
          itemId,
          locationId,
          txnType: 'adjustment',
          quantity,
          performedBy,
          reference,
          notes,
        },
      });

      const updatedBalance = await tx.itemLocation.update({
        where: {
          id: balance.id,
        },
        data: {
          quantity: newQuantity,
        },
      });

      return {
        balance: updatedBalance,
        transaction,
      };
    });
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
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ConflictException(
        'Issued stock quantity must be a positive whole number.',
      );
    }

    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new ConflictException(
        'An idempotency key is required for stock issues.',
      );
    }

    const item = await this.prisma.item.findFirst({
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

    const location = await this.prisma.location.findFirst({
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
      return await this.prisma.$transaction(async (tx) => {
        const existingTransaction =
          await tx.stockTransaction.findFirst({
            where: {
              orgId,
              idempotencyKey,
            },
          });

        if (existingTransaction) {
          const sameRequest =
            existingTransaction.itemId === itemId &&
            existingTransaction.locationId === locationId &&
            existingTransaction.quantity === -quantity &&
            existingTransaction.txnType === 'issue' &&
            existingTransaction.reference === reference &&
            existingTransaction.notes === notes;

          if (!sameRequest) {
            throw new ConflictException(
              'This idempotency key has already been used for a different stock issue.',
            );
          }

          return {
            balance: await tx.itemLocation.findUnique({
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId: existingTransaction.itemId,
                  locationId: existingTransaction.locationId,
                },
              },
            }),
            transaction: existingTransaction,
            replayed: true,
          };
        }

        const balance = await tx.itemLocation.findUnique({
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

        if (balance.quantity < quantity) {
          throw new ConflictException(
            `Insufficient stock. Available quantity is ${balance.quantity}.`,
          );
        }

        const transaction = await tx.stockTransaction.create({
          data: {
            orgId,
            itemId,
            locationId,
            txnType: 'issue',
            quantity: -quantity,
            performedBy,
            idempotencyKey,
            reference,
            notes,
          },
        });

        const updatedBalance = await tx.itemLocation.update({
          where: {
            id: balance.id,
          },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });

        return {
          balance: updatedBalance,
          transaction,
          replayed: false,
        };
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const existingTransaction =
        await this.prisma.stockTransaction.findFirst({
          where: {
            orgId,
            idempotencyKey,
          },
        });

      if (!existingTransaction) {
        throw error;
      }

      const sameRequest =
        existingTransaction.itemId === itemId &&
        existingTransaction.locationId === locationId &&
        existingTransaction.quantity === -quantity &&
        existingTransaction.txnType === 'issue' &&
        existingTransaction.reference === reference &&
        existingTransaction.notes === notes;

      if (!sameRequest) {
        throw new ConflictException(
          'This idempotency key has already been used for a different stock issue.',
        );
      }

      return {
        balance: await this.prisma.itemLocation.findUnique({
          where: {
            orgId_itemId_locationId: {
              orgId,
              itemId: existingTransaction.itemId,
              locationId: existingTransaction.locationId,
            },
          },
        }),
        transaction: existingTransaction,
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
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ConflictException(
        'Transfer quantity must be a positive whole number.',
      );
    }

    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new ConflictException(
        'An idempotency key is required for stock transfers.',
      );
    }

    if (fromLocationId === toLocationId) {
      throw new ConflictException(
        'Source and destination locations must be different.',
      );
    }

    const item = await this.prisma.item.findFirst({
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

    const locations = await this.prisma.location.findMany({
      where: {
        orgId,
        id: {
          in: [fromLocationId, toLocationId],
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

    const fromLocation = locations.find(
      (location) => location.id === fromLocationId,
    );

    const toLocation = locations.find(
      (location) => location.id === toLocationId,
    );

    if (!fromLocation || !toLocation) {
      throw new NotFoundException(
        'One or both transfer locations were not found in this organization.',
      );
    }

    if (
      fromLocation.status !== 'active' ||
      toLocation.status !== 'active'
    ) {
      throw new ConflictException(
        'Stock can only be transferred between active locations.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingTransaction =
          await tx.stockTransaction.findFirst({
            where: {
              orgId,
              idempotencyKey,
            },
          });

        if (existingTransaction) {
          const transfer = existingTransaction.transferId
            ? await tx.stockTransfer.findUnique({
                where: {
                  id: existingTransaction.transferId,
                },
              })
            : null;

          const sameRequest =
            existingTransaction.txnType === 'transfer' &&
            existingTransaction.itemId === itemId &&
            existingTransaction.quantity === -quantity &&
            existingTransaction.reference === reference &&
            existingTransaction.notes === notes &&
            transfer?.fromLocationId === fromLocationId &&
            transfer?.toLocationId === toLocationId &&
            transfer?.quantity === quantity;

          if (!sameRequest) {
            throw new ConflictException(
              'This idempotency key has already been used for a different stock transfer.',
            );
          }

          return {
            transfer,
            fromBalance: await tx.itemLocation.findUnique({
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId,
                  locationId: fromLocationId,
                },
              },
            }),
            toBalance: await tx.itemLocation.findUnique({
              where: {
                orgId_itemId_locationId: {
                  orgId,
                  itemId,
                  locationId: toLocationId,
                },
              },
            }),
            fromTransaction: existingTransaction,
            toTransaction: transfer
              ? await tx.stockTransaction.findFirst({
                  where: {
                    orgId,
                    transferId: transfer.id,
                    locationId: toLocationId,
                  },
                })
              : null,
            replayed: true,
          };
        }

        const fromBalance = await tx.itemLocation.findUnique({
          where: {
            orgId_itemId_locationId: {
              orgId,
              itemId,
              locationId: fromLocationId,
            },
          },
        });

        if (!fromBalance) {
          throw new NotFoundException(
            'Source inventory balance not found for this item at this location.',
          );
        }

        if (fromBalance.quantity < quantity) {
          throw new ConflictException(
            `Insufficient stock at the source location. Available quantity is ${fromBalance.quantity}.`,
          );
        }

        const transfer = await tx.stockTransfer.create({
          data: {
            orgId,
            itemId,
            fromLocationId,
            toLocationId,
            quantity,
            status: 'completed',
            reference,
            performedBy,
            completedAt: new Date(),
          },
        });

        const fromTransaction =
          await tx.stockTransaction.create({
            data: {
              orgId,
              itemId,
              locationId: fromLocationId,
              txnType: 'transfer',
              quantity: -quantity,
              reference,
              transferId: transfer.id,
              performedBy,
              idempotencyKey,
              notes,
            },
          });

        const toTransaction =
          await tx.stockTransaction.create({
            data: {
              orgId,
              itemId,
              locationId: toLocationId,
              txnType: 'transfer',
              quantity,
              reference,
              transferId: transfer.id,
              performedBy,
              notes,
            },
          });

        const updatedFromBalance =
          await tx.itemLocation.update({
            where: {
              id: fromBalance.id,
            },
            data: {
              quantity: {
                decrement: quantity,
              },
            },
          });

        const updatedToBalance =
          await tx.itemLocation.upsert({
            where: {
              orgId_itemId_locationId: {
                orgId,
                itemId,
                locationId: toLocationId,
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
              locationId: toLocationId,
              quantity,
            },
          });

        return {
          transfer,
          fromBalance: updatedFromBalance,
          toBalance: updatedToBalance,
          fromTransaction,
          toTransaction,
          replayed: false,
        };
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const existingTransaction =
        await this.prisma.stockTransaction.findFirst({
          where: {
            orgId,
            idempotencyKey,
          },
        });

      if (!existingTransaction) {
        throw error;
      }

      const transfer = existingTransaction.transferId
        ? await this.prisma.stockTransfer.findUnique({
            where: {
              id: existingTransaction.transferId,
            },
          })
        : null;

      const sameRequest =
        existingTransaction.txnType === 'transfer' &&
        existingTransaction.itemId === itemId &&
        existingTransaction.quantity === -quantity &&
        existingTransaction.reference === reference &&
        existingTransaction.notes === notes &&
        transfer?.fromLocationId === fromLocationId &&
        transfer?.toLocationId === toLocationId &&
        transfer?.quantity === quantity;

      if (!sameRequest) {
        throw new ConflictException(
          'This idempotency key has already been used for a different stock transfer.',
        );
      }

      return {
        transfer,
        fromBalance: await this.prisma.itemLocation.findUnique({
          where: {
            orgId_itemId_locationId: {
              orgId,
              itemId,
              locationId: fromLocationId,
            },
          },
        }),
        toBalance: await this.prisma.itemLocation.findUnique({
          where: {
            orgId_itemId_locationId: {
              orgId,
              itemId,
              locationId: toLocationId,
            },
          },
        }),
        fromTransaction: existingTransaction,
        toTransaction: transfer
          ? await this.prisma.stockTransaction.findFirst({
              where: {
                orgId,
                transferId: transfer.id,
                locationId: toLocationId,
              },
            })
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
    const balances = await this.prisma.itemLocation.findMany({
      where: {
        orgId,
        ...(itemId ? { itemId } : {}),
        ...(locationId ? { locationId } : {}),
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

    const results = await Promise.all(
      balances.map(async (balance) => {
        const ledgerResult =
          await this.prisma.stockTransaction.aggregate({
            where: {
              orgId,
              itemId: balance.itemId,
              locationId: balance.locationId,
            },
            _sum: {
              quantity: true,
            },
          });

        const ledgerQuantity = ledgerResult._sum.quantity ?? 0;
        const difference =
          balance.quantity - ledgerQuantity;

        const negativeBalance = balance.quantity < 0;

        let status = 'OK';

        if (difference !== 0) {
          status = 'MISMATCH';
        } else if (negativeBalance) {
          status = 'NEGATIVE_BALANCE';
        }

        return {
          item: balance.item,
          location: balance.location,
          balanceQuantity: balance.quantity,
          ledgerQuantity,
          difference,
          negativeBalance,
          status,
        };
      }),
    );

    const mismatches = results.filter(
      (result) => result.status === 'MISMATCH',
    );

    const negativeBalances = results.filter(
      (result) => result.negativeBalance,
    );

    return {
      organizationId: orgId,
      status:
        mismatches.length === 0 && negativeBalances.length === 0
          ? 'OK'
          : 'ATTENTION_REQUIRED',
      totalChecked: results.length,
      mismatches: mismatches.length,
      negativeBalances: negativeBalances.length,
      results,
    };
  }

    async getInventorySummary(
    orgId: string,
    itemId: string,
  ) {
    const item = await this.prisma.item.findFirst({
      where: {
        orgId,
        id: itemId,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unitOfMeasure: true,
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

    const balances = await this.prisma.itemLocation.findMany({
      where: {
        orgId,
        itemId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            locationType: true,
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

    const totalQuantity = balances.reduce(
      (total, balance) => total + balance.quantity,
      0,
    );

    let stockStatus = 'IN_STOCK';

    if (totalQuantity === 0) {
      stockStatus = 'OUT_OF_STOCK';
    } else if (totalQuantity <= item.reorderLevel) {
      stockStatus = 'LOW_STOCK';
    }

    return {
      item: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        reorderLevel: item.reorderLevel,
        status: item.status,
      },
      totalQuantity,
      stockStatus,
      locations: balances.map((balance) => ({
        location: balance.location,
        quantity: balance.quantity,
        reorderLevel:
          balance.reorderLevel ?? item.reorderLevel,
      })),
    };
  }

    async getOrganizationInventorySummary(orgId: string) {
    const [items, balances] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where: {
          orgId,
          status: 'active',
        },
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure: true,
          unitPrice: true,
          reorderLevel: true,
        },
      }),

      this.prisma.itemLocation.findMany({
        where: {
          orgId,
        },
        select: {
          itemId: true,
          locationId: true,
          quantity: true,
          reorderLevel: true,
          location: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const quantityByItem = new Map<string, number>();

    for (const balance of balances) {
      quantityByItem.set(
        balance.itemId,
        (quantityByItem.get(balance.itemId) ?? 0) +
          balance.quantity,
      );
    }

    let totalUnitsInStock = 0;
    let totalInventoryValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    const itemSummaries = items.map((item) => {
      const totalQuantity =
        quantityByItem.get(item.id) ?? 0;

      const inventoryValue =
        totalQuantity * Number(item.unitPrice);

      totalUnitsInStock += totalQuantity;
      totalInventoryValue += inventoryValue;

      if (totalQuantity === 0) {
        outOfStockItems++;
      } else if (totalQuantity <= item.reorderLevel) {
        lowStockItems++;
      }

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        reorderLevel: item.reorderLevel,
        totalQuantity,
        inventoryValue,
        stockStatus:
          totalQuantity === 0
            ? 'OUT_OF_STOCK'
            : totalQuantity <= item.reorderLevel
              ? 'LOW_STOCK'
              : 'IN_STOCK',
      };
    });

    const locationSummaries = balances.reduce(
      (result, balance) => {
        const existing = result.get(balance.locationId);

        if (existing) {
          existing.totalQuantity += balance.quantity;
        } else {
          result.set(balance.locationId, {
            id: balance.location.id,
            name: balance.location.name,
            status: balance.location.status,
            totalQuantity: balance.quantity,
          });
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
        activeItems: items.length,
        totalUnitsInStock,
        lowStockItems,
        outOfStockItems,
        totalInventoryValue,
      },
      items: itemSummaries,
      locations: Array.from(locationSummaries.values()).sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    };
  }

    async getLowStockItems(orgId: string) {
    const items = await this.prisma.item.findMany({
      where: {
        orgId,
        status: 'active',
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unitOfMeasure: true,
        unitPrice: true,
        reorderLevel: true,
      },
    });

    const balances = await this.prisma.itemLocation.findMany({
      where: {
        orgId,
      },
      select: {
        itemId: true,
        quantity: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    const quantityByItem = new Map<string, number>();

    for (const balance of balances) {
      quantityByItem.set(
        balance.itemId,
        (quantityByItem.get(balance.itemId) ?? 0) +
          balance.quantity,
      );
    }

    return items
      .map((item) => {
        const totalQuantity =
          quantityByItem.get(item.id) ?? 0;

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          unitOfMeasure: item.unitOfMeasure,
          unitPrice: item.unitPrice,
          reorderLevel: item.reorderLevel,
          totalQuantity,
          stockStatus:
            totalQuantity === 0
              ? 'OUT_OF_STOCK'
              : totalQuantity <= item.reorderLevel
                ? 'LOW_STOCK'
                : 'IN_STOCK',
        };
      })
      .filter(
        (item) =>
          item.stockStatus === 'LOW_STOCK',
      );
  }

  async getOutOfStockItems(orgId: string) {
    const items = await this.prisma.item.findMany({
      where: {
        orgId,
        status: 'active',
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unitOfMeasure: true,
        unitPrice: true,
        reorderLevel: true,
      },
    });

    const balances = await this.prisma.itemLocation.findMany({
      where: {
        orgId,
      },
      select: {
        itemId: true,
        quantity: true,
      },
    });

    const quantityByItem = new Map<string, number>();

    for (const balance of balances) {
      quantityByItem.set(
        balance.itemId,
        (quantityByItem.get(balance.itemId) ?? 0) +
          balance.quantity,
      );
    }

    return items
      .map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        reorderLevel: item.reorderLevel,
        totalQuantity:
          quantityByItem.get(item.id) ?? 0,
      }))
      .filter(
        (item) => item.totalQuantity === 0,
      )
      .map((item) => ({
        ...item,
        stockStatus: 'OUT_OF_STOCK',
      }));
  }
}