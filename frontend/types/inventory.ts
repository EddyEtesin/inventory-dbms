export type InventoryStatus = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type Operation = 'receive' | 'issue' | 'adjust' | 'transfer' | null;

export type RegisterItem = {
  id: string;
  sku: string;
  name: string;
  category: {
    id: string;
    name: string;
  } | null;
  unitOfMeasure: string;
  unitPrice: number;
  quantity: number;
  locations: number;
  reorderLevel: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  locationBreakdown: {
    id: string;
    locationId: string;
    locationName: string;
    quantity: number;
    reorderLevel: number;
  }[];
};

export type RegisterResponse = {
  data: RegisterItem[];
};

export type Transaction = {
  id: string;
  txnType: string;
  quantity: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

export type TransactionResponse = {
  summary: {
    item: {
      id: string;
      name: string;
      sku: string;
    };
    location: {
      id: string;
      name: string;
    };
    currentQuantity: number;
    transactionCount: number;
  };
  data: Transaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type InventorySummaryResponse = {
  totals: {
    activeItems: number;
    totalUnitsInStock: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalInventoryValue: number;
  };
};

export type RecentActivity = {
  id?: string;
  timestamp?: string;
  createdAt?: string;
  action?: string;
  txnType?: string;
  quantity: number;
  reference?: string | null;
  notes?: string | null;
  item?: {
    id: string;
    name: string;
    sku: string;
  };
  location?: {
    id: string;
    name: string;
  };
  performedBy?: {
    id: string;
    name: string | null;
    email: string;
  };
};
