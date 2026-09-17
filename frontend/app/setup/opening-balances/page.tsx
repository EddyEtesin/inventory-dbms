'use client';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  MapPin,
  Package,
  Save,
  X,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { apiFetch } from '../../../lib/api';

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

type Location = {
  id: string;
  name: string;
  locationType: string;
  parentId?: string | null;
  status: string;
};

type LocationInventoryRow = {
  id: string;
  itemId: string;
  locationId: string;
  quantity: number;

  item: {
    id: string;
    sku: string;
    name: string;
    unitOfMeasure: string;
    unitPrice: string | number;
    status: string;
  };
};

type QuantityMap = Record<string, string>;

type SaveResult = {
  itemId: string;
  itemName: string;
  quantity: number;
  success: boolean;
  error?: string;
};

function extractApiError(message: string) {
  try {
    const parsed = JSON.parse(message);

    if (Array.isArray(parsed?.message)) {
      return parsed.message.join(' ');
    }

    if (typeof parsed?.message === 'string') {
      return parsed.message;
    }

    if (typeof parsed?.error === 'string') {
      return parsed.error;
    }
  } catch {
    // Message was not JSON.
  }

  return message;
}

function normaliseList<T>(
  response:
    | T[]
    | {
        data?: T[];
      },
) {
  return Array.isArray(response)
    ? response
    : response.data ?? [];
}

export default function OpeningBalancesPage() {
  const router = useRouter();

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [locations, setLocations] =
    useState<Location[]>([]);

  const [locationInventory, setLocationInventory] =
    useState<LocationInventoryRow[]>([]);

  const [selectedLocationId, setSelectedLocationId] =
    useState('');

  const [quantities, setQuantities] =
    useState<QuantityMap>({});

  const [reference, setReference] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [loadingInventory, setLoadingInventory] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [saveResults, setSaveResults] =
    useState<SaveResult[]>([]);

  async function loadLocations() {
    const token =
      window.localStorage.getItem('accessToken');

    if (!token) {
      router.push('/login');
      return;
    }

    const response =
      await apiFetch<
        Location[] | { data?: Location[] }
      >('/locations', token);

    setLocations(
      normaliseList(response).filter(
        (location) =>
          location.status === 'active',
      ),
    );
  }

  async function loadLocationInventory(
    locationId: string,
  ) {
    if (!locationId) {
      setLocationInventory([]);
      setQuantities({});
      return;
    }

    const token =
      window.localStorage.getItem('accessToken');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setLoadingInventory(true);
      setError('');
      setSuccessMessage('');
      setSaveResults([]);

      const response =
        await apiFetch<
          LocationInventoryRow[]
        >(
          `/inventory/locations/${locationId}`,
          token,
        );

      setLocationInventory(response);

      /*
       * Only rows returned by the location inventory
       * endpoint are shown. Those rows represent real
       * ITEM_LOCATION relationships.
       *
       * Blank means "do not initialize this item".
       */
      const nextQuantities: QuantityMap = {};

      for (const row of response) {
        if (row.quantity === 0) {
          nextQuantities[row.item.id] =
            '';
        }
      }

      setQuantities(nextQuantities);
    } catch (err) {
      setLocationInventory([]);
      setQuantities({});

      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load this location inventory.',
      );
    } finally {
      setLoadingInventory(false);
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

        const [me, locationResponse] =
          await Promise.all([
            apiFetch<CurrentUserResponse>(
              '/auth/me',
              token,
            ),

            apiFetch<
              Location[] | { data?: Location[] }
            >('/locations', token),
          ]);

        setOrganization(me.organization);

        setLocations(
          normaliseList(
            locationResponse,
          ).filter(
            (location) =>
              location.status === 'active',
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? extractApiError(err.message)
            : 'Unable to load opening balance setup.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadSetup();
  }, [router]);

  useEffect(() => {
    if (!selectedLocationId) {
      setLocationInventory([]);
      setQuantities({});
      return;
    }

    loadLocationInventory(
      selectedLocationId,
    );
  }, [selectedLocationId]);

  const selectedLocation = useMemo(
    () =>
      locations.find(
        (location) =>
          location.id ===
          selectedLocationId,
      ) ?? null,
    [locations, selectedLocationId],
  );

  const initializedCount =
    locationInventory.filter(
      (row) => row.quantity > 0,
    ).length;

  const pendingRows =
    locationInventory.filter(
      (row) => {
        if (row.quantity > 0) {
          return false;
        }

        const value =
          quantities[row.item.id];

        if (!value) {
          return false;
        }

        const parsed = Number(value);

        return (
          Number.isInteger(parsed) &&
          parsed > 0
        );
      },
    );

  function updateQuantity(
    itemId: string,
    value: string,
  ) {
    if (value === '') {
      setQuantities((current) => ({
        ...current,
        [itemId]: '',
      }));

      return;
    }

    if (!/^\d+$/.test(value)) {
      return;
    }

    setQuantities((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  function changeLocation(
    locationId: string,
  ) {
    setSelectedLocationId(locationId);
    setReference('');
    setNotes('');
    setError('');
    setSuccessMessage('');
    setSaveResults([]);
  }

  async function handleSave() {
    if (!selectedLocationId) {
      setError(
        'Select a location before entering opening balances.',
      );
      return;
    }

    if (pendingRows.length === 0) {
      setError(
        'Enter a positive whole-number opening quantity for at least one attached item.',
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');
      setSaveResults([]);

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      const results: SaveResult[] = [];

      /*
       * Each item-location pair gets its own request and
       * its own idempotency key.
       *
       * This is important because the backend's normal
       * stock/receive validation requires an idempotency
       * key, and a separate key prevents accidental replay
       * of a different row.
       */
      for (const row of pendingRows) {
        const quantity = Number(
          quantities[row.item.id],
        );

        try {
          await apiFetch(
            `/inventory/items/${row.item.id}/locations/${selectedLocationId}/opening-balance`,
            token,
            {
              method: 'POST',
              body: JSON.stringify({
                quantity,
                idempotencyKey:
                  crypto.randomUUID(),
                ...(reference.trim()
                  ? {
                      reference:
                        reference.trim(),
                    }
                  : {}),
                ...(notes.trim()
                  ? {
                      notes: notes.trim(),
                    }
                  : {}),
              }),
            },
          );

          results.push({
            itemId: row.item.id,
            itemName: row.item.name,
            quantity,
            success: true,
          });
        } catch (err) {
          results.push({
            itemId: row.item.id,
            itemName: row.item.name,
            quantity,
            success: false,
            error:
              err instanceof Error
                ? extractApiError(
                    err.message,
                  )
                : 'Unable to save this opening balance.',
          });
        }
      }

      setSaveResults(results);

      const successful =
        results.filter(
          (result) => result.success,
        ).length;

      const failed =
        results.length - successful;

      if (failed === 0) {
        setSuccessMessage(
          `${successful} ${
            successful === 1
              ? 'opening balance'
              : 'opening balances'
          } posted to the inventory ledger.`,
        );
      } else {
        setSuccessMessage(
          `${successful} ${
            successful === 1
              ? 'opening balance'
              : 'opening balances'
          } posted. ${failed} failed.`,
        );
      }

      /*
       * Pull the database state again. This is deliberately
       * not a local-only register. What you see after saving
       * comes back from ITEM_LOCATION.
       */
      await loadLocationInventory(
        selectedLocationId,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to save opening balances.',
      );
    } finally {
      setSaving(false);
    }
  }

  const industryLabel =
    organization?.industryType
      ? organization.industryType
          .replace(/_/g, ' ')
          .toUpperCase()
      : 'ORGANIZATION';

  return (
    <main className="min-h-screen bg-[#ddd0b8] px-4 py-6 text-[#2b2620]">
      <div className="mx-auto max-w-[1150px]">
        {/* HEADER */}
        <header className="border border-[#b7a87e] bg-[#f5f0e3] px-5 py-4 shadow-[0_2px_0_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[8px] tracking-[0.18em] text-[#5b5346]">
                INVENTORY MANAGEMENT SYSTEM
              </div>

              <div className="mt-1 font-mono text-[19px] tracking-[0.05em]">
                INVENTORY LEDGER
              </div>
            </div>

            <div className="hidden border-2 border-[#a63a2e] px-2.5 py-1 font-mono text-[7px] tracking-widest text-[#a63a2e] sm:block">
              OPENING BALANCE
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
                  SETUP · 05 / 05
                </div>

                <h1 className="mt-1 font-mono text-[28px] leading-tight">
                  Opening Balances
                </h1>

                <p className="mt-2 max-w-2xl font-mono text-[9px] text-[#5b5346]">
                  Establish the starting stock
                  position for each location.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      '/setup/items',
                    )
                  }
                  className="flex items-center justify-center gap-2 border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest hover:bg-[#eae2ce]"
                >
                  <ArrowLeft
                    size={14}
                    strokeWidth={1.7}
                  />
                  PREVIOUS · ITEMS
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push('/')
                  }
                  className="border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]"
                >
                  GO TO DASHBOARD
                </button>
              </div>
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
                    : organization?.name ?? '—'}
                </div>
              </div>

              <div className="border border-[#2e4057] bg-[#2e4057] p-4 text-[#f5f0e3]">
                <div className="font-mono text-[7px] tracking-widest text-[#ddd0b8]">
                  INDUSTRY
                </div>

                <div className="mt-1 font-mono text-[13px] text-[#c68a2e]">
                  {industryLabel}
                </div>
              </div>
            </div>

            {/* MESSAGE */}
            {(error || successMessage) && (
              <div
                className={`mt-4 border px-4 py-3 ${
                  error
                    ? 'border-[#a63a2e] bg-[#a63a2e]/5'
                    : 'border-[#3d6b4f] bg-[#3d6b4f]/5'
                }`}
              >
                <div
                  className={`font-mono text-[8px] ${
                    error
                      ? 'text-[#a63a2e]'
                      : 'text-[#3d6b4f]'
                  }`}
                >
                  {error || successMessage}
                </div>
              </div>
            )}

            {/* LOCATION SELECTOR */}
            <div className="mt-6 border border-[#b7a87e]">
              <div className="flex items-center justify-between bg-[#ddd0b8] px-4 py-3">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[7px] tracking-widest text-[#5b5346]">
                    <MapPin
                      size={13}
                      strokeWidth={1.6}
                    />
                    STEP 1 · SELECT LOCATION
                  </div>

                  <div className="mt-1 font-mono text-[16px]">
                    {selectedLocation?.name ??
                      'Choose a stock location'}
                  </div>
                </div>

                {selectedLocation && (
                  <div className="hidden border border-[#2e4057] px-2 py-1 font-mono text-[7px] tracking-widest text-[#2e4057] sm:block">
                    {selectedLocation.locationType.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="relative">
                  <select
                    value={selectedLocationId}
                    onChange={(event) =>
                      changeLocation(
                        event.target.value,
                      )
                    }
                    className="w-full appearance-none border-b border-[#2b2620] bg-transparent px-1 py-2 pr-8 font-mono text-[10px] outline-none"
                  >
                    <option value="">
                      SELECT ACTIVE LOCATION
                    </option>

                    {locations.map(
                      (location) => (
                        <option
                          key={location.id}
                          value={location.id}
                        >
                          {location.name} ·{' '}
                          {location.locationType.toUpperCase()}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown
                    size={14}
                    strokeWidth={1.6}
                    className="pointer-events-none absolute right-1 top-2 text-[#5b5346]"
                  />
                </div>

                <div className="mt-3 font-mono text-[7px] leading-4 text-[#5b5346]">
                  The register below is populated
                  from the item-location records that
                  already belong to this location.
                </div>
              </div>
            </div>

            {/* REGISTER */}
            <div className="mt-6">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-[8px] text-[#5b5346]">
                    {locationInventory.length}{' '}
                    ATTACHED ITEMS
                  </div>

                  <h2 className="mt-1 font-mono text-[18px]">
                    OPENING STOCK REGISTER
                  </h2>
                </div>

                {selectedLocation &&
                  locationInventory.length >
                    0 && (
                    <div className="font-mono text-[7px] text-[#3d6b4f]">
                      {initializedCount}{' '}
                      INITIALIZED
                    </div>
                  )}
              </div>

              <div className="overflow-hidden border border-[#b7a87e]">
                {!selectedLocationId ? (
                  <div className="px-5 py-12 text-center">
                    <MapPin
                      size={28}
                      strokeWidth={1.4}
                      className="mx-auto text-[#b7a87e]"
                    />

                    <div className="mt-3 font-mono text-[10px]">
                      Select a location first.
                    </div>

                    <div className="mt-1 font-mono text-[8px] text-[#5b5346]">
                      Only items attached to that
                      location will appear here.
                    </div>
                  </div>
                ) : loadingInventory ? (
                  <div className="px-4 py-10 text-center font-mono text-[8px] text-[#5b5346]">
                    READING LOCATION INVENTORY...
                  </div>
                ) : locationInventory.length ===
                  0 ? (
                  <div className="px-5 py-12 text-center">
                    <Package
                      size={28}
                      strokeWidth={1.4}
                      className="mx-auto text-[#b7a87e]"
                    />

                    <div className="mt-3 font-mono text-[10px]">
                      No items are attached to
                      this location.
                    </div>

                    <div className="mt-1 font-mono text-[8px] leading-4 text-[#5b5346]">
                      Return to Item Setup and
                      attach items to this stock
                      location first.
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          '/setup/items',
                        )
                      }
                      className="mt-4 border border-[#2b2620] px-4 py-2 font-mono text-[8px] tracking-widest hover:bg-[#2e4057] hover:text-[#f5f0e3]"
                    >
                      BACK TO ITEMS
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="hidden grid-cols-[125px_minmax(200px,1.7fr)_100px_110px_140px] gap-3 border-b border-[#b7a87e] bg-[#ddd0b8] px-4 py-2.5 font-mono text-[7px] tracking-widest text-[#5b5346] md:grid">
                      <span>SKU</span>
                      <span>ITEM</span>
                      <span>UNIT</span>
                      <span>CURRENT</span>
                      <span>OPENING QTY</span>
                    </div>

                    {locationInventory.map(
                      (row) => {
                        const initialized =
                          row.quantity > 0;

                        const result =
                          saveResults.find(
                            (entry) =>
                              entry.itemId ===
                              row.item.id,
                          );

                        return (
                          <div
                            key={row.id}
                            className="border-b border-dashed border-[#b7a87e] px-4 py-4 last:border-b-0 hover:bg-[#eae2ce]"
                          >
                            <div className="grid gap-3 md:grid-cols-[125px_minmax(200px,1.7fr)_100px_110px_140px] md:items-center">
                              <div className="font-mono text-[8px] font-bold text-[#2e4057]">
                                {row.item.sku}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate font-mono text-[10px]">
                                  {row.item.name}
                                </div>

                                <div className="mt-0.5 font-mono text-[7px] text-[#5b5346]">
                                  {initialized
                                    ? 'OPENING BALANCE POSTED'
                                    : 'AWAITING OPENING BALANCE'}
                                </div>
                              </div>

                              <div className="font-mono text-[8px] uppercase text-[#5b5346]">
                                {row.item.unitOfMeasure}
                              </div>

                              <div className="font-mono text-[10px]">
                                {initialized ? (
                                  <span className="text-[#3d6b4f]">
                                    {row.quantity}
                                  </span>
                                ) : (
                                  <span className="text-[#8d806b]">
                                    0
                                  </span>
                                )}
                              </div>

                              <div>
                                {initialized ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 border border-[#3d6b4f] px-2 py-1 font-mono text-[7px] tracking-widest text-[#3d6b4f]">
                                      <Check
                                        size={11}
                                        strokeWidth={1.8}
                                      />
                                      INITIALIZED
                                    </span>

                                    <div className="mt-1 font-mono text-[6px] text-[#5b5346]">
                                      Use RECEIVE for
                                      later stock
                                      additions.
                                    </div>
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                      quantities[
                                        row.item.id
                                      ] ??
                                      ''
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      updateQuantity(
                                        row.item.id,
                                        event.target
                                          .value,
                                      )
                                    }
                                    placeholder="0"
                                    className="w-full max-w-[140px] border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[10px] outline-none focus:border-[#c68a2e]"
                                  />
                                )}

                                {result && (
                                  <div
                                    className={`mt-1 font-mono text-[7px] ${
                                      result.success
                                        ? 'text-[#3d6b4f]'
                                        : 'text-[#a63a2e]'
                                    }`}
                                  >
                                    {result.success
                                      ? '✓ SAVED TO LEDGER'
                                      : `✕ ${
                                          result.error ??
                                          'FAILED'
                                        }`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </>
                )}
              </div>
            </div>

            {/* REFERENCE / NOTES */}
            {selectedLocationId &&
              locationInventory.length >
                0 && (
                <div className="mt-5 border-t border-dashed border-[#b7a87e] pt-5">
                  <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                    LEDGER RECORD DETAILS
                  </div>

                  <div className="mt-3 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                        REFERENCE
                      </label>

                      <input
                        type="text"
                        value={reference}
                        onChange={(event) =>
                          setReference(
                            event.target.value,
                          )
                        }
                        placeholder="OPENING STOCK COUNT"
                        className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[9px] outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                        NOTES
                      </label>

                      <input
                        type="text"
                        value={notes}
                        onChange={(event) =>
                          setNotes(
                            event.target.value,
                          )
                        }
                        placeholder="Physical count completed..."
                        className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[9px] outline-none"
                      />
                    </div>
                  </div>

                  {/* SAVE BAR */}
                  <div className="mt-5 flex flex-col gap-3 border-t border-dashed border-[#b7a87e] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-mono text-[7px] leading-4 text-[#5b5346]">
                      {pendingRows.length > 0
                        ? `${pendingRows.length} row${
                            pendingRows.length ===
                            1
                              ? ''
                              : 's'
                          } ready to post for ${
                            selectedLocation?.name ??
                            'this location'
                          }.`
                        : initializedCount ===
                          locationInventory.length
                        ? 'All attached items at this location have been initialized.'
                        : 'Enter quantities for the items that currently have stock.'}
                    </div>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={
                        saving ||
                        pendingRows.length === 0
                      }
                      className="flex items-center justify-center gap-2 border-2 border-[#2e4057] bg-[#2e4057] px-5 py-3 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Save
                        size={13}
                        strokeWidth={1.7}
                      />

                      {saving
                        ? 'POSTING TO LEDGER...'
                        : `POST ${
                            pendingRows.length
                          } ${
                            pendingRows.length ===
                            1
                              ? 'OPENING BALANCE'
                              : 'OPENING BALANCES'
                          }`}
                    </button>
                  </div>
                </div>
              )}

            {/* HOW IT WORKS */}
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="border border-dashed border-[#b7a87e] p-4">
                <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                  WORKFLOW
                </div>

                <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                  ITEM
                  <br />
                  ↓
                  <br />
                  ATTACH TO LOCATION
                  <br />
                  ↓
                  <br />
                  OPENING BALANCE
                  <br />
                  ↓
                  <br />
                  INVENTORY LEDGER
                </div>
              </div>

              <div className="border border-dashed border-[#b7a87e] p-4">
                <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                  IMPORTANT
                </div>

                <div className="mt-3 font-mono text-[8px] leading-5 text-[#5b5346]">
                  An item may exist in more than
                  one location. Each location has
                  its own balance. Once an opening
                  balance is posted, use RECEIVE,
                  ISSUE, ADJUST or TRANSFER for
                  subsequent stock movements.
                </div>
              </div>
            </div>

            {/* NAVIGATION */}
            <div className="mt-6 flex flex-col gap-2 border-t border-dashed border-[#b7a87e] pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/setup/items',
                  )
                }
                className="flex items-center justify-center gap-2 border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest hover:bg-[#eae2ce]"
              >
                <ArrowLeft
                  size={14}
                  strokeWidth={1.7}
                />
                BACK · ITEMS
              </button>

              <button
                type="button"
                onClick={async () => {
                  const token =
                    window.localStorage.getItem('accessToken');

                  if (!token) {
                    router.push('/login');
                    return;
                  }

                  try {
                    setError('');

                    await apiFetch(
                      '/auth/setup/complete',
                      token,
                      {
                        method: 'POST',
                      },
                    );

                    router.push('/');
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? extractApiError(err.message)
                        : 'Unable to complete setup.',
                    );
                  }
                }}
                className="flex items-center justify-center gap-2 border-2 border-[#3d6b4f] bg-[#3d6b4f] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:opacity-90"
              >
                FINISH SETUP · DASHBOARD
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
          <div className="flex justify-between">
            <span>
              INVENTORY LEDGER · OPENING BALANCE
            </span>

            <span>
              {organization?.name ??
                'ORGANIZATION'}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}