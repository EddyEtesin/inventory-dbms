'use client';

import {
  AlertTriangle,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import InventoryHeader from '../components/inventory/InventoryHeader';
import InventoryRegister from '../components/inventory/InventoryRegister';
import InventorySidebar from '../components/inventory/InventorySidebar';
import InventoryStats from '../components/inventory/InventoryStats';
import ItemDrawer from '../components/inventory/ItemDrawer';
import QuickActions from '../components/inventory/QuickActions';
import RecentActivity from '../components/inventory/RecentActivity';

import type {
  Operation,
  RegisterItem,
  RegisterResponse,
  Transaction,
  TransactionResponse,
} from '../types/inventory';

import { apiFetch } from '../lib/api';

export default function InventoryPage() {
  const [collapsed, setCollapsed] =
    useState(false);

  const [liveMode, setLiveMode] =
    useState(false);

  const [items, setItems] =
    useState<RegisterItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<
      | 'ALL'
      | 'IN_STOCK'
      | 'LOW_STOCK'
      | 'OUT_OF_STOCK'
    >('ALL');

  const [selectedItem, setSelectedItem] =
    useState<RegisterItem | null>(null);

  const [operation, setOperation] =
    useState<Operation>(null);

  const [operationLocationId, setOperationLocationId] =
    useState('');

  const [targetLocationId, setTargetLocationId] =
    useState('');

  const [quantity, setQuantity] =
    useState('');

  const [reference, setReference] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [operationError, setOperationError] =
    useState('');

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [transactionLoading, setTransactionLoading] =
    useState(false);

  const [transactionPage, setTransactionPage] =
    useState(1);

  const pageSize = 10;

  async function loadInventory() {
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load inventory.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();

    const token =
      window.localStorage.getItem(
        'accessToken',
      );

    setLiveMode(Boolean(token));
  }, []);

  const filteredItems = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return items.filter((item) => {
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
    });
  }, [
    items,
    search,
    statusFilter,
  ]);

  const loadTransactions = async (
    item: RegisterItem,
    locationId: string,
    page = 1,
  ) => {
    try {
      setTransactionLoading(true);

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        return;
      }

      const response =
        await apiFetch<TransactionResponse>(
          `/inventory/items/${item.id}/locations/${locationId}/transactions?page=${page}&pageSize=${pageSize}`,
          token,
        );

      setTransactions(response.data);

      setTransactionPage(
        response.pagination.page,
      );
    } catch (err) {
      console.error(
        'Unable to load transactions:',
        err,
      );
    } finally {
      setTransactionLoading(false);
    }
  };

  const openItem = async (
    item: RegisterItem,
  ) => {
    setSelectedItem(item);
    setOperation(null);
    setOperationError('');

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
  };

  const closeDrawer = () => {
    if (submitting) {
      return;
    }

    setSelectedItem(null);
    setOperation(null);
    setTransactions([]);
    resetOperationForm();
  };

  const resetOperationForm = () => {
    setOperationLocationId('');
    setTargetLocationId('');
    setQuantity('');
    setReference('');
    setNotes('');
    setOperationError('');
  };

  const startOperation = (
    nextOperation: Operation,
  ) => {
    if (!selectedItem) {
      return;
    }

    setOperation(nextOperation);
    setOperationError('');

    if (
      nextOperation !== 'transfer' &&
      selectedItem.locationBreakdown.length >
        0
    ) {
      setOperationLocationId(
        selectedItem
          .locationBreakdown[0]
          .locationId,
      );
    }

    if (nextOperation === 'transfer') {
      setTargetLocationId('');
    }
  };

  const handleOperationSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedItem || !operation) {
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

    if (
      !operationLocationId &&
      operation !== 'transfer'
    ) {
      setOperationError(
        'Select a location.',
      );

      return;
    }

    if (
      operation === 'transfer' &&
      (
        !operationLocationId ||
        !targetLocationId
      )
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

      if (
        operation === 'receive'
      ) {
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
          body: JSON.stringify(body),
        },
      );

      await loadInventory();

      const updatedItem =
        items.find(
          (item) =>
            item.id ===
            selectedItem.id,
        );

      if (updatedItem) {
        setSelectedItem(
          updatedItem,
        );
      }

      if (
        operation !== 'transfer' &&
        operationLocationId
      ) {
        await loadTransactions(
          selectedItem,
          operationLocationId,
          1,
        );
      }

      resetOperationForm();
      setOperation(null);
    } catch (err) {
      setOperationError(
        err instanceof Error
          ? err.message
          : 'Stock operation failed.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrawerLocationSelect =
    async (
      locationId: string,
    ) => {
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
    };

  const handlePreviousPage =
    () => {
      if (
        !selectedItem ||
        !operationLocationId ||
        transactionPage <= 1
      ) {
        return;
      }

      loadTransactions(
        selectedItem,
        operationLocationId,
        transactionPage - 1,
      );
    };

  const handleNextPage =
    () => {
      if (
        !selectedItem ||
        !operationLocationId
      ) {
        return;
      }

      loadTransactions(
        selectedItem,
        operationLocationId,
        transactionPage + 1,
      );
    };

  return (
    <main className="min-h-screen bg-[#ddd0b8] text-[#2b2620]">
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
          <div className="mx-auto max-w-[1400px]">

            {/* HEADER */}
            <InventoryHeader
              search={search}
              statusFilter={
                statusFilter
              }
              onSearchChange={
                setSearch
              }
              onStatusChange={
                setStatusFilter
              }
            />

            {/* ERROR */}
            {error && (
              <div className="mt-3 flex items-center gap-3 border border-[#a63a2e] bg-[#f5f0e3] px-4 py-3">
                <AlertTriangle
                  size={16}
                  className="text-[#a63a2e]"
                />

                <span className="font-mono text-[9px] text-[#a63a2e]">
                  {error}
                </span>
              </div>
            )}

            {/* DASHBOARD STATS */}
            <InventoryStats />

            {/* REGISTER + QUICK ACTIONS */}
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">

              <InventoryRegister
                items={
                  filteredItems
                }
                loading={loading}
                onOpenItem={
                  openItem
                }
              />

              <QuickActions
                items={items}
                onCompleted={
                  loadInventory
                }
              />
            </div>

            {/* RECENT ACTIVITY */}
            <RecentActivity />

            {/* FOOTER */}
            <footer className="mt-4 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">
              <div className="flex justify-between">
                <span>
                  INVENTORY LEDGER ·
                  STOCK RECORDS
                </span>

                <span>
                  {liveMode
                    ? 'LIVE DATABASE'
                    : 'INVENTORY'}
                </span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* ITEM DRAWER */}
      <ItemDrawer
        selectedItem={
          selectedItem
        }
        operation={
          operation
        }
        operationLocationId={
          operationLocationId
        }
        targetLocationId={
          targetLocationId
        }
        quantity={quantity}
        reference={reference}
        notes={notes}
        submitting={
          submitting
        }
        operationError={
          operationError
        }
        transactions={
          transactions
        }
        transactionLoading={
          transactionLoading
        }
        transactionPage={
          transactionPage
        }
        onClose={
          closeDrawer
        }
        onLocationSelect={
          handleDrawerLocationSelect
        }
        onStartOperation={
          startOperation
        }
        onOperationSubmit={
          handleOperationSubmit
        }
        onOperationCancel={() =>
          setOperation(null)
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