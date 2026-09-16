'use client';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Edit3,
  MapPin,
  Package,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch } from '../../lib/api';

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
  reorderLevel?: number | null;
  location?: {
    id: string;
    name: string;
    locationType?: string;
  } | null;
};

type CollectionResponse<T> =
  | T[]
  | {
      data?: T[];
    };

const LOCATION_TYPES = [
  'STORE',
  'WAREHOUSE',
  'PHARMACY',
  'DEPARTMENT',
  'LABORATORY',
  'THEATRE',
  'WARD',
  'OFFICE',
  'OTHER',
];

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
    // The response was not JSON.
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
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '₦0';
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function formatStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'ACTIVE';

    case 'discontinued':
      return 'DISCONTINUED';

    case 'archived':
      return 'ARCHIVED';

    default:
      return status.toUpperCase();
  }
}

function formatLocationType(
  locationType: string,
): string {
  return locationType
    .replace(/_/g, ' ')
    .toUpperCase();
}

export default function SetupItemsPage() {
  const router = useRouter();

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] =
    useState<Category[]>([]);
  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);
  const [locations, setLocations] =
    useState<Location[]>([]);

  /*
   * itemId -> attached location names
   *
   * This is only presentation state.
   * The real relationship remains ITEM_LOCATION in the database.
   */
  const [itemLocations, setItemLocations] =
    useState<Record<string, string[]>>({});

  /*
   * Existing location ids for the item currently being edited.
   *
   * Used so that existing assignments are preserved
   * and only newly selected locations are attached.
   */
  const [existingLocationIds, setExistingLocationIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingItems, setLoadingItems] =
    useState(false);

  const [loadingSetupData, setLoadingSetupData] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [formError, setFormError] =
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
    useState<'active' | 'discontinued'>(
      'active',
    );

  const [selectedLocationIds, setSelectedLocationIds] =
    useState<string[]>([]);

  const [search, setSearch] =
    useState('');

  async function loadItems(
    token: string,
  ) {
    try {
      setLoadingItems(true);
      setError('');

      const response =
        await apiFetch<
          CollectionResponse<Item>
        >('/items', token);

      const data = asCollection(response);

      setItems(data);

      /*
       * Load the actual ITEM_LOCATION relationships
       * after the item list is loaded so the register
       * can display real location names.
       */
      await loadItemLocations(data, token);
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load items.',
      );
    } finally {
      setLoadingItems(false);
    }
  }

  async function loadItemLocations(
    itemsData: Item[],
    token: string,
  ) {
    const locationMap: Record<
      string,
      string[]
    > = {};

    await Promise.all(
      itemsData.map(async (item) => {
        try {
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

          const names: string[] = [];

          for (const record of records) {
            const locationName =
              record.location?.name;

            if (
              typeof locationName ===
                'string' &&
              locationName.trim() !== ''
            ) {
              names.push(locationName);
            }
          }

          locationMap[item.id] = [
            ...new Set(names),
          ];
        } catch (err) {
          console.error(
            `Unable to load locations for ${item.name}:`,
            err,
          );

          locationMap[item.id] = [];
        }
      }),
    );

    setItemLocations(locationMap);
  }

  async function loadSetupData(
    token: string,
  ) {
    try {
      setLoadingSetupData(true);

      const [
        categoryResponse,
        supplierResponse,
        locationResponse,
      ] = await Promise.all([
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

      setCategories(
        asCollection(categoryResponse),
      );

      setSuppliers(
        asCollection(supplierResponse),
      );

      setLocations(
        asCollection(locationResponse),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load setup data.',
      );
    } finally {
      setLoadingSetupData(false);
    }
  }

  useEffect(() => {
    async function loadSetup() {
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

        const me =
          await apiFetch<CurrentUserResponse>(
            '/auth/me',
            token,
          );

        setOrganization(
          me.organization,
        );

        await Promise.all([
          loadSetupData(token),
          loadItems(token),
        ]);
      } catch (err) {
        setError(
          err instanceof Error
            ? extractApiError(err.message)
            : 'Unable to load organization setup.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadSetup();
  }, [router]);

  /*
   * Locations no longer have a status property.
   * Every loaded location can therefore be used
   * for item-location assignment.
   */
  const activeLocations = useMemo(
    () => locations,
    [locations],
  );

  const visibleItems = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const matchesName =
        item.name
          .toLowerCase()
          .includes(query);

      const matchesSku =
        item.sku
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        item.category?.name
          .toLowerCase()
          .includes(query) ?? false;

      const matchesSupplier =
        item.supplier?.name
          .toLowerCase()
          .includes(query) ?? false;

      return (
        matchesName ||
        matchesSku ||
        matchesCategory ||
        matchesSupplier
      );
    });
  }, [items, search]);

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
      setFormError('');
      setError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

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
        item.status === 'discontinued'
          ? 'discontinued'
          : 'active',
      );

      /*
       * Load the actual ItemLocation rows.
       *
       * The backend includes:
       * record.location.id
       * record.location.name
       * record.location.locationType
       */
      const response =
        await apiFetch<ItemLocationRecord[]>(
          `/inventory/items/${item.id}`,
          token,
        );

      const records =
        Array.isArray(response)
          ? response
          : [];

      const availableLocationIds =
        new Set(
          activeLocations.map(
            (location) =>
              location.id,
          ),
        );

      const ids = records
        .map((record) =>
          record.locationId ??
          record.location?.id ??
          '',
        )
        .filter(
          (value) =>
            value !== '' &&
            availableLocationIds.has(
              value,
            ),
        );

      const uniqueIds = [
        ...new Set(ids),
      ];

      /*
       * Existing locations are selected automatically.
       */
      setExistingLocationIds(
        uniqueIds,
      );

      setSelectedLocationIds(
        uniqueIds,
      );

      setShowForm(true);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load item locations.',
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
        current.includes(locationId)
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
  locationIds: string[],
) {
  const existingIds =
    new Set(existingLocationIds);

  const selectedIds =
    new Set(locationIds);

  // Locations that were previously assigned
  // but are no longer selected.
  const removedLocationIds =
    [...existingIds].filter(
      (locationId) =>
        !selectedIds.has(locationId),
    );

  // Locations selected now that did not exist before.
  const newLocationIds =
    locationIds.filter(
      (locationId) =>
        !existingIds.has(locationId),
    );

  /*
   * Remove old zero-balance assignments first.
   */
  for (const locationId of removedLocationIds) {
    await apiFetch(
      `/inventory/items/${itemId}/locations/${locationId}`,
      token,
      {
        method: 'DELETE',
      },
    );
  }

  /*
   * Create new assignments.
   */
  for (const locationId of newLocationIds) {
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

    const trimmedDescription =
      description.trim();

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

    /*
     * An item must have at least one
     * stock location.
     */
    if (
      activeLocations.length === 0
    ) {
      setFormError(
        'Create at least one location before creating an item.',
      );
      return;
    }

    if (
      selectedLocationIds.length === 0
    ) {
      setFormError(
        'Assign the item to at least one location.',
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

        ...(trimmedDescription
          ? {
              description:
                trimmedDescription,
            }
          : {}),

        ...(categoryId
          ? {
              categoryId,
            }
          : {}),

        ...(supplierId
          ? {
              supplierId,
            }
          : {}),

        unitOfMeasure:
          trimmedUnit,

        unitPrice:
          numericUnitPrice.toFixed(2),

        reorderLevel:
          numericReorderLevel,

        ...(editingItem
          ? {
              status,
            }
          : {}),
      };

      let savedItemId =
        editingItem?.id ?? '';

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
        const response =
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
          response.id;
      }

      /*
       * Location assignment is separate
       * from the Item master.
       *
       * Only missing ItemLocation rows
       * are created.
       *
       * Existing assignments are preserved.
       */
      if (savedItemId) {
        await syncLocations(
            savedItemId,
            token,
            selectedLocationIds,
        );
      }

      await loadItems(token);

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

  async function archiveItem(
    item: Item,
  ) {
    const confirmed =
      window.confirm(
        `Archive "${item.name}"? Archived items cannot receive new inventory.`,
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

      await loadItems(token);
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

  const selectedCount =
    selectedLocationIds.length;

  const newLocationCount =
    selectedLocationIds.filter(
      (locationId) =>
        !existingLocationIds.includes(
          locationId,
        ),
    ).length;

  const industryLabel =
    organization?.industryType
      ? organization.industryType
          .replace(/_/g, ' ')
          .toUpperCase()
      : 'ORGANIZATION';

  return (
    <main className="min-h-screen bg-[#ddd0b8] px-4 py-6 text-[#2b2620]">
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
              ITEM SETUP · {industryLabel}
            </div>
          </div>
        </header>

        {/* MAIN PAPER */}
        <section className="relative mt-4 border border-[#b7a87e] bg-[#f5f0e3] p-5 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)] md:p-7">
          <div className="pointer-events-none absolute inset-2 border border-dashed border-[#2b2620]/15" />

          <div className="relative">
            {/* TITLE */}
            <div className="flex flex-col gap-4 border-b border-dashed border-[#b7a87e] pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                  SETUP · 04 / 05
                </div>

                <h1 className="mt-1 font-mono text-[28px] leading-tight">
                  Items
                </h1>

                <p className="mt-2 max-w-[700px] font-mono text-[9px] leading-5 text-[#5b5346]">
                  Define the items your
                  organization keeps in stock
                  and assign each item to its
                  stock locations.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  openCreateForm
                }
                disabled={
                  activeLocations.length ===
                  0
                }
                className="flex items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus
                  size={14}
                  strokeWidth={1.7}
                />
                ADD ITEM
              </button>
            </div>

            {/* ORGANIZATION STRIP */}
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_230px]">
              <div className="border border-[#b7a87e] p-4">
                <div className="flex items-center gap-2 font-mono text-[7px] tracking-widest text-[#5b5346]">
                  <Building2
                    size={13}
                    strokeWidth={1.6}
                  />
                  CURRENT ORGANIZATION
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
                  INVENTORY LOCATIONS
                </div>

                <div className="mt-1 font-mono text-[19px]">
                  {activeLocations.length}
                </div>

                <div className="mt-1 font-mono text-[7px] text-[#ddd0b8]">
                  STOCK LOCATIONS
                </div>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="mt-5 flex items-start gap-3 border border-[#a63a2e] bg-[#f5f0e3] px-4 py-3">
                <X
                  size={15}
                  strokeWidth={1.7}
                  className="mt-0.5 shrink-0 text-[#a63a2e]"
                />

                <span className="font-mono text-[9px] leading-4 text-[#a63a2e]">
                  {error}
                </span>
              </div>
            )}

            {/* SEARCH */}
            <div className="mt-5 flex flex-col gap-2 border border-[#b7a87e] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                  ITEM REGISTER
                </div>

                <div className="mt-1 font-mono text-[11px]">
                  {visibleItems.length}{' '}
                  {visibleItems.length ===
                  1
                    ? 'RECORD'
                    : 'RECORDS'}
                </div>
              </div>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="SEARCH SKU / ITEM / CATEGORY / SUPPLIER..."
                className="w-full border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[8px] outline-none placeholder:text-[#8a806f] sm:max-w-[390px]"
              />
            </div>

            {/* REGISTER */}
            <div className="mt-5 overflow-hidden border border-[#b7a87e] bg-[#f5f0e3]">
              <div className="hidden grid-cols-[110px_minmax(190px,1.8fr)_150px_190px_minmax(210px,1.5fr)] gap-3 border-b border-[#b7a87e] bg-[#ddd0b8] px-4 py-2.5 font-mono text-[7px] tracking-widest text-[#5b5346] md:grid">
                <span>SKU</span>
                <span>ITEM</span>
                <span>CATEGORY</span>
                <span>SUPPLIER</span>
                <span>LOCATIONS</span>
              </div>

              {loading ||
              loadingItems ||
              loadingSetupData ? (
                <div className="px-4 py-12 text-center font-mono text-[9px] text-[#5b5346]">
                  LOADING ITEM REGISTER...
                </div>
              ) : visibleItems.length ===
                0 ? (
                <div className="px-5 py-12 text-center">
                  <Package
                    size={30}
                    strokeWidth={1.4}
                    className="mx-auto text-[#b7a87e]"
                  />

                  <div className="mt-3 font-mono text-[10px]">
                    No items found.
                  </div>

                  <div className="mt-1 font-mono text-[8px] text-[#5b5346]">
                    Create your first item
                    to begin building the
                    inventory register.
                  </div>

                  <button
                    type="button"
                    onClick={
                      openCreateForm
                    }
                    disabled={
                      activeLocations.length ===
                      0
                    }
                    className="mt-4 border border-[#2b2620] px-4 py-2 font-mono text-[8px] tracking-widest hover:bg-[#2e4057] hover:text-[#f5f0e3] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    CREATE FIRST ITEM
                  </button>
                </div>
              ) : (
                visibleItems.map(
                  (item) => {
                    const locationsForItem =
                      itemLocations[
                        item.id
                      ] ?? [];

                    return (
                      <div
                        key={item.id}
                        className="border-b border-dashed border-[#b7a87e] last:border-b-0"
                      >
                        <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[110px_minmax(190px,1.8fr)_150px_190px_minmax(210px,1.5fr)] md:items-center md:gap-3">
                          {/* SKU */}
                          <div>
                            <div className="font-mono text-[9px] font-bold text-[#2e4057]">
                              {item.sku}
                            </div>

                            <div className="mt-1 font-mono text-[7px] text-[#5b5346] md:hidden">
                              {item.unitOfMeasure.toUpperCase()}
                            </div>
                          </div>

                          {/* ITEM */}
                          <div className="min-w-0">
                            <div className="font-mono text-[11px]">
                              {item.name}
                            </div>

                            <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                              {formatCurrency(
                                item.unitPrice,
                              )}{' '}
                              · reorder{' '}
                              {item.reorderLevel}
                            </div>

                            <div className="mt-1 font-mono text-[7px] text-[#5b5346] md:hidden">
                              {item.unitOfMeasure.toUpperCase()}
                            </div>
                          </div>

                          {/* CATEGORY */}
                          <div>
                            <div className="font-mono text-[8px]">
                              {item.category
                                ?.name ??
                                '—'}
                            </div>
                          </div>

                          {/* SUPPLIER */}
                          <div>
                            <div className="font-mono text-[8px]">
                              {item.supplier
                                ?.name ??
                                '—'}
                            </div>
                          </div>

                          {/* LOCATIONS */}
                          <div className="min-w-0">
                            {locationsForItem.length >
                            0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {locationsForItem.map(
                                  (
                                    locationName,
                                  ) => (
                                    <span
                                      key={
                                        locationName
                                      }
                                      className="border border-[#b7a87e] bg-[#eae2ce] px-2 py-1 font-mono text-[7px] text-[#2b2620]"
                                    >
                                      {
                                        locationName
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-[7px] text-[#8a806f]">
                                NO LOCATION
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ACTION ROW */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#b7a87e] px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span
                              className={`border px-2 py-1 font-mono text-[7px] ${
                                item.status ===
                                'active'
                                  ? 'border-[#3d6b4f] text-[#3d6b4f]'
                                  : item.status ===
                                      'discontinued'
                                    ? 'border-[#c68a2e] text-[#9b681b]'
                                    : 'border-[#a63a2e] text-[#a63a2e]'
                              }`}
                            >
                              {formatStatus(
                                item.status,
                              )}
                            </span>

                            {locationsForItem.length >
                              0 && (
                              <span className="font-mono text-[7px] text-[#5b5346]">
                                {locationsForItem.length}{' '}
                                {locationsForItem.length ===
                                1
                                  ? 'LOCATION'
                                  : 'LOCATIONS'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  item,
                                )
                              }
                              className="flex items-center gap-1.5 border border-[#2b2620] px-2.5 py-1.5 font-mono text-[7px] tracking-widest hover:bg-[#2e4057] hover:text-[#f5f0e3]"
                              title="Edit item"
                            >
                              <Edit3
                                size={12}
                                strokeWidth={
                                  1.6
                                }
                              />
                              EDIT
                            </button>

                            {item.status !==
                              'archived' && (
                              <button
                                type="button"
                                onClick={() =>
                                  archiveItem(
                                    item,
                                  )
                                }
                                className="flex items-center gap-1.5 border border-[#a63a2e] px-2.5 py-1.5 font-mono text-[7px] tracking-widest text-[#a63a2e] hover:bg-[#a63a2e] hover:text-[#f5f0e3]"
                                title="Archive item"
                              >
                                <Trash2
                                  size={12}
                                  strokeWidth={
                                    1.6
                                  }
                                />
                                ARCHIVE
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>

            {/* LOCATION INFORMATION */}
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="border border-dashed border-[#b7a87e] p-4">
                <div className="flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">
                  <MapPin
                    size={13}
                    strokeWidth={1.6}
                  />
                  LOCATION MODEL
                </div>

                <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                  An item can exist in
                  multiple locations.
                  Location assignment is
                  stored separately from
                  the item master so each
                  location can maintain its
                  own inventory balance.
                </div>
              </div>

              <div className="border border-dashed border-[#b7a87e] p-4">
                <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                  OPENING BALANCES
                </div>

                <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                  Item creation does not
                  write stock quantities.
                  After items are defined,
                  opening balances are
                  entered in the next setup
                  step.
                </div>
              </div>
            </div>

            {/* NAVIGATION */}
            <div className="mt-6 flex flex-col gap-2 border-t border-dashed border-[#b7a87e] pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/setup/categories',
                  )
                }
                className="flex items-center justify-center gap-2 border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest hover:bg-[#eae2ce]"
              >
                <ArrowLeft
                  size={14}
                  strokeWidth={1.7}
                />
                PREVIOUS · CATEGORIES
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/setup/opening-balances',
                  )
                }
                className="flex items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]"
              >
                NEXT · OPENING BALANCES
                <ArrowRight
                  size={14}
                  strokeWidth={1.7}
                />
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-3 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">
          <div className="flex justify-between gap-4">
            <span>
              INVENTORY LEDGER · ITEM
              SETUP
            </span>

            <span>
              {organization?.name ??
                'ORGANIZATION'}
            </span>
          </div>
        </footer>
      </div>

      {/* CREATE / EDIT FORM */}
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
              className="my-auto w-full max-w-[760px] border border-[#2b2620] bg-[#f5f0e3] p-5 shadow-[8px_10px_0_rgba(43,38,32,0.18)] md:p-6"
            >
              {/* FORM HEADER */}
              <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#b7a87e] pb-4">
                <div>
                  <div className="font-mono text-[7px] tracking-widest text-[#a63a2e]">
                    ITEM REGISTER
                  </div>

                  <h3 className="mt-1 font-mono text-[21px]">
                    {editingItem
                      ? 'Edit Item'
                      : 'New Item'}
                  </h3>

                  <p className="mt-1 max-w-[560px] font-mono text-[8px] leading-5 text-[#5b5346]">
                    Item details are
                    maintained separately
                    from stock quantities.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  className="border border-[#2b2620] p-1.5 hover:bg-[#eae2ce]"
                  aria-label="Close"
                >
                  <X
                    size={16}
                    strokeWidth={1.7}
                  />
                </button>
              </div>

              {/* FORM ERROR */}
              {formError && (
                <div className="mt-4 border border-[#a63a2e] bg-[#f5f0e3] px-3 py-2.5 font-mono text-[8px] leading-4 text-[#a63a2e]">
                  {formError}
                </div>
              )}

              {/* MASTER DATA */}
              <div className="mt-5">
                <div className="mb-3 font-mono text-[8px] tracking-widest text-[#5b5346]">
                  ITEM MASTER
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="SKU"
                    required
                  >
                    <input
                      value={sku}
                      onChange={(
                        event,
                      ) =>
                        setSku(
                          event.target
                            .value,
                        )
                      }
                      placeholder="e.g. PARA-500"
                      className="field-input"
                    />
                  </Field>

                  <Field
                    label="ITEM NAME"
                    required
                  >
                    <input
                      value={name}
                      onChange={(
                        event,
                      ) =>
                        setName(
                          event.target
                            .value,
                        )
                      }
                      placeholder="e.g. Paracetamol 500mg"
                      className="field-input"
                    />
                  </Field>

                  <Field
                    label="CATEGORY"
                  >
                    <select
                      value={
                        categoryId
                      }
                      onChange={(
                        event,
                      ) =>
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

                  <Field
                    label="SUPPLIER"
                  >
                    <select
                      value={
                        supplierId
                      }
                      onChange={(
                        event,
                      ) =>
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
                      onChange={(
                        event,
                      ) =>
                        setUnitOfMeasure(
                          event.target
                            .value,
                        )
                      }
                      placeholder="box / pack / vial / each"
                      className="field-input"
                    />
                  </Field>

                  <Field
                    label="UNIT PRICE"
                    required
                  >
                    <input
                      value={
                        unitPrice
                      }
                      onChange={(
                        event,
                      ) =>
                        setUnitPrice(
                          event.target
                            .value,
                        )
                      }
                      placeholder="0.00"
                      inputMode="decimal"
                      className="field-input"
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
                      onChange={(
                        event,
                      ) =>
                        setReorderLevel(
                          event.target
                            .value,
                        )
                      }
                      placeholder="0"
                      inputMode="numeric"
                      className="field-input"
                    />
                  </Field>

                  <Field
                    label="STATUS"
                  >
                    <select
                      value={status}
                      onChange={(
                        event,
                      ) =>
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

                  <div className="md:col-span-2">
                    <Field
                      label="DESCRIPTION"
                    >
                      <textarea
                        value={
                          description
                        }
                        onChange={(
                          event,
                        ) =>
                          setDescription(
                            event.target
                              .value,
                          )
                        }
                        rows={3}
                        placeholder="Optional item description..."
                        className="field-input resize-none"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* LOCATION ASSIGNMENT */}
              <div className="mt-6 border-t border-dashed border-[#b7a87e] pt-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                      STOCK STRUCTURE
                    </div>

                    <div className="mt-1 font-mono text-[12px]">
                      Assign Locations
                    </div>

                    <div className="mt-1 font-mono text-[7px] leading-4 text-[#5b5346]">
                      Select every location
                      where this item should
                      be available. This
                      creates the item-location
                      relationship.
                    </div>
                  </div>

                  <div className="font-mono text-[7px] text-[#3d6b4f]">
                    {selectedCount}{' '}
                    SELECTED

                    {editingItem &&
                      newLocationCount >
                        0 && (
                        <>
                          {' '}
                          ·{' '}
                          {newLocationCount}{' '}
                          NEW
                        </>
                      )}
                  </div>
                </div>

                {activeLocations.length ===
                0 ? (
                  <div className="mt-4 border border-[#a63a2e] px-3 py-3 font-mono text-[8px] leading-4 text-[#a63a2e]">
                    No locations exist.
                    Create a location first
                    before creating or
                    assigning an item.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {activeLocations.map(
                      (location) => {
                        const selected =
                          selectedLocationIds.includes(
                            location.id,
                          );

                        return (
                          <button
                            key={
                              location.id
                            }
                            type="button"
                            onClick={() =>
                              toggleLocation(
                                location.id,
                              )
                            }
                            className={`flex items-center justify-between gap-3 border px-3 py-3 text-left ${
                              selected
                                ? 'border-[#2e4057] bg-[#ddd0b8]'
                                : 'border-[#b7a87e] bg-[#f5f0e3] hover:bg-[#eae2ce]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-[9px]">
                                {
                                  location.name
                                }
                              </div>

                              <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                                {formatLocationType(
                                  location.locationType,
                                )}
                              </div>
                            </div>

                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                                selected
                                  ? 'border-[#2e4057] bg-[#2e4057] text-[#f5f0e3]'
                                  : 'border-[#b7a87e]'
                              }`}
                            >
                              {selected && (
                                <Check
                                  size={
                                    12
                                  }
                                  strokeWidth={
                                    2
                                  }
                                />
                              )}
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                )}

                {editingItem &&
                  existingLocationIds.length >
                    0 && (
                    <div className="mt-3 flex items-start gap-2 border border-dashed border-[#b7a87e] bg-[#eae2ce] px-3 py-2.5">
                      <Check
                        size={13}
                        strokeWidth={
                          1.7
                        }
                        className="mt-0.5 shrink-0 text-[#3d6b4f]"
                      />

                      <div className="font-mono text-[7px] leading-4 text-[#5b5346]">
                        Existing location
                        assignments are
                        preserved. New
                        selections will be
                        attached to this item.
                      </div>
                    </div>
                  )}
              </div>

              {/* FORM ACTIONS */}
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-dashed border-[#b7a87e] pt-5 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={saving}
                  className="border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest hover:bg-[#eae2ce] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    activeLocations.length ===
                      0 ||
                    selectedCount === 0 ||
                    Boolean(
                      editingItem &&
                        newLocationCount ===
                          0 &&
                        existingLocationIds.length ===
                          0,
                    )
                  }
                  className="flex items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-5 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620] disabled:cursor-not-allowed disabled:opacity-45"
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