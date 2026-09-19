'use client';

import {
  Building2,
  MapPin,
  Package,
  Plus,
  Search,
  X,
} from 'lucide-react';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import InventorySidebar from '../../components/inventory/InventorySidebar';
import ItemDrawer from '../../components/inventory/ItemDrawer';
import { apiFetch } from '../../lib/api';

import type {
  Operation,
  RegisterItem,
  Transaction,
  TransactionResponse,
} from '../../types/inventory';

type Organization = {
  id: string;
  name: string;
  industryType: string;
  status: string;
};

type CurrentUserResponse = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  organization: Organization;
  role: {
    id: string;
    name: string;
  };
};

type Category = {
  id: string;
  name: string;
  status?: string;
};

type Supplier = {
  id: string;
  name: string;
  status?: string;
};

type Location = {
  id: string;
  name: string;
  locationType: string;
  parentId: string | null;
  status: string;
};

type Item = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  supplierId: string | null;
  unitOfMeasure: string;
  unitPrice: number | string;
  reorderLevel: number;
  status: 'active' | 'discontinued' | 'archived';
  category?: {
    id: string;
    name: string;
  } | null;
  supplier?: {
    id: string;
    name: string;
  } | null;
};

type ItemLocationRecord = {
  id: string;
  itemId: string;
  locationId: string;
  quantity: number;
  location?: {
    id: string;
    name: string;
    locationType?: string;
    status?: string;
  } | null;
};

type CollectionResponse<T> =
  | T[]
  | {
      data?: T[];
    };

function extractApiError(message: string): string {
  try {
    const parsed = JSON.parse(message);

    if (Array.isArray(parsed?.message)) {
      return parsed.message.join(', ');
    }

    if (typeof parsed?.message === 'string') {
      return parsed.message;
    }

    if (typeof parsed?.error === 'string') {
      return parsed.error;
    }
  } catch {
    // Keep the original message.
  }

  return message || 'Something went wrong.';
}

function asCollection<T>(
  response: CollectionResponse<T>,
): T[] {
  return Array.isArray(response)
    ? response
    : response.data ?? [];
}

function formatCurrency(
  value: number | string,
): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '₦0';
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatStatus(
  status: string,
): string {
  return status.toUpperCase();
}

export default function ItemsPage() {
  const router = useRouter();

  const [collapsed, setCollapsed] =
    useState(false);

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [items, setItems] =
    useState<Item[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [locations, setLocations] =
    useState<Location[]>([]);

  const [itemLocationRecords, setItemLocationRecords] =
    useState<Record<string, ItemLocationRecord[]>>({});

  // --------------------------------------------------
  // ITEM DRAWER
  // --------------------------------------------------

  const [selectedItem, setSelectedItem] =
    useState<RegisterItem | null>(null);

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

  const pageSize = 10;

  const [existingLocationIds, setExistingLocationIds] =
    useState<string[]>([]);

  const [selectedLocationIds, setSelectedLocationIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [formError, setFormError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [showForm, setShowForm] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState<Item | null>(null);

  const [sku, setSku] =
    useState('');

  const [name, setName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [categoryId, setCategoryId] =
    useState('');

  const [supplierId, setSupplierId] =
    useState('');

  const [unitOfMeasure, setUnitOfMeasure] =
    useState('');

  const [unitPrice, setUnitPrice] =
    useState('');

  const [reorderLevel, setReorderLevel] =
    useState('');

  const [status, setStatus] =
    useState<
      'active' | 'discontinued'
    >('active');

  async function fetchItemLocations(
    itemId: string,
    token: string,
  ): Promise<ItemLocationRecord[]> {
    try {
      const response =
        await apiFetch<ItemLocationRecord[]>(
          `/inventory/items/${itemId}`,
          token,
        );

      return Array.isArray(response)
        ? response
        : [];
    } catch {
      return [];
    }
  }

  async function loadItemLocations(
    itemsData: Item[],
    token: string,
  ) {
    const locationMap: Record<
      string,
      ItemLocationRecord[]
    > = {};

    await Promise.all(
      itemsData.map(async (item) => {
        locationMap[item.id] =
          await fetchItemLocations(
            item.id,
            token,
          );
      }),
    );

    setItemLocationRecords(
      locationMap,
    );

    return locationMap;
  }

  function buildRegisterItem(
    item: Item,
    records: ItemLocationRecord[],
  ): RegisterItem {
    const locationBreakdown =
      records
        .filter(
          (record) =>
            Boolean(
              record.location?.name,
            ),
        )
        .map((record) => ({
          id: record.id,
          locationId: record.locationId,
          locationName:
            record.location?.name ??
            'Unknown location',
          quantity: record.quantity,
          reorderLevel:
            item.reorderLevel,
        }));

    const totalQuantity =
      locationBreakdown.reduce(
        (sum, location) =>
          sum + location.quantity,
        0,
      );

    const status: RegisterItem['status'] =
      totalQuantity <= 0
        ? 'OUT_OF_STOCK'
        : totalQuantity <=
            item.reorderLevel
          ? 'LOW_STOCK'
          : 'IN_STOCK';

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      category:
        item.category ?? null,
      unitOfMeasure:
        item.unitOfMeasure,
      unitPrice: Number(
        item.unitPrice,
      ),
      quantity: totalQuantity,
      locations:
        locationBreakdown.length,
      reorderLevel:
        item.reorderLevel,
      status,
      locationBreakdown,
    };
  }

  async function loadPage() {
    try {
      setLoading(true);
      setError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      const [
        me,
        itemsResponse,
        categoriesResponse,
        suppliersResponse,
        locationsResponse,
      ] = await Promise.all([
        apiFetch<CurrentUserResponse>(
          '/auth/me',
          token,
        ),
        apiFetch<
          CollectionResponse<Item>
        >('/items', token),
        apiFetch<
          CollectionResponse<Category>
        >('/categories', token),
        apiFetch<
          CollectionResponse<Supplier>
        >('/suppliers', token),
        apiFetch<
          CollectionResponse<Location>
        >('/locations', token),
      ]);

      const itemsData =
        asCollection(itemsResponse);

      setOrganization(
        me.organization,
      );

      setItems(itemsData);
      setCategories(
        asCollection(categoriesResponse),
      );
      setSuppliers(
        asCollection(suppliersResponse),
      );
      setLocations(
        asCollection(locationsResponse),
      );

      await loadItemLocations(
        itemsData,
        token,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(
              err.message,
            )
          : 'Unable to load items.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, [router]);

  const visibleItems = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.name
          .toLowerCase()
          .includes(query) ||
        item.sku
          .toLowerCase()
          .includes(query) ||
        item.category?.name
          .toLowerCase()
          .includes(query) ||
        item.supplier?.name
          .toLowerCase()
          .includes(query)
      );
    });
  }, [items, search]);

  const activeCount =
    items.filter(
      (item) =>
        item.status === 'active',
    ).length;

  const archivedCount =
    items.filter(
      (item) =>
        item.status === 'archived',
    ).length;

  const industryLabel =
    organization?.industryType
      ? organization.industryType
          .replace(/_/g, ' ')
          .toUpperCase()
      : 'ORGANIZATION';

  function resetForm() {
    setSku('');
    setName('');
    setDescription('');
    setCategoryId('');
    setSupplierId('');
    setUnitOfMeasure('');
    setUnitPrice('');
    setReorderLevel('');
    setStatus('active');
    setSelectedLocationIds([]);
    setExistingLocationIds([]);
    setFormError('');
    setEditingItem(null);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  async function openEditForm(
    item: Item,
  ) {
    try {
      setError('');
      setFormError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      const response =
        await apiFetch<
          ItemLocationRecord[]
        >(
          `/inventory/items/${item.id}`,
          token,
        );

      const records =
        Array.isArray(response)
          ? response
          : [];

      const ids = [
        ...new Set(
          records
            .map(
              (record) =>
                record.locationId ??
                record.location?.id ??
                '',
            )
            .filter(Boolean),
        ),
      ];

      setEditingItem(item);
      setSku(item.sku);
      setName(item.name);
      setDescription(
        item.description ?? '',
      );
      setCategoryId(
        item.categoryId ?? '',
      );
      setSupplierId(
        item.supplierId ?? '',
      );
      setUnitOfMeasure(
        item.unitOfMeasure,
      );
      setUnitPrice(
        String(item.unitPrice),
      );
      setReorderLevel(
        String(item.reorderLevel),
      );
      setStatus(
        item.status ===
          'discontinued'
          ? 'discontinued'
          : 'active',
      );
      setExistingLocationIds(
        ids,
      );
      setSelectedLocationIds(
        ids,
      );
      setShowForm(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(
              err.message,
            )
          : 'Unable to load item details.',
      );
    }
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    resetForm();
  }

  function toggleLocation(
    locationId: string,
  ) {
    setSelectedLocationIds(
      (current) =>
        current.includes(
          locationId,
        )
          ? current.filter(
              (id) =>
                id !== locationId,
            )
          : [
              ...current,
              locationId,
            ],
    );
  }

  async function syncLocations(
    itemId: string,
    token: string,
  ) {
    const existing =
      new Set(
        existingLocationIds,
      );

    const selected =
      new Set(
        selectedLocationIds,
      );

    const removed =
      [
        ...existing,
      ].filter(
        (id) =>
          !selected.has(id),
      );

    const added =
      selectedLocationIds.filter(
        (id) =>
          !existing.has(id) &&
          locations.some(
            (location) =>
              location.id === id &&
              location.status === 'active',
          ),
      );

    for (const locationId of removed) {
      await apiFetch(
        `/inventory/items/${itemId}/locations/${locationId}`,
        token,
        {
          method: 'DELETE',
        },
      );
    }

    for (const locationId of added) {
      await apiFetch(
        `/inventory/items/${itemId}/locations/${locationId}/initialize`,
        token,
        {
          method: 'POST',
        },
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedSku =
      sku.trim();

    const trimmedName =
      name.trim();

    const trimmedUnit =
      unitOfMeasure.trim();

    const numericUnitPrice =
      Number(unitPrice);

    const numericReorderLevel =
      Number(reorderLevel);

    if (!trimmedSku) {
      setFormError(
        'Enter an SKU.',
      );
      return;
    }

    if (!trimmedName) {
      setFormError(
        'Enter an item name.',
      );
      return;
    }

    if (!trimmedUnit) {
      setFormError(
        'Enter a unit of measure.',
      );
      return;
    }

    if (
      !Number.isFinite(
        numericUnitPrice,
      ) ||
      numericUnitPrice < 0
    ) {
      setFormError(
        'Enter a valid unit price.',
      );
      return;
    }

    if (
      !Number.isInteger(
        numericReorderLevel,
      ) ||
      numericReorderLevel < 0
    ) {
      setFormError(
        'Reorder level must be a whole number of 0 or more.',
      );
      return;
    }

    if (
      locations.length === 0
    ) {
      setFormError(
        'Create a location before creating an item.',
      );
      return;
    }

    const hasUsableSelectedLocation =
      selectedLocationIds.some(
        (locationId) =>
          locations.some(
            (location) =>
              location.id === locationId &&
              (location.status === 'active' ||
                existingLocationIds.includes(
                  locationId,
                )),
          ),
      );

    if (!hasUsableSelectedLocation) {
      setFormError(
        'Assign the item to at least one active location.',
      );
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      const body = {
        sku: trimmedSku,
        name: trimmedName,
        ...(description.trim()
          ? {
              description:
                description.trim(),
            }
          : {}),
        ...(categoryId
          ? { categoryId }
          : {}),
        ...(supplierId
          ? { supplierId }
          : {}),
        unitOfMeasure:
          trimmedUnit,
        unitPrice:
          numericUnitPrice.toFixed(
            2,
          ),
        reorderLevel:
          numericReorderLevel,
        ...(editingItem
          ? { status }
          : {}),
      };

      let savedItemId =
        editingItem?.id ??
        '';

      if (editingItem) {
        await apiFetch(
          `/items/${editingItem.id}`,
          token,
          {
            method: 'PATCH',
            body: JSON.stringify(
              body,
            ),
          },
        );
      } else {
        const created =
          await apiFetch<Item>(
            '/items',
            token,
            {
              method: 'POST',
              body: JSON.stringify(
                body,
              ),
            },
          );

        savedItemId =
          created.id;
      }

      if (savedItemId) {
        await syncLocations(
          savedItemId,
          token,
        );
      }

      await loadPage();

      setShowForm(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? extractApiError(
              err.message,
            )
          : 'Unable to save item.',
      );
    } finally {
      setSaving(false);
    }
  }

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
      setTransactionLoading(
        false,
      );
    }
  }

  async function openItem(
    item: Item,
  ) {
    try {
      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      const records =
        await fetchItemLocations(
          item.id,
          token,
        );

      setItemLocationRecords(
        (current) => ({
          ...current,
          [item.id]: records,
        }),
      );

      const registerItem =
        buildRegisterItem(
          item,
          records,
        );

      setSelectedItem(
        registerItem,
      );

      setOperation(null);
      setOperationError('');
      setQuantity('');
      setReference('');
      setNotes('');
      setTargetLocationId('');
      setTransactionPage(1);
      setTransactionTotalPages(1);
      setHasNextTransactionPage(false);
      setHasPreviousTransactionPage(false);

      const firstLocation =
        registerItem.locationBreakdown[0];

      if (firstLocation) {
        setOperationLocationId(
          firstLocation.locationId,
        );

        await loadTransactions(
          registerItem,
          firstLocation.locationId,
          1,
        );
      } else {
        setOperationLocationId('');
        setTransactions([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(
              err.message,
            )
          : 'Unable to open item details.',
      );
    }
  }

  function closeDrawer() {
    if (submitting) {
      return;
    }

    setSelectedItem(null);
    setOperation(null);
    setTransactions([]);
    setOperationLocationId('');
    setTargetLocationId('');
    setQuantity('');
    setReference('');
    setNotes('');
    setOperationError('');
    setTransactionPage(1);
    setTransactionTotalPages(1);
    setHasNextTransactionPage(false);
    setHasPreviousTransactionPage(false);
  }

  async function handleLocationSelect(
    locationId: string,
  ) {
    if (!selectedItem) {
      return;
    }

    setOperationLocationId(
      locationId,
    );

    setTransactionPage(1);
    setTransactionTotalPages(1);
    setHasNextTransactionPage(false);
    setHasPreviousTransactionPage(false);

    await loadTransactions(
      selectedItem,
      locationId,
      1,
    );
  }

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
      selectedItem.locationBreakdown.length >
      0
    ) {
      setOperationLocationId(
        selectedItem
          .locationBreakdown[0]
          .locationId,
      );
    }
  }

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

  async function refreshOpenItem() {
    if (!selectedItem) {
      return null;
    }

    const currentItem =
      items.find(
        (item) =>
          item.id ===
          selectedItem.id,
      );

    if (!currentItem) {
      return null;
    }

    const token =
      window.localStorage.getItem(
        'accessToken',
      );

    if (!token) {
      throw new Error(
        'Please sign in first.',
      );
    }

    const records =
      await fetchItemLocations(
        currentItem.id,
        token,
      );

    setItemLocationRecords(
      (current) => ({
        ...current,
        [currentItem.id]:
          records,
      }),
    );

    const refreshed =
      buildRegisterItem(
        currentItem,
        records,
      );

    setSelectedItem(
      refreshed,
    );

    return refreshed;
  }

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

    if (
      !operationLocationId
    ) {
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
          body: JSON.stringify(
            body,
          ),
        },
      );

      const refreshed =
        await refreshOpenItem();

      if (
        refreshed &&
        operationLocationId
      ) {
        await loadTransactions(
          refreshed,
          operationLocationId,
          1,
        );
      }

      await loadPage();

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

  async function handlePreviousPage() {
    if (
      !selectedItem ||
      !operationLocationId ||
      !hasPreviousTransactionPage ||
      transactionLoading
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
      !hasNextTransactionPage ||
      transactionLoading
    ) {
      return;
    }

    await loadTransactions(
      selectedItem,
      operationLocationId,
      transactionPage + 1,
    );
  }

  async function archiveItem(
    item: Item,
  ) {
    const confirmed =
      window.confirm(
        `Archive "${item.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      await apiFetch(
        `/items/${item.id}/archive`,
        token,
        {
          method: 'POST',
        },
      );

      await loadPage();
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(
              err.message,
            )
          : 'Unable to archive item.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#ddd0b8] text-[#2b2620]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed(
            (current) =>
              !current,
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
          <div className="mx-auto max-w-[1250px]">

            {/* HEADER */}
            <header className="border border-[#b7a87e] bg-[#f5f0e3] px-5 py-4 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[8px] tracking-[0.18em] text-[#5b5346]">
                    INVENTORY MANAGEMENT SYSTEM
                  </div>

                  <div className="mt-1 font-mono text-[19px] tracking-[0.05em]">
                    INVENTORY LEDGER
                  </div>
                </div>

                <div className="hidden border-2 border-[#a63a2e] px-2.5 py-1 font-mono text-[7px] tracking-widest text-[#a63a2e] sm:block">
                  ITEM REGISTER · {industryLabel}
                </div>
              </div>
            </header>

            {/* MAIN */}
            <section className="relative mt-4 border border-[#b7a87e] bg-[#f5f0e3] p-5 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)] md:p-7">
              <div className="pointer-events-none absolute inset-2 border border-dashed border-[#2b2620]/15" />

              <div className="relative">

                {/* TITLE */}
                <div className="flex flex-col gap-4 border-b border-dashed border-[#b7a87e] pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                      ITEM REGISTER
                    </div>

                    <h1 className="mt-1 font-mono text-[28px] leading-tight">
                      Items
                    </h1>

                    <p className="mt-2 max-w-[700px] font-mono text-[9px] leading-5 text-[#5b5346]">
                      Manage item masters, classifications,
                      suppliers and stock-location assignments.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      openCreateForm
                    }
                    className="flex items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]"
                  >
                    <Plus
                      size={14}
                      strokeWidth={1.7}
                    />
                    ADD ITEM
                  </button>
                </div>

                {/* SUMMARY */}
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="border border-[#b7a87e] p-4">
                    <div className="flex items-center gap-2 font-mono text-[7px] tracking-widest text-[#5b5346]">
                      <Building2
                        size={13}
                        strokeWidth={1.6}
                      />
                      ORGANIZATION
                    </div>

                    <div className="mt-1 font-mono text-[14px]">
                      {loading
                        ? 'LOADING...'
                        : organization?.name ??
                          '—'}
                    </div>
                  </div>

                  <div className="border border-[#2e4057] bg-[#2e4057] p-4 text-[#f5f0e3]">
                    <div className="font-mono text-[7px] tracking-widest text-[#ddd0b8]">
                      ACTIVE ITEMS
                    </div>

                    <div className="mt-1 font-mono text-[21px] text-[#c68a2e]">
                      {activeCount}
                    </div>
                  </div>

                  <div className="border border-[#b7a87e] p-4">
                    <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                      REGISTER
                    </div>

                    <div className="mt-1 font-mono text-[11px]">
                      {items.length} ITEMS ·{' '}
                      {archivedCount} ARCHIVED
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 border border-[#a63a2e] bg-[#a63a2e]/5 px-4 py-3 font-mono text-[8px] text-[#a63a2e]">
                    {error}
                  </div>
                )}

                {/* SEARCH */}
                <div className="mt-6 flex flex-col gap-3 border border-[#b7a87e] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                      ITEM REGISTER
                    </div>

                    <div className="mt-1 font-mono text-[11px]">
                      {visibleItems.length}{' '}
                      {visibleItems.length === 1
                        ? 'RECORD'
                        : 'RECORDS'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search
                      size={13}
                      strokeWidth={1.6}
                      className="text-[#5b5346]"
                    />

                    <input
                      value={search}
                      onChange={(
                        event,
                      ) =>
                        setSearch(
                          event.target
                            .value,
                        )
                      }
                      placeholder="SEARCH SKU / ITEM / CATEGORY / SUPPLIER..."
                      className="w-full border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[8px] outline-none placeholder:text-[#8a806f] sm:w-[400px]"
                    />
                  </div>
                </div>

                {/* TABLE */}
                <div className="mt-4 overflow-hidden border border-[#b7a87e]">
                  {loading ? (
                    <div className="px-4 py-12 text-center font-mono text-[9px] text-[#5b5346]">
                      LOADING ITEM REGISTER...
                    </div>
                  ) : visibleItems.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <Package
                        size={30}
                        strokeWidth={1.4}
                        className="mx-auto text-[#b7a87e]"
                      />

                      <div className="mt-3 font-mono text-[10px]">
                        No items found.
                      </div>

                      <button
                        type="button"
                        onClick={
                          openCreateForm
                        }
                        className="mt-4 border border-[#2b2620] px-4 py-2 font-mono text-[8px] tracking-widest hover:bg-[#2e4057] hover:text-[#f5f0e3]"
                      >
                        ADD FIRST ITEM
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1100px] border-collapse">
                        <thead>
                          <tr className="border-b border-[#b7a87e] bg-[#eae2ce]">
                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                              SKU
                            </th>
                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                              ITEM
                            </th>
                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                              CATEGORY
                            </th>
                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                              SUPPLIER
                            </th>
                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                              LOCATIONS
                            </th>
                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest text-[#5b5346]">
                              STATUS
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {visibleItems.map(
                            (item) => {
                              const records =
                                itemLocationRecords[
                                  item.id
                                ] ?? [];

                              return (
                                <tr
                                  key={
                                    item.id
                                  }
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    openItem(
                                      item,
                                    )
                                  }
                                  onKeyDown={(
                                    event,
                                  ) => {
                                    if (
                                      event.key ===
                                        'Enter' ||
                                      event.key ===
                                        ' '
                                    ) {
                                      event.preventDefault();
                                      openItem(
                                        item,
                                      );
                                    }
                                  }}
                                  className="cursor-pointer border-b border-dashed border-[#b7a87e] hover:bg-[#eae2ce] focus:bg-[#eae2ce] focus:outline-none"
                                >
                                  <td className="px-4 py-3 align-top font-mono text-[8px] font-bold text-[#2e4057]">
                                    {item.sku}
                                  </td>

                                  <td className="px-4 py-3 align-top">
                                    <div className="font-mono text-[9px]">
                                      {item.name}
                                    </div>

                                    <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                                      {formatCurrency(
                                        item.unitPrice,
                                      )}{' '}
                                      · reorder{' '}
                                      {
                                        item.reorderLevel
                                      }
                                    </div>
                                  </td>

                                  <td className="px-4 py-3 align-top font-mono text-[8px] text-[#5b5346]">
                                    {item.category?.name ??
                                      '—'}
                                  </td>

                                  <td className="px-4 py-3 align-top font-mono text-[8px] text-[#5b5346]">
                                    {item.supplier?.name ??
                                      '—'}
                                  </td>

                                  <td className="px-4 py-3 align-top">
                                    {records.length >
                                    0 ? (
                                      <div className="flex flex-col gap-1.5">
                                        {records.map(
                                          (
                                            record,
                                          ) => (
                                            <div
                                              key={
                                                record.id
                                              }
                                              className="inline-flex w-fit max-w-full items-center gap-1.5 border border-[#b7a87e] bg-[#f5f0e3] px-2 py-1 font-mono text-[7px]"
                                            >
                                              <MapPin
                                                size={
                                                  9
                                                }
                                                strokeWidth={
                                                  1.5
                                                }
                                              />

                                              <span className="truncate">
                                                {record
                                                  .location
                                                  ?.name ??
                                                  'UNKNOWN LOCATION'}
                                              </span>

                                              <span className="border-l border-[#b7a87e] pl-1.5 font-bold text-[#2e4057]">
                                                {
                                                  record.quantity
                                                }
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-[7px] text-[#a63a2e]">
                                        NO LOCATION
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-4 py-3 align-top">
                                    <span className="border border-[#b7a87e] px-2 py-1 font-mono text-[7px]">
                                      {formatStatus(
                                        item.status,
                                      )}
                                    </span>
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <footer className="mt-3 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">
              <div className="flex justify-between gap-4">
                <span>
                  INVENTORY LEDGER · ITEMS
                </span>

                <span>
                  {organization?.name ??
                    'ORGANIZATION'}
                </span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* ITEM DETAILS / STOCK DRAWER */}
      <ItemDrawer
        selectedItem={selectedItem}
        organizationLocations={locations}
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
        operationError={operationError}
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
        onEdit={() => {
          const currentItem =
            items.find(
              (item) =>
                item.id ===
                selectedItem?.id,
            );

          if (currentItem) {
            closeDrawer();
            openEditForm(
              currentItem,
            );
          }
        }}
        onArchive={() => {
          const currentItem =
            items.find(
              (item) =>
                item.id ===
                selectedItem?.id,
            );

          if (currentItem) {
            archiveItem(
              currentItem,
            );
          }
        }}
        itemArchived={
          items.find(
            (item) =>
              item.id ===
              selectedItem?.id,
          )?.status ===
          'archived'
        }
      />

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <>
          <button
            type="button"
            aria-label="Close item form"
            onClick={closeForm}
            className="fixed inset-0 z-[60] bg-[#2b2620]/45"
          />

          <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 md:items-center">
            <form
              onSubmit={
                handleSubmit
              }
              className="my-auto w-full max-w-[780px] border border-[#2b2620] bg-[#f5f0e3] p-5 shadow-[8px_10px_0_rgba(43,38,32,0.18)] md:p-6"
            >
              <div className="flex items-start justify-between border-b border-dashed border-[#b7a87e] pb-4">
                <div>
                  <div className="font-mono text-[7px] tracking-widest text-[#a63a2e]">
                    ITEM REGISTER
                  </div>

                  <h3 className="mt-1 font-mono text-[21px]">
                    {editingItem
                      ? 'EDIT ITEM'
                      : 'ADD ITEM'}
                  </h3>

                  <p className="mt-1 font-mono text-[8px] leading-5 text-[#5b5346]">
                    Item details are maintained separately from stock quantities.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  className="text-[#5b5346] hover:text-[#2b2620]"
                  aria-label="Close"
                >
                  <X
                    size={18}
                    strokeWidth={1.7}
                  />
                </button>
              </div>

              {formError && (
                <div className="mt-4 border border-[#a63a2e] bg-[#a63a2e]/5 px-3 py-2.5 font-mono text-[8px] text-[#a63a2e]">
                  {formError}
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="SKU"
                  required
                >
                  <input
                    value={sku}
                    onChange={(event) =>
                      setSku(
                        event.target
                          .value,
                      )
                    }
                    className="field-input"
                    placeholder="e.g. PARA-500"
                  />
                </Field>

                <Field
                  label="ITEM NAME"
                  required
                >
                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target
                          .value,
                      )
                    }
                    className="field-input"
                    placeholder="e.g. Paracetamol 500mg"
                  />
                </Field>

                <Field label="CATEGORY">
                  <select
                    value={categoryId}
                    onChange={(event) =>
                      setCategoryId(
                        event.target
                          .value,
                      )
                    }
                    className="field-input"
                  >
                    <option value="">
                      — NONE —
                    </option>

                    {categories.map(
                      (
                        category,
                      ) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="SUPPLIER">
                  <select
                    value={supplierId}
                    onChange={(event) =>
                      setSupplierId(
                        event.target
                          .value,
                      )
                    }
                    className="field-input"
                  >
                    <option value="">
                      — NONE —
                    </option>

                    {suppliers.map(
                      (
                        supplier,
                      ) => (
                        <option
                          key={
                            supplier.id
                          }
                          value={
                            supplier.id
                          }
                        >
                          {
                            supplier.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field
                  label="UNIT OF MEASURE"
                  required
                >
                  <input
                    value={
                      unitOfMeasure
                    }
                    onChange={(event) =>
                      setUnitOfMeasure(
                        event.target
                          .value,
                      )
                    }
                    className="field-input"
                    placeholder="box / pack / vial / each"
                  />
                </Field>

                <Field
                  label="UNIT PRICE"
                  required
                >
                  <input
                    value={unitPrice}
                    onChange={(event) =>
                      setUnitPrice(
                        event.target
                          .value,
                      )
                    }
                    inputMode="decimal"
                    className="field-input"
                    placeholder="0.00"
                  />
                </Field>

                <Field
                  label="REORDER LEVEL"
                  required
                >
                  <input
                    value={
                      reorderLevel
                    }
                    onChange={(event) =>
                      setReorderLevel(
                        event.target
                          .value,
                      )
                    }
                    inputMode="numeric"
                    className="field-input"
                    placeholder="0"
                  />
                </Field>

                {editingItem && (
                  <Field label="STATUS">
                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(
                          event.target
                            .value as
                            | 'active'
                            | 'discontinued',
                        )
                      }
                      className="field-input"
                    >
                      <option value="active">
                        ACTIVE
                      </option>
                      <option value="discontinued">
                        DISCONTINUED
                      </option>
                    </select>
                  </Field>
                )}
              </div>

              <div className="mt-4">
                <Field label="DESCRIPTION">
                  <textarea
                    value={
                      description
                    }
                    onChange={(event) =>
                      setDescription(
                        event.target
                          .value,
                      )
                    }
                    rows={3}
                    className="field-input resize-none"
                    placeholder="Optional item description..."
                  />
                </Field>
              </div>

              <div className="mt-6 border-t border-dashed border-[#b7a87e] pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                      STOCK LOCATIONS
                    </div>

                    <div className="mt-1 font-mono text-[7px] leading-4 text-[#5b5346]">
                      Select active locations where this
                      item should be available.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push('/locations')
                    }
                    className="shrink-0 border border-[#2e4057] px-2.5 py-1.5 font-mono text-[7px] tracking-widest text-[#2e4057] hover:bg-[#2e4057] hover:text-[#f5f0e3]"
                  >
                    MANAGE LOCATIONS
                  </button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {locations.map(
                    (location) => {
                      const selected =
                        selectedLocationIds.includes(
                          location.id,
                        );

                      const isActive =
                        location.status ===
                        'active';

                      const isExisting =
                        existingLocationIds.includes(
                          location.id,
                        );

                      return (
                        <button
                          key={
                            location.id
                          }
                          type="button"
                          disabled={
                            !isActive &&
                            !isExisting
                          }
                          onClick={() => {
                            if (
                              !isActive &&
                              !isExisting
                            ) {
                              return;
                            }

                            toggleLocation(
                              location.id,
                            );
                          }}
                          className={`flex items-center justify-between border px-3 py-3 text-left ${
                            !isActive
                              ? 'cursor-not-allowed border-[#b7a87e] bg-[#eae2ce] opacity-70'
                              : selected
                                ? 'border-[#2e4057] bg-[#ddd0b8]'
                                : 'border-[#b7a87e] bg-[#f5f0e3] hover:bg-[#eae2ce]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <MapPin
                                size={10}
                                strokeWidth={1.5}
                              />

                              <div className="truncate font-mono text-[8px]">
                                {
                                  location.name
                                }
                              </div>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[7px] text-[#5b5346]">
                              <span>
                                {location.locationType.toUpperCase()}
                              </span>

                              <span className="border-l border-[#b7a87e] pl-2">
                                {isActive
                                  ? 'ACTIVE'
                                  : 'INACTIVE'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center border font-mono text-[8px] ${
                              selected
                                ? 'border-[#2e4057] bg-[#2e4057] text-[#f5f0e3]'
                                : 'border-[#b7a87e]'
                            }`}
                          >
                            {selected
                              ? '✓'
                              : ''}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>

                {locations.some(
                  (location) =>
                    location.status !==
                    'active',
                ) && (
                  <div className="mt-3 border border-dashed border-[#b7a87e] px-3 py-2 font-mono text-[7px] leading-4 text-[#5b5346]">
                    INACTIVE LOCATIONS REMAIN VISIBLE.
                    EXISTING ITEM ASSIGNMENTS ARE
                    PRESERVED. ACTIVATE A LOCATION FROM
                    LOCATIONS BEFORE ADDING A NEW
                    ASSIGNMENT.
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-dashed border-[#b7a87e] pt-5 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={saving}
                  className="border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest disabled:opacity-40"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="border-2 border-[#2e4057] bg-[#2e4057] px-5 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620] disabled:opacity-50"
                >
                  {saving
                    ? 'SAVING...'
                    : editingItem
                      ? 'SAVE ITEM'
                      : 'CREATE ITEM'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </main>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 font-mono text-[7px] tracking-widest text-[#5b5346]">
        {label}
        {required && (
          <span className="text-[#a63a2e]">
            {' '}
            *
          </span>
        )}
      </div>

      {children}
    </label>
  );
}

