'use client';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import InventoryHeader from '../../components/inventory/InventoryHeader';
import InventoryRegister from '../../components/inventory/InventoryRegister';
import InventorySidebar from '../../components/inventory/InventorySidebar';
import QuickActions from '../../components/inventory/QuickActions';
import ItemDrawer from '../../components/inventory/ItemDrawer';

import { apiFetch } from '../../lib/api';

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

  const [items, setItems] = useState<RegisterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<InventoryStatus>('ALL');

  // --------------------------------------------------
  // ORGANIZATION LOCATIONS
  // --------------------------------------------------

  const [organizationLocations, setOrganizationLocations] =
    useState<OrganizationLocation[]>([]);

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

  const [operationLocationId, setOperationLocationId] =
    useState('');

  const [targetLocationId, setTargetLocationId] =
    useState('');

  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [operationError, setOperationError] =
    useState('');

  // --------------------------------------------------
  // TRANSACTION HISTORY
  // --------------------------------------------------

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [transactionLoading, setTransactionLoading] =
    useState(false);

  const [transactionPage, setTransactionPage] =
  useState(1);

  const [transactionTotalPages, setTransactionTotalPages] =
  useState(1);

  const [hasNextTransactionPage, setHasNextTransactionPage] =
  useState(false);
  
  const [hasPreviousTransactionPage, setHasPreviousTransactionPage] =
  useState(false);

  const pageSize = 10;;

  // --------------------------------------------------
  // LOAD INVENTORY
  // --------------------------------------------------

  async function loadInventory(): Promise<RegisterItem[]> {
    try {
      setLoading(true);
      setError('');

      const token =
        window.localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('Please sign in first.');
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
        window.localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('Please sign in first.');
      }

      const response =
        await apiFetch<
          OrganizationLocation[] | {
            data: OrganizationLocation[];
          }
        >('/locations', token);

      const data = Array.isArray(response)
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
  // FILTERING
  // --------------------------------------------------

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

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
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === 'ALL' ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

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
        window.localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('Please sign in first.');
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

  async function openItem(item: RegisterItem) {
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

    setOperationLocationId(locationId);

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
    if (!nextOperation || !selectedItem) {
      return;
    }

    setOperation(nextOperation);
    setOperationError('');

    setQuantity('');
    setReference('');
    setNotes('');
    setTargetLocationId('');

    if (selectedItem.locationBreakdown.length > 0) {
      setOperationLocationId(
        selectedItem.locationBreakdown[0]
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

    if (!selectedItem || !operation) {
      return;
    }

    const amount = Number(quantity);

    const validAmount =
      Number.isInteger(amount) &&
      (operation === 'adjust'
        ? amount !== 0
        : amount > 0);

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
        window.localStorage.getItem('accessToken');

      if (!token) {
        throw new Error(
          'Please sign in first.',
        );
      }

      let endpoint = '';
      let body: Record<string, unknown>;

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
      } else if (operation === 'issue') {
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
      } else if (operation === 'adjust') {
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

      // Reload the register so the drawer
      // and main inventory table reflect
      // the database.
      const refreshedItems =
        await loadInventory();

      const refreshedItem =
        refreshedItems.find(
          (item) =>
            item.id === selectedItem.id,
        );

      if (refreshedItem) {
        setSelectedItem(refreshedItem);
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
          ? extractApiError(err.message)
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
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onStatusChange={setStatusFilter}
            />

            {/* ERROR */}
            {error && (
              <div className="mt-4 border border-[#a63a2e] bg-[#f5f0e3] px-4 py-3">
                <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                  INVENTORY ERROR
                </div>

                <div className="mt-1 font-mono text-[9px] text-[#a63a2e]">
                  {error}
                </div>

                <button
                  type="button"
                  onClick={loadInventory}
                  className="mt-3 border border-[#a63a2e] px-3 py-1.5 font-mono text-[8px] tracking-widest text-[#a63a2e] hover:bg-[#a63a2e] hover:text-[#f5f0e3]"
                >
                  RETRY
                </button>
              </div>
            )}

            {/* MAIN INVENTORY AREA */}
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">

              {/* REGISTER */}
              <InventoryRegister
                items={filteredItems}
                loading={loading}
                onOpenItem={openItem}
              />

              {/* QUICK ACTIONS */}
              <div className="xl:sticky xl:top-5 xl:self-start">
                <QuickActions
                  items={items}
                  locations={organizationLocations}
                  onCompleted={async () => {
                    await loadInventory();
                  }}
                />
              </div>
            </div>

            {/* FOOTER */}
            <footer className="mt-5 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">
              <div className="flex flex-col justify-between gap-1 md:flex-row">
                <span>
                  INVENTORY LEDGER · STOCK RECORDS
                </span>

                <span>
                  {loading
                    ? 'LOADING DATABASE'
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

// --------------------------------------------------
// API ERROR HELPER
// --------------------------------------------------

function extractApiError(message: string) {
  try {
    const parsed = JSON.parse(message);

    if (
      Array.isArray(parsed.message)
    ) {
      return parsed.message.join(', ');
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