'use client';

import {
  Activity,
  ArrowUpDown,
  ChevronDown,
  MapPinned,
  PackageOpen,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import InventoryRegister from '../../components/inventory/InventoryRegister';

import InventorySidebar from '../../components/inventory/InventorySidebar';
import { useSidebar } from '../../components/inventory/SidebarProvider';

import ItemDrawer from '../../components/inventory/ItemDrawer';

import { apiFetch } from '../../lib/api';

import { useAutoDismissMessage } from '../../hooks/useAutoDismissMessage';

import type {
  InventoryStatus,
  Operation,
  RegisterItem,
  RegisterResponse,
  Transaction,
  TransactionResponse,
} from '../../types/inventory';

type OrganizationLocation = {
  id: string;
  name: string;
  locationType: string;
  status: string;
};

export default function InventoryPage() {
  const { collapsed, toggleCollapsed } = useSidebar();

  const [items, setItems] = useState<
    RegisterItem[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState('');

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<InventoryStatus>('ALL');

  const [sortBy, setSortBy] =
    useState<
      | 'name'
      | 'quantity_desc'
      | 'quantity_asc'
      | 'locations_desc'
    >('name');

  // --------------------------------------------------
  // ORGANIZATION LOCATIONS
  // --------------------------------------------------

  const [
    organizationLocations,
    setOrganizationLocations,
  ] = useState<
    OrganizationLocation[]
  >([]);

  // --------------------------------------------------
  // ITEM DRAWER
  // --------------------------------------------------

  const [selectedItem, setSelectedItem] =
    useState<RegisterItem | null>(null);

  // --------------------------------------------------
  // STOCK OPERATION
  // --------------------------------------------------

  const [operation, setOperation] =
    useState<Operation>(null);

  const [
    operationLocationId,
    setOperationLocationId,
  ] = useState('');

  const [
    targetLocationId,
    setTargetLocationId,
  ] = useState('');

  const [quantity, setQuantity] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [
    operationError,
    setOperationError,
  ] = useState('');

  // --------------------------------------------------
  // TRANSACTION HISTORY
  // --------------------------------------------------

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [
    transactionLoading,
    setTransactionLoading,
  ] = useState(false);

  const [
    transactionPage,
    setTransactionPage,
  ] = useState(1);

  const [
    transactionTotalPages,
    setTransactionTotalPages,
  ] = useState(1);

  const [
    hasNextTransactionPage,
    setHasNextTransactionPage,
  ] = useState(false);

  const [
    hasPreviousTransactionPage,
    setHasPreviousTransactionPage,
  ] = useState(false);

  const [
    transactionLocationId,
    setTransactionLocationId,
  ] = useState<string | null>(null);

  const pageSize = 5;

  useAutoDismissMessage(
    error,
    setError,
  );

  // --------------------------------------------------
  // LOAD INVENTORY
  // --------------------------------------------------

  async function loadInventory(): Promise<
    RegisterItem[]
  > {
    try {
      setLoading(true);
      setError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        throw new Error(
          'Please sign in first.',
        );
      }

      const response =
        await apiFetch<RegisterResponse>(
          '/inventory/register',
          token,
        );

      setItems(response.data);

      return response.data;
    } catch (err) {
      const message =
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load inventory.';

      setError(message);

      return [];
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // LOAD ORGANIZATION LOCATIONS
  // --------------------------------------------------

  async function loadLocations() {
    try {
      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        throw new Error(
          'Please sign in first.',
        );
      }

      const response =
        await apiFetch<
          OrganizationLocation[] | {
            data: OrganizationLocation[];
          }
        >('/locations', token);

      const data =
        Array.isArray(response)
          ? response
          : response.data ?? [];

      setOrganizationLocations(data);
    } catch (err) {
      console.error(
        'Unable to load organization locations:',
        err,
      );
    }
  }

  useEffect(() => {
    async function initializeInventory() {
      const loadedItems =
        await loadInventory();

      await loadLocations();

      const itemId =
        new URLSearchParams(
          window.location.search,
        ).get('item');

      if (!itemId) {
        return;
      }

      const requestedItem =
        loadedItems.find(
          (item) =>
            item.id === itemId,
        );

      if (requestedItem) {
        await openItem(
          requestedItem,
        );
      }
    }

    initializeInventory();
  }, []);

  // --------------------------------------------------
  // FILTERING + SORTING
  // --------------------------------------------------

  const filteredItems = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    const filtered = items.filter(
      (item) => {
        const matchesSearch =
          !query ||
          item.name
            .toLowerCase()
            .includes(query) ||
          item.sku
            .toLowerCase()
            .includes(query) ||
          item.category?.name
            ?.toLowerCase()
            .includes(query);

        const itemStatus = getItemInventoryStatus(
          item,
        );

        const matchesStatus =
          statusFilter === 'ALL' ||
          itemStatus === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      },
    );

    return [...filtered].sort(
      (a, b) => {
        switch (sortBy) {
          case 'quantity_desc':
            return (
              b.quantity - a.quantity
            );

          case 'quantity_asc':
            return (
              a.quantity - b.quantity
            );

          case 'locations_desc':
            return (
              b.locations - a.locations
            );

          case 'name':
          default:
            return a.name.localeCompare(
              b.name,
            );
        }
      },
    );
  }, [
    items,
    search,
    statusFilter,
    sortBy,
  ]);

  const locationCount =
    organizationLocations.length;

  const activeLocationCount =
    organizationLocations.filter(
      (location) =>
        location.status === 'active',
    ).length;

  const lowStockCount =
    items.filter(
      (item) =>
        getItemInventoryStatus(item) ===
        'LOW_STOCK',
    ).length;

  const outOfStockCount =
    items.filter(
      (item) =>
        getItemInventoryStatus(item) ===
        'OUT_OF_STOCK',
    ).length;

  const inStockCount =
    items.filter(
      (item) =>
        getItemInventoryStatus(item) ===
        'IN_STOCK',
    ).length;

  // --------------------------------------------------
  // TRANSACTION HISTORY
  // --------------------------------------------------

  async function loadTransactions(
    item: RegisterItem,
    locationId: string | null = null,
    page = 1,
  ) {
    try {
      setTransactionLoading(true);

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        throw new Error(
          'Please sign in first.',
        );
      }

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (locationId) {
        params.set('locationId', locationId);
      }

      const response =
        await apiFetch<TransactionResponse>(
          `/inventory/items/${item.id}/transactions?${params.toString()}`,
          token,
        );

      setTransactionLocationId(
        locationId,
      );

      setTransactions(
        response.data,
      );

      setTransactionPage(
        response.pagination.page,
      );

      setTransactionTotalPages(
        response.pagination.totalPages,
      );

      setHasNextTransactionPage(
        response.pagination.hasNextPage,
      );

      setHasPreviousTransactionPage(
        response.pagination.hasPreviousPage,
      );
    } catch (err) {
      console.error(
        'Unable to load transactions:',
        err,
      );

      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  }

  // --------------------------------------------------
  // OPEN ITEM
  // --------------------------------------------------

  async function openItem(
    item: RegisterItem,
  ) {
    setSelectedItem(item);

    setOperation(null);
    setOperationError('');

    setQuantity('');
    setNotes('');
    setTargetLocationId('');
    setTransactionLocationId(null);

    const firstLocation =
      item.locationBreakdown[0];

    if (firstLocation) {
      setOperationLocationId(
        firstLocation.locationId,
      );
    } else {
      setOperationLocationId('');
    }

    await loadTransactions(
      item,
      null,
      1,
    );
  }

  // --------------------------------------------------
  // CLOSE DRAWER
  // --------------------------------------------------

  function closeDrawer() {
    if (submitting) {
      return;
    }

    setSelectedItem(null);
    setOperation(null);
    setTransactions([]);

    resetOperationForm();
  }

  // --------------------------------------------------
  // RESET OPERATION
  // --------------------------------------------------

  function resetOperationForm() {
    setOperationLocationId('');
    setTargetLocationId('');
    setQuantity('');
    setNotes('');
    setOperationError('');
  }

  // --------------------------------------------------
  // LOCATION SELECTION
  // --------------------------------------------------

  async function handleViewLocationTransactions(
    locationId: string,
  ) {
    if (!selectedItem) {
      return;
    }

    await loadTransactions(
      selectedItem,
      locationId,
      1,
    );
  }

  async function handleViewAllTransactions() {
    if (!selectedItem) {
      return;
    }

    await loadTransactions(
      selectedItem,
      null,
      1,
    );
  }

  // --------------------------------------------------
  // START OPERATION
  // --------------------------------------------------

  function startOperation(
    nextOperation: Operation,
  ) {
    if (
      !nextOperation ||
      !selectedItem
    ) {
      return;
    }

    setOperation(
      nextOperation,
    );

    setOperationError('');

    setQuantity('');
    setNotes('');
    setTargetLocationId('');

    if (
      selectedItem.locationBreakdown
        .length > 0
    ) {
      setOperationLocationId(
        selectedItem
          .locationBreakdown[0]
          .locationId,
      );
    }
  }

  // --------------------------------------------------
  // CANCEL OPERATION
  // --------------------------------------------------

  function cancelOperation() {
    if (submitting) {
      return;
    }

    setOperation(null);
    setOperationError('');

    setQuantity('');
    setNotes('');
    setTargetLocationId('');
  }

  // --------------------------------------------------
  // SUBMIT STOCK OPERATION
  // --------------------------------------------------

  async function handleOperationSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedItem ||
      !operation
    ) {
      return;
    }

    const amount =
      Number(quantity);

    const validAmount =
      Number.isInteger(amount) &&
      (
        operation === 'adjust'
          ? amount !== 0
          : amount > 0
      );

    if (!validAmount) {
      setOperationError(
        operation === 'adjust'
          ? 'Enter a non-zero whole number. Use a negative value to reduce stock.'
          : 'Enter a valid positive whole number.',
      );

      return;
    }

    if (!operationLocationId) {
      setOperationError(
        'Select a location.',
      );

      return;
    }

    if (
      operation === 'transfer' &&
      !targetLocationId
    ) {
      setOperationError(
        'Select both source and destination locations.',
      );

      return;
    }

    if (
      operation === 'transfer' &&
      operationLocationId ===
        targetLocationId
    ) {
      setOperationError(
        'Source and destination must be different.',
      );

      return;
    }

    try {
      setSubmitting(true);
      setOperationError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        throw new Error(
          'Please sign in first.',
        );
      }

      let endpoint = '';

      let body: Record<
        string,
        unknown
      >;

      if (operation === 'receive') {
        endpoint =
          `/inventory/items/${selectedItem.id}/locations/${operationLocationId}/receive`;

        body = {
          quantity: amount,
          idempotencyKey:
            crypto.randomUUID(),
          ...(notes
            ? { notes }
            : {}),
        };
      } else if (
        operation === 'issue'
      ) {
        endpoint =
          `/inventory/items/${selectedItem.id}/locations/${operationLocationId}/issue`;

        body = {
          quantity: amount,
          idempotencyKey:
            crypto.randomUUID(),
          ...(notes
            ? { notes }
            : {}),
        };
      } else if (
        operation === 'adjust'
      ) {
        endpoint =
          `/inventory/items/${selectedItem.id}/locations/${operationLocationId}/adjust`;

        body = {
          quantity: amount,
          idempotencyKey:
            crypto.randomUUID(),
          ...(notes
            ? { notes }
            : {}),
        };
      } else {
        endpoint =
          `/inventory/items/${selectedItem.id}/transfer`;

        body = {
          fromLocationId:
            operationLocationId,
          toLocationId:
            targetLocationId,
          quantity: amount,
          idempotencyKey:
            crypto.randomUUID(),
          ...(notes
            ? { notes }
            : {}),
        };
      }

      await apiFetch(
        endpoint,
        token,
        {
          method: 'POST',
          body: JSON.stringify(
            body,
          ),
        },
      );

      // Reload the register so the drawer
      // and main inventory table reflect
      // the database.
      const refreshedItems =
        await loadInventory();

      const refreshedItem =
        refreshedItems.find(
          (item) =>
            item.id ===
            selectedItem.id,
        );

      if (refreshedItem) {
        setSelectedItem(
          refreshedItem,
        );
      }

      // Refresh the currently visible transaction history scope.
      if (refreshedItem) {
        await loadTransactions(
          refreshedItem,
          transactionLocationId,
          1,
        );
      }

      // Refresh organization locations too.
      // This keeps the destination list current.
      await loadLocations();

      setOperation(null);

      setQuantity('');
      setNotes('');
      setTargetLocationId('');
      setOperationError('');
    } catch (err) {
      setOperationError(
        err instanceof Error
          ? extractApiError(
              err.message,
            )
          : 'Stock operation failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // --------------------------------------------------
  // TRANSACTION PAGINATION
  // --------------------------------------------------

  async function handlePreviousPage() {
    if (
      !selectedItem ||
      !hasPreviousTransactionPage
    ) {
      return;
    }

    await loadTransactions(
      selectedItem,
      transactionLocationId,
      transactionPage - 1,
    );
  }

  async function handleNextPage() {
    if (
      !selectedItem ||
      !hasNextTransactionPage
    ) {
      return;
    }

    await loadTransactions(
      selectedItem,
      transactionLocationId,
      transactionPage + 1,
    );
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
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

            {/* INVENTORY WORKSPACE HEADER */}
            <header className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-col gap-3 bg-[var(--surface)] px-5 py-4 text-[var(--text)] md:flex-row md:items-center md:justify-between md:px-7">
                <div>
                  <div className="font-mono text-[7px] tracking-[0.22em] opacity-75">
                    STOCK CONTROL / REGISTER
                  </div>

                  <div className="mt-1 font-sans text-[26px] font-semibold leading-none tracking-[-0.03em]">
                    INVENTORY
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden border border-[var(--border)] px-3 py-1.5 font-mono text-[7px] tracking-widest md:block">
                    {loading
                      ? 'SYNCING'
                      : 'LIVE DATABASE'}
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[7px] tracking-widest">
                    <Activity
                      size={12}
                      strokeWidth={1.7}
                    />
                    REGISTER ACTIVE
                  </div>
                </div>
              </div>

              <div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_220px] md:px-7">
                <div>
                  <div className="font-mono text-[8px] tracking-widest text-[var(--accent)]">
                    STOCK CONTROL
                  </div>

                  <h1 className="mt-1 font-sans text-[28px] font-semibold leading-tight tracking-[-0.03em]">
                    Stock Records
                  </h1>

                  <p className="mt-2 max-w-[760px] font-mono text-[8px] leading-5 text-[var(--text-muted)]">
                    Search, sort and inspect stock
                    balances across your organization.
                    Select any record to open its
                    location ledger and perform stock
                    operations.
                  </p>
                </div>

                <div className="grid grid-cols-2 border border-[var(--border-strong)] bg-[var(--surface-soft)]">
                  <MetricCell
                    label="RECORDS"
                    value={String(
                      filteredItems.length,
                    )}
                  />

                  <MetricCell
                    label="LOCATIONS"
                    value={String(
                      activeLocationCount,
                    )}
                  />

                  <MetricCell
                    label="LOW STOCK"
                    value={String(
                      lowStockCount,
                    )}
                    danger={
                      lowStockCount > 0
                    }
                  />

                  <MetricCell
                    label="OUT"
                    value={String(
                      outOfStockCount,
                    )}
                    danger={
                      outOfStockCount > 0
                    }
                  />
                </div>
              </div>

              {/* SEARCH + FILTER CONTROL STRIP */}
              <div className="border-t border-[var(--border)] bg-[var(--surface-soft)] px-5 py-4 md:px-7">
                <div className="mb-2 flex items-center gap-2 font-mono text-[7px] tracking-widest text-[var(--text-muted)]">
                  <SlidersHorizontal
                    size={12}
                    strokeWidth={1.7}
                  />
                  REGISTER CONTROLS
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px_auto] lg:items-end">
                  <label className="block">
                    <span className="font-mono text-[7px] tracking-widest text-[var(--text-muted)]">
                      SEARCH
                    </span>

                    <div className="relative mt-1">
                      <Search
                        size={14}
                        strokeWidth={1.7}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />

                      <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                          setSearch(
                            event.target.value,
                          )
                        }
                        placeholder="ITEM, SKU OR CATEGORY"
                        className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-3 font-mono text-[9px] outline-none focus:border-[var(--border)]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="font-mono text-[7px] tracking-widest text-[var(--text-muted)]">
                      SORT BY
                    </span>

                    <div className="relative mt-1">
                      <ArrowUpDown
                        size={13}
                        strokeWidth={1.7}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />

                      <select
                        value={sortBy}
                        onChange={(event) =>
                          setSortBy(
                            event.target
                              .value as
                              | 'name'
                              | 'quantity_desc'
                              | 'quantity_asc'
                              | 'locations_desc',
                          )
                        }
                        className="w-full appearance-none rounded-[10px] border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-9 font-mono text-[8px] text-[var(--text)] outline-none focus:border-[var(--border)]"
                      >
                        <option value="name">
                          ITEM NAME A-Z
                        </option>

                        <option value="quantity_desc">
                          QUANTITY HIGH-LOW
                        </option>

                        <option value="quantity_asc">
                          QUANTITY LOW-HIGH
                        </option>

                        <option value="locations_desc">
                          MOST LOCATIONS
                        </option>
                      </select>

                      <ChevronDown
                        size={13}
                        strokeWidth={1.7}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                    </div>
                  </label>

                  <div>
                    <div className="font-mono text-[7px] tracking-widest text-[var(--text-muted)]">
                      STATUS
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <InventoryFilterButton
                        label={`ALL ${items.length}`}
                        active={
                          statusFilter ===
                          'ALL'
                        }
                        onClick={() =>
                          setStatusFilter(
                            'ALL',
                          )
                        }
                      />

                      <InventoryFilterButton
                        label={`IN STOCK ${
                          inStockCount
                        }`}
                        active={
                          statusFilter ===
                          'IN_STOCK'
                        }
                        onClick={() =>
                          setStatusFilter(
                            'IN_STOCK',
                          )
                        }
                      />

                      <InventoryFilterButton
                        label={`LOW ${
                          lowStockCount
                        }`}
                        active={
                          statusFilter ===
                          'LOW_STOCK'
                        }
                        onClick={() =>
                          setStatusFilter(
                            'LOW_STOCK',
                          )
                        }
                      />

                      <InventoryFilterButton
                        label={`OUT ${
                          outOfStockCount
                        }`}
                        active={
                          statusFilter ===
                          'OUT_OF_STOCK'
                        }
                        onClick={() =>
                          setStatusFilter(
                            'OUT_OF_STOCK',
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* ERROR */}

            {error && (
              <div className="mt-4 flex flex-col gap-3 rounded-[12px] border border-[var(--accent)] bg-[var(--surface)] px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-mono text-[8px] tracking-widest text-[var(--accent)]">
                    INVENTORY ERROR
                  </div>

                  <div className="mt-1 font-mono text-[9px] text-[var(--accent)]">
                    {error}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadInventory}
                  className="flex items-center justify-center gap-2 rounded-[9px] border border-[var(--accent)] px-3 py-2 font-mono text-[7px] tracking-widest text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--text)]"
                >
                  <RefreshCw
                    size={11}
                  />
                  RETRY REGISTER
                </button>
              </div>
            )}

            {/* REGISTER COMMAND BAR */}

            <div className="mt-5 flex flex-col gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] md:flex-row md:items-center md:justify-between md:px-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[7px] tracking-widest">
                <span>
                  REGISTER
                </span>

                <span className="opacity-40">
                  /
                </span>

                <span>
                  {filteredItems.length}{' '}
                  VISIBLE RECORDS
                </span>

                <span className="opacity-40">
                  /
                </span>

                <span>
                  {locationCount}{' '}
                  TOTAL LOCATIONS
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[7px] tracking-widest opacity-80">
                <PackageOpen
                  size={12}
                  strokeWidth={1.6}
                />
                SELECT A RECORD TO INSPECT
              </div>
            </div>

            {/* INVENTORY REGISTER */}

            <section className="mt-4 overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">
                    STOCK REGISTER
                  </div>

                  <h2 className="mt-1 font-sans text-[21px] font-semibold tracking-[-0.02em]">
                    Current Stock
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-mono text-[7px] text-[var(--text-muted)]">
                    <MapPinned
                      size={12}
                      strokeWidth={1.6}
                    />
                    {activeLocationCount}{' '}
                    ACTIVE LOCATIONS
                  </div>

                  <div className="h-4 w-px bg-[var(--border-strong)]" />

                  <div className="font-mono text-[7px] tracking-widest text-[var(--text-muted)]">
                    {loading
                      ? 'UPDATING'
                      : 'READY'}
                  </div>
                </div>
              </div>

              <div className="px-1 pb-1 md:px-2 md:pb-2">
                <InventoryRegister
                  items={filteredItems}
                  loading={loading}
                  onOpenItem={openItem}
                />
              </div>
            </section>

            {!loading &&
              items.length > 0 &&
              filteredItems.length === 0 && (
                <div className="mt-3 border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 py-3 font-mono text-[8px] text-[var(--text-muted)]">
                  No inventory records match the
                  current search and status filters.
                  Adjust the register controls above
                  to broaden the view.
                </div>
              )}

            {/* FOOTER */}

            <footer className="mt-5 border-t border-dashed border-[var(--border-strong)] pt-2 font-mono text-[7px] text-[var(--text-muted)]">
              <div className="flex flex-col justify-between gap-1 md:flex-row">
                <span>
                  STOCK CONTROL · INVENTORY LEDGER
                </span>

                <span>
                  {loading
                    ? 'SYNCING DATABASE'
                    : 'LIVE DATABASE'}
                </span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* ITEM DRAWER */}

      <ItemDrawer
        selectedItem={selectedItem}
        organizationLocations={
          organizationLocations
        }
        operation={operation}
        operationLocationId={
          operationLocationId
        }
        targetLocationId={
          targetLocationId
        }
        quantity={quantity}
        notes={notes}
        submitting={submitting}
        operationError={
          operationError
        }
        transactions={transactions}
        transactionLoading={
          transactionLoading
        }
        transactionLocationId={
          transactionLocationId
        }
        transactionPage={
          transactionPage
        }
        transactionTotalPages={
          transactionTotalPages
        }
        hasNextTransactionPage={
          hasNextTransactionPage
        }
        hasPreviousTransactionPage={
          hasPreviousTransactionPage
        }
        onClose={closeDrawer}
        onViewLocationTransactions={
          handleViewLocationTransactions
        }
        onViewAllTransactions={
          handleViewAllTransactions
        }
        onStartOperation={
          startOperation
        }
        onOperationSubmit={
          handleOperationSubmit
        }
        onOperationCancel={
          cancelOperation
        }
        onOperationLocationChange={
          setOperationLocationId
        }
        onTargetLocationChange={
          setTargetLocationId
        }
        onQuantityChange={
          setQuantity
        }
        onNotesChange={
          setNotes
        }
        onPreviousPage={
          handlePreviousPage
        }
        onNextPage={
          handleNextPage
        }
      />
    </main>
  );
}

function getItemInventoryStatus(
  item: RegisterItem,
): Exclude<InventoryStatus, 'ALL'> {
  if (item.quantity === 0) {
    return 'OUT_OF_STOCK';
  }

  const hasLowLocation =
    item.locationBreakdown.some(
      (location) =>
        location.quantity <=
        item.reorderLevel,
    );

  return hasLowLocation
    ? 'LOW_STOCK'
    : 'IN_STOCK';
}

function MetricCell({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="border-b border-r border-[var(--border-strong)] px-3 py-3">
      <div className="font-mono text-[7px] tracking-widest text-[var(--text-muted)]">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-[16px] ${
          danger
            ? 'text-[var(--accent)]'
            : 'text-[var(--text)]'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function InventoryFilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-2 font-mono text-[7px] tracking-widest transition-colors ${
        active
          ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'
          : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--border)]'
      }`}
    >
      {label}
    </button>
  );
}

// --------------------------------------------------
// API ERROR HELPER
// --------------------------------------------------

function extractApiError(message: string) {
  try {
    const parsed =
      JSON.parse(message);

    if (
      Array.isArray(
        parsed.message,
      )
    ) {
      return parsed.message.join(
        ', ',
      );
    }

    if (
      typeof parsed.message ===
      'string'
    ) {
      return parsed.message;
    }
  } catch {
    // Keep original message.
  }

  return message;
}
