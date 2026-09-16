'use client';

import { useEffect, useState } from 'react';

import InventorySidebar from '../../components/inventory/InventorySidebar';
import ReportsHeader from '../../components/reports/ReportsHeader';
import ReportFilters, {
  type ReportFilterState,
} from '../../components/reports/ReportFilters';
import StockMovementReport, {
  type StockMovementRow,
  type StockMovementSummary,
} from '../../components/reports/StockMovementReport';
import { apiFetch } from '../../lib/api';

type LocationOption = {
  id: string;
  name: string;
};

type ItemOption = {
  id: string;
  sku: string;
  name: string;
  category?: {
    id: string;
    name: string;
  } | null;
};

type CategoryOption = {
  id: string;
  name: string;
};

type ReportResponse = {
  summary: StockMovementSummary;
  data: StockMovementRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type CollectionResponse<T> =
  | T[]
  | {
      data: T[];
    };

const initialFilters: ReportFilterState = {
  fromDate: '',
  toDate: '',
  locationId: '',
  itemId: '',
  categoryId: '',
  txnType: '',
};

const emptySummary: StockMovementSummary = {
  transactionCount: 0,
  totalReceived: 0,
  totalIssued: 0,
  totalAdjusted: 0,
  totalTransferred: 0,
};

function getCollectionData<T>(
  response: CollectionResponse<T>,
): T[] {
  return Array.isArray(response)
    ? response
    : response.data ?? [];
}

export default function ReportsPage() {
  const [collapsed, setCollapsed] = useState(false);

  const [filters, setFilters] =
    useState<ReportFilterState>(initialFilters);

  const [locations, setLocations] = useState<
    LocationOption[]
  >([]);

  const [items, setItems] = useState<ItemOption[]>([]);
  const [categories, setCategories] = useState<
    CategoryOption[]
  >([]);

  const [rows, setRows] = useState<StockMovementRow[]>([]);
  const [summary, setSummary] =
    useState<StockMovementSummary>(emptySummary);

  const [loading, setLoading] = useState(true);
  const [reportError, setReportError] = useState('');

  async function loadReferenceData() {
    const token =
      window.localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('Please sign in first.');
    }

    const [
      locationsResponse,
      itemsResponse,
      categoriesResponse,
    ] = await Promise.all([
      apiFetch<CollectionResponse<LocationOption>>(
        '/locations',
        token,
      ),
      apiFetch<CollectionResponse<ItemOption>>(
        '/items',
        token,
      ),
      apiFetch<CollectionResponse<CategoryOption>>(
        '/categories',
        token,
      ),
    ]);

    setLocations(
      getCollectionData(locationsResponse),
    );

    setItems(getCollectionData(itemsResponse));
    setCategories(
      getCollectionData(categoriesResponse),
    );
  }

  async function loadReport(
    nextFilters: ReportFilterState = filters,
  ) {
    try {
      setLoading(true);
      setReportError('');

      const token =
        window.localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('Please sign in first.');
      }

      const params = new URLSearchParams();

      params.set('page', '1');
      params.set('pageSize', '25');

      if (nextFilters.fromDate) {
        params.set(
          'fromDate',
          nextFilters.fromDate,
        );
      }

      if (nextFilters.toDate) {
        params.set(
          'toDate',
          nextFilters.toDate,
        );
      }

      if (nextFilters.locationId) {
        params.set(
          'locationId',
          nextFilters.locationId,
        );
      }

      if (nextFilters.itemId) {
        params.set(
          'itemId',
          nextFilters.itemId,
        );
      }

      if (nextFilters.categoryId) {
        params.set(
          'categoryId',
          nextFilters.categoryId,
        );
      }

      if (nextFilters.txnType) {
        params.set(
          'txnType',
          nextFilters.txnType,
        );
      }

      const response =
        await apiFetch<ReportResponse>(
          `/reports/stock-movement?${params.toString()}`,
          token,
        );

      setRows(response.data ?? []);
      setSummary(response.summary ?? emptySummary);
    } catch (err) {
      setReportError(
        err instanceof Error
          ? err.message
          : 'Unable to load report.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        await loadReferenceData();
        await loadReport(initialFilters);
      } catch (err) {
        setReportError(
          err instanceof Error
            ? err.message
            : 'Unable to load Reports.',
        );
        setLoading(false);
      }
    }

    initialize();
  }, []);

  const handleReset = () => {
    setFilters(initialFilters);
    loadReport(initialFilters);
  };

  return (
    <main className="min-h-screen bg-[#ddd0b8] text-[#2b2620]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed((value) => !value)
        }
      />

      <div
        className={`min-h-screen ${
          collapsed
            ? 'md:pl-[68px]'
            : 'md:pl-[205px]'
        }`}
      >
        <div className="p-3 md:p-5">
          <div className="mx-auto max-w-[1450px]">
            <ReportsHeader />

            {reportError && (
              <div className="mb-5 border border-[#a63a2e]/30 bg-[#f5f0e3] px-4 py-3 font-mono text-[9px] text-[#a63a2e]">
                {reportError}
              </div>
            )}

            <ReportFilters
              filters={filters}
              locations={locations}
              items={items}
              categories={categories}
              loading={loading}
              onChange={setFilters}
              onGenerate={() =>
                loadReport(filters)
              }
              onReset={handleReset}
            />

            <StockMovementReport
              rows={rows}
              summary={summary}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </main>
  );
}