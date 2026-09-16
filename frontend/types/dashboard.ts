export interface InventoryTotals {
  activeItems: number;
  totalUnitsInStock: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
}

export interface InventorySummaryResponse {
  totals: InventoryTotals;
}

export interface InventoryActivityTotals {
  openingStock: number;
  supplierReceipts: number;
  issued: number;
  transferredIn: number;
  transferredOut: number;
  adjustments: number;
  transactionCount: number;
}

export interface InventoryActivityResponse {
  filters: {
    itemId?: string;
    locationId?: string;
    fromDate?: string;
    toDate?: string;
  };
  totals: InventoryActivityTotals;
}