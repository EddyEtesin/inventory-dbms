import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    reference?: string,
    notes?: string,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ConflictException(
        'Opening balance quantity must be a positive whole number.',
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

    return this.prisma.$transaction(async (tx) => {
      const existingBalance = await tx.itemLocation.findUnique({
        where: {
          orgId_itemId_locationId: {
            orgId,
            itemId,
            locationId,
          },
        },
      });

      if (existingBalance && existingBalance.quantity !== 0) {
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

      const transaction = await tx.stockTransaction.create({
        data: {
          orgId,
          itemId,
          locationId,
          txnType: 'opening_balance',
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
          quantity: {
            increment: quantity,
          },
        },
      });

      return {
        balance: updatedBalance,
        transaction,
      };
    });
  }

  async getItemLocationTransactions(
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

    return this.prisma.stockTransaction.findMany({
      where: {
        orgId,
        itemId,
        locationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
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
}