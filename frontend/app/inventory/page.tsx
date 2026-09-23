'use client';

import {
  Activity,
  ArrowUpDown,
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
  const [collapsed, setCollapsed] = useState(false);

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

  const [reference, setReference] =
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

        const matchesStatus =
          statusFilter === 'ALL' ||
          item.status === statusFilter;

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
        item.status === 'LOW_STOCK',
    ).length;

  const outOfStockCount =
    items.filter(
      (item) =>
        item.status === 'OUT_OF_STOCK',
    ).length;

  // --------------------------------------------------
  // TRANSACTION HISTORY
  // --------------------------------------------------

  async function loadTransactions(
    item: RegisterItem,
    locationId: string,
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

      const response =
        await apiFetch<TransactionResponse>(
          `/inventory/items/${item.id}/locations/${locationId}/transactions?page=${page}&pageSize=${pageSize}`,
          token,
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
    setReference('');
    setNotes('');
    setTargetLocationId('');

    const firstLocation =
      item.locationBreakdown[0];

    if (firstLocation) {
      setOperationLocationId(
        firstLocation.locationId,
      );

      await loadTransactions(
        item,
        firstLocation.locationId,
        1,
      );
    } else {
      setOperationLocationId('');
      setTransactions([]);
    }
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
    setReference('');
    setNotes('');
    setOperationError('');
  }

  // --------------------------------------------------
  // LOCATION SELECTION
  // --------------------------------------------------

  async function handleLocationSelect(
    locationId: string,
  ) {
    if (!selectedItem) {
      return;
    }

    setOperationLocationId(
      locationId,
    );

    await loadTransactions(
      selectedItem,
      locationId,
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
    setReference('');
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
    setReference('');
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
          ...(reference
            ? { reference }
            : {}),
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
          ...(reference
            ? { reference }
            : {}),
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
          ...(reference
            ? { reference }
            : {}),
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
          ...(reference
            ? { reference }
            : {}),
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

      // Refresh the selected location ledger.
      if (
        refreshedItem &&
        operationLocationId
      ) {
        await loadTransactions(
          refreshedItem,
          operationLocationId,
          1,
        );
      }

      // Refresh organization locations too.
      // This keeps the destination list current.
      await loadLocations();

      setOperation(null);

      setQuantity('');
      setReference('');
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
      !operationLocationId ||
      !hasPreviousTransactionPage
    ) {
      return;
    }

    await loadTransactions(
      selectedItem,
      operationLocationId,
      transactionPage - 1,
    );
  }

  async function handleNextPage() {
    if (
      !selectedItem ||
      !operationLocationId ||
      !hasNextTransactionPage
    ) {
      return;
    }

    await loadTransactions(
      selectedItem,
      operationLocationId,
      transactionPage + 1,
    );
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-[#d5c8ae] text-[#2b2620]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed(
            (value) => !value,
          )
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

            {/* INVENTORY WORKSPACE HEADER */}
            <header className="overflow-hidden border border-[#b7a87e] bg-[#f5f0e3]">
              <div className="flex flex-col gap-3 bg-[#2e4057] px-5 py-4 text-[#f5f0e3] md:flex-row md:items-center md:justify-between md:px-7">
                <div>
                  <div className="font-mono text-[7px] tracking-[0.22em] opacity-75">
                    STOCK CONTROL / REGISTER
                  </div>

                  <div className="mt-1 font-mono text-[24px] leading-none tracking-[0.04em]">
                    INVENTORY
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden border border-[#d5c8ae]/50 px-3 py-1.5 font-mono text-[7px] tracking-widest md:block">
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
                  <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                    STOCK CONTROL
                  </div>

                  <h1 className="mt-1 font-mono text-[25px] leading-tight">
                    Stock Records
                  </h1>

                  <p className="mt-2 max-w-[760px] font-mono text-[8px] leading-5 text-[#5b5346]">
                    Search, sort and inspect stock
                    balances across your organization.
                    Select any record to open its
                    location ledger and perform stock
                    operations.
                  </p>
                </div>

                <div className="grid grid-cols-2 border border-[#b7a87e] bg-[#eae2ce]">
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
              <div className="border-t border-[#d0c4aa] bg-[#ddd0b8] px-5 py-4 md:px-7">
                <div className="mb-2 flex items-center gap-2 font-mono text-[7px] tracking-widest text-[#5b5346]">
                  <SlidersHorizontal
                    size={12}
                    strokeWidth={1.7}
                  />
                  REGISTER CONTROLS
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px_auto] lg:items-end">
                  <label className="block">
                    <span className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                      SEARCH
                    </span>

                    <div className="relative mt-1">
                      <Search
                        size={14}
                        strokeWidth={1.7}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b5346]"
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
                        className="w-full border border-[#b7a87e] bg-[#f5f0e3] py-2.5 pl-9 pr-3 font-mono text-[9px] outline-none focus:border-[#2e4057]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                      SORT BY
                    </span>

                    <div className="relative mt-1">
                      <ArrowUpDown
                        size={13}
                        strokeWidth={1.7}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5b5346]"
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
                        className="w-full appearance-none border border-[#b7a87e] bg-[#f5f0e3] py-2.5 pl-9 pr-3 font-mono text-[8px] outline-none focus:border-[#2e4057]"
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
                    </div>
                  </label>

                  <div>
                    <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
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
                          items.filter(
                            (item) =>
                              item.status ===
                              'IN_STOCK',
                          ).length
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
              <div className="mt-4 flex flex-col gap-3 border border-[#a63a2e] bg-[#f5f0e3] px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                    INVENTORY ERROR
                  </div>

                  <div className="mt-1 font-mono text-[9px] text-[#a63a2e]">
                    {error}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadInventory}
                  className="flex items-center justify-center gap-2 border border-[#a63a2e] px-3 py-2 font-mono text-[7px] tracking-widest text-[#a63a2e] hover:bg-[#a63a2e] hover:text-[#f5f0e3]"
                >
                  <RefreshCw
                    size={11}
                  />
                  RETRY REGISTER
                </button>
              </div>
            )}

            {/* REGISTER COMMAND BAR */}

            <div className="mt-5 flex flex-col gap-3 border-y border-[#2e4057] bg-[#2e4057] px-4 py-3 text-[#f5f0e3] md:flex-row md:items-center md:justify-between md:px-5">
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

            <section className="mt-4 overflow-hidden border border-[#b7a87e] bg-[#f5f0e3]">
              <div className="flex flex-col gap-3 border-b border-[#d0c4aa] px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-mono text-[7px] tracking-[0.18em] text-[#a63a2e]">
                    STOCK REGISTER
                  </div>

                  <h2 className="mt-1 font-mono text-[19px]">
                    Current Stock
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-mono text-[7px] text-[#5b5346]">
                    <MapPinned
                      size={12}
                      strokeWidth={1.6}
                    />
                    {activeLocationCount}{' '}
                    ACTIVE LOCATIONS
                  </div>

                  <div className="h-4 w-px bg-[#b7a87e]" />

                  <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
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
                <div className="mt-3 border border-dashed border-[#b7a87e] bg-[#eae2ce] px-4 py-3 font-mono text-[8px] text-[#5b5346]">
                  No inventory records match the
                  current search and status filters.
                  Adjust the register controls above
                  to broaden the view.
                </div>
              )}

            {/* FOOTER */}

            <footer className="mt-5 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">
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
        reference={reference}
        notes={notes}
        submitting={submitting}
        operationError={
          operationError
        }
        transactions={transactions}
        transactionLoading={
          transactionLoading
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
        onLocationSelect={
          handleLocationSelect
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
          async (locationId) => {
            setOperationLocationId(
              locationId,
            );

            if (selectedItem) {
              await loadTransactions(
                selectedItem,
                locationId,
                1,
              );
            }
          }
        }
        onTargetLocationChange={
          setTargetLocationId
        }
        onQuantityChange={
          setQuantity
        }
        onReferenceChange={
          setReference
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
    <div className="border-b border-r border-[#b7a87e] px-3 py-3">
      <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-[16px] ${
          danger
            ? 'text-[#a63a2e]'
            : 'text-[#2e4057]'
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
          ? 'border-[#2e4057] bg-[#2e4057] text-[#f5f0e3]'
          : 'border-[#b7a87e] bg-[#f5f0e3] text-[#2b2620] hover:border-[#2e4057]'
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