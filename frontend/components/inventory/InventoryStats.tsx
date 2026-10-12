'use client';

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  PackageOpen,
  X,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { apiFetch } from '../../lib/api';

import type {
  InventorySummaryResponse,
  RegisterItem,
  RegisterResponse,
  Transaction,
  TransactionResponse,
} from '../../types/inventory';

type OrganizationLocation = {
  id: string;
  name: string;
  locationType: string;
};

type AlertType = 'reorder' | 'outOfStock' | null;

type ReorderLocation = {
  locationId: string;
  locationName: string;
  quantity: number;
  reorderLevel: number;
  shortfall: number;
  suggestedPurchase: number;
};

type ReorderItem = {
  item: RegisterItem;
  locations: ReorderLocation[];
  totalShortfall: number;
  totalSuggestedPurchase: number;
};

type OutOfStockItem = {
  item: RegisterItem;
  lastMovement: {
    transaction: Transaction;
    locationName: string;
  } | null;
};

export default function InventoryStats() {
  const [summary, setSummary] =
    useState<InventorySummaryResponse | null>(null);

  const [items, setItems] = useState<RegisterItem[]>([]);

  const [locations, setLocations] =
    useState<OrganizationLocation[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [alertType, setAlertType] =
    useState<AlertType>(null);

  const [selectedReorderItem, setSelectedReorderItem] =
    useState<ReorderItem | null>(null);

  const [selectedOutOfStockItem, setSelectedOutOfStockItem] =
    useState<OutOfStockItem | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Incremented whenever a transaction-history request is
  // started or cancelled (back / close). A response only
  // applies if its id still matches the current one.
  const requestIdRef = useRef(0);

  // --------------------------------------------------
  // LOAD DASHBOARD DATA
  // --------------------------------------------------

  useEffect(() => {
  let mounted = true;

  async function loadDashboardData(
    silent = false,
  ) {
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      }

      const token =
        window.localStorage.getItem('accessToken');

      if (!token) {
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      const [
        summaryResponse,
        registerResponse,
        locationResponse,
      ] = await Promise.all([
        apiFetch<InventorySummaryResponse>(
          '/inventory/summary',
          token,
        ),
        apiFetch<RegisterResponse>(
          '/inventory/register',
          token,
        ),
        apiFetch<
          | OrganizationLocation[]
          | { data: OrganizationLocation[] }
        >('/locations', token),
      ]);

      if (!mounted) {
        return;
      }

      const locationData =
        Array.isArray(locationResponse)
          ? locationResponse
          : locationResponse.data ?? [];

      // Avoid state updates if the underlying data has not changed.
      setSummary((current) =>
        JSON.stringify(current) ===
        JSON.stringify(summaryResponse)
          ? current
          : summaryResponse,
      );

      setItems((current) =>
        JSON.stringify(current) ===
        JSON.stringify(registerResponse.data)
          ? current
          : registerResponse.data,
      );

      setLocations((current) =>
        JSON.stringify(current) ===
        JSON.stringify(locationData)
          ? current
          : locationData,
      );

      setError('');
    } catch (err) {
      // Retain the existing data during a silent refresh failure.
      if (!mounted || silent) {
        return;
      }

      console.error(
        'Unable to load inventory dashboard:',
        err,
      );

      setError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load inventory dashboard.',
      );
    } finally {
      if (mounted && !silent) {
        setLoading(false);
      }
    }
  }

  const handleSilentRefresh = () => {
    void loadDashboardData(true);
  };

  void loadDashboardData(false);

  window.addEventListener(
    'stockpile:refresh',
    handleSilentRefresh,
  );

  return () => {
    mounted = false;

    window.removeEventListener(
      'stockpile:refresh',
      handleSilentRefresh,
    );

    // Release the pause if this component unmounts.
    window.dispatchEvent(
      new CustomEvent('stockpile:dashboard-interaction', {
        detail: {
          source: 'inventory-stats',
          active: false,
        },
      }),
    );
  };
}, []);


// --------------------------------------------------
// REORDER ITEMS
//
// An item appears once if at least one location has
// quantity at or below the item's reorder level.
//
// Reorder level belongs to the item, not the location.
// Out-of-stock items may also appear in this alert.
// --------------------------------------------------

const reorderItems = useMemo<ReorderItem[]>(() => {
  return items
    .map((item) => {
      const lowLocations =
        item.locationBreakdown.filter(
          (location) =>
            location.quantity <= item.reorderLevel,
        );

      if (lowLocations.length === 0) {
        return null;
      }

      const detailedLocations: ReorderLocation[] =
        lowLocations.map((location) => {
          const shortfall = Math.max(
            item.reorderLevel - location.quantity,
            0,
          );

          return {
            locationId: location.locationId,
            locationName: location.locationName,
            quantity: location.quantity,
            reorderLevel: item.reorderLevel,
            shortfall,
            suggestedPurchase: shortfall,
          };
        });

      return {
        item,
        locations: detailedLocations,

        totalShortfall: detailedLocations.reduce(
          (total, location) =>
            total + location.shortfall,
          0,
        ),

        totalSuggestedPurchase:
          detailedLocations.reduce(
            (total, location) =>
              total + location.suggestedPurchase,
            0,
          ),
      };
    })
    .filter(
      (entry): entry is ReorderItem =>
        entry !== null,
    );
}, [items]);
  // --------------------------------------------------
  // OUT OF STOCK ITEMS
  //
  // Organization-level stock must be exactly zero.
  // --------------------------------------------------

  const outOfStockItems = useMemo<OutOfStockItem[]>(() => {
    return items
      .filter((item) => item.quantity === 0)
      .map((item) => ({
        item,
        lastMovement: null,
      }));
  }, [items]);

  // --------------------------------------------------
  // CARD CLICK HANDLERS
  // --------------------------------------------------

  function openReorderDetails() {
    requestIdRef.current += 1;

    window.dispatchEvent(
    new CustomEvent('stockpile:dashboard-interaction', {
    detail: {
      source: 'inventory-stats',
      active: true,
    },
  }),
  );

    setAlertType('reorder');
    setSelectedOutOfStockItem(null);
    setDetailLoading(false);
    setDetailError('');
  }


  function openOutOfStockDetails() {
    requestIdRef.current += 1;
      
    window.dispatchEvent(
    new CustomEvent('stockpile:dashboard-interaction', {
    detail: {
      source: 'inventory-stats',
      active: true,
    },
  }),
  );

    setAlertType('outOfStock');
    setSelectedReorderItem(null);
    setDetailLoading(false);
    setDetailError('');
  }

  function closeDetails() {
    // Cancel any in-flight transaction request.
    requestIdRef.current += 1;

    window.dispatchEvent(
    new CustomEvent('stockpile:dashboard-interaction', {
      detail: {
        source: 'inventory-stats',
        active: false,
      },
    }),
  );

    setAlertType(null);
    setSelectedReorderItem(null);
    setSelectedOutOfStockItem(null);
    setDetailLoading(false);
    setDetailError('');
  }

  // --------------------------------------------------
  // SELECT REORDER ITEM
  // --------------------------------------------------

  function selectReorderItem(entry: ReorderItem) {
    setSelectedReorderItem(entry);
    setSelectedOutOfStockItem(null);
    setDetailError('');
  }

  // --------------------------------------------------
  // SELECT OUT-OF-STOCK ITEM
  //
  // Opens the detail panel immediately, then fetches
  // transaction history for all of the item's
  // locations and fills in the latest movement.
  // --------------------------------------------------

  async function selectOutOfStockItem(item: RegisterItem) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    // Show the panel right away so the loading and
    // error states are visible.
    setSelectedOutOfStockItem({
      item,
      lastMovement: null,
    });
    setDetailLoading(true);
    setDetailError('');

    try {
      const token =
        window.localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('Please sign in first.');
      }

      const locationResults = await Promise.all(
        item.locationBreakdown.map(async (location) => {
          try {
            const response =
              await apiFetch<TransactionResponse>(
                `/inventory/items/${item.id}/locations/${location.locationId}/transactions?page=1&pageSize=20`,
                token,
              );

            return {
              location,
              transactions: response.data,
            };
          } catch (fetchError) {
            console.error(
              `Unable to load transaction history for ${item.name} at ${location.locationName}:`,
              fetchError,
            );

            return {
              location,
              transactions: [] as Transaction[],
            };
          }
        }),
      );

      // The user went back or closed while loading.
      if (requestId !== requestIdRef.current) {
        return;
      }

      const allMovements = locationResults.flatMap(
        (result) =>
          result.transactions.map((transaction) => ({
            transaction,
            locationName: result.location.locationName,
          })),
      );

      allMovements.sort(
        (a, b) =>
          new Date(b.transaction.createdAt).getTime() -
          new Date(a.transaction.createdAt).getTime(),
      );

      setSelectedOutOfStockItem({
        item,
        lastMovement: allMovements[0] ?? null,
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setDetailError(
        err instanceof Error
          ? extractApiError(err.message)
          : 'Unable to load stock-out details.',
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setDetailLoading(false);
      }
    }
  }

  function backFromOutOfStockItem() {
    // Cancel any in-flight request so it cannot
    // reopen the panel after going back.
    requestIdRef.current += 1;

    setSelectedOutOfStockItem(null);
    setDetailLoading(false);
    setDetailError('');
  }

  // --------------------------------------------------
  // CARD VALUES
  // --------------------------------------------------

  const totals = summary?.totals;

  const reorderCount = reorderItems.length;
  const outOfStockCount = outOfStockItems.length;

  // Prefer the calculated counts when register data is
  // available, because they use the same logic shown in
  // the drill-down.
  const displayedReorderCount =
    items.length > 0
      ? reorderCount
      : totals?.lowStockItems ?? 0;

  const displayedOutOfStockCount =
    items.length > 0
      ? outOfStockCount
      : totals?.outOfStockItems ?? 0;

  return (
    <>
      {/* -------------------------------------------- */}
      {/* DASHBOARD STAT CARDS */}
      {/* -------------------------------------------- */}

      <section className="mt-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            value={
              loading
                ? '—'
                : String(totals?.activeItems ?? 0)
            }
            label="ITEMS LOGGED"
          />

          <StatCard
            value={
              loading ? '—' : String(locations.length)
            }
            label="LOCATIONS"
          />

          <StatCard
            value={
              loading
                ? '—'
                : formatCurrency(
                    totals?.totalInventoryValue ?? 0,
                  )
            }
            label="STOCK VALUE"
            valueClassName="text-[24px]"
          />

          <StatCard
            value={
              loading
                ? '—'
                : String(displayedReorderCount)
            }
            label="NEEDS REORDER"
            danger
            clickable={
              !loading && displayedReorderCount > 0
            }
            onClick={openReorderDetails}
          />

          <StatCard
            value={
              loading
                ? '—'
                : String(displayedOutOfStockCount)
            }
            label="OUT OF STOCK"
            critical
            clickable={
              !loading && displayedOutOfStockCount > 0
            }
            onClick={openOutOfStockDetails}
          />
        </div>

        {error && (
          <div className="mt-2 rounded-[12px] bg-[var(--danger-soft)] px-3 py-2">
            <div className="font-mono text-[9px] text-[var(--danger)]">
              {error}
            </div>
          </div>
        )}
      </section>

      {/* -------------------------------------------- */}
      {/* NEEDS REORDER MODAL */}
      {/* -------------------------------------------- */}

      {alertType === 'reorder' && (
        <ModalOverlay onClose={closeDetails}>
          {!selectedReorderItem ? (
            <div className="w-full max-w-[760px] border border-[#2b2620] bg-[#f5f0e3] shadow-[8px_10px_0_rgba(43,38,32,0.18)]">
              <ModalHeader
                eyebrow="INVENTORY ALERT"
                title="NEEDS REORDER"
                subtitle={`${reorderItems.length} distinct ${reorderItems.length === 1 ? 'item requires' : 'items require'} attention.`}
                onClose={closeDetails}
              />

              <div className="max-h-[65vh] overflow-y-auto">
                {reorderItems.length === 0 ? (
                  <EmptyState message="No items currently require reorder." />
                ) : (
                  reorderItems.map((entry) => (
                    <button
                      key={entry.item.id}
                      type="button"
                      onClick={() =>
                        selectReorderItem(entry)
                      }
                      className="flex w-full items-center justify-between border-b border-dashed border-[#b7a87e] px-5 py-4 text-left hover:bg-[#eae2ce]"
                    >
                      <div>
                        <div className="font-mono text-[10px]">
                          {entry.item.name}
                        </div>

                        <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                          {entry.item.sku}
                          {' · '}
                          {entry.locations.length}{' '}
                          low-stock{' '}
                          {entry.locations.length === 1
                            ? 'location'
                            : 'locations'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono text-[10px] text-[#a63a2e]">
                            {entry.totalShortfall}
                          </div>

                          <div className="font-mono text-[7px] text-[#5b5346]">
                            SHORTFALL
                          </div>
                        </div>

                        <ArrowRight
                          size={15}
                          strokeWidth={1.7}
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <ReorderDetailPanel
              entry={selectedReorderItem}
              onBack={() => setSelectedReorderItem(null)}
              onClose={closeDetails}
            />
          )}
        </ModalOverlay>
      )}

      {/* -------------------------------------------- */}
      {/* OUT OF STOCK MODAL */}
      {/* -------------------------------------------- */}

      {alertType === 'outOfStock' && (
        <ModalOverlay onClose={closeDetails}>
          {!selectedOutOfStockItem ? (
            <div className="w-full max-w-[760px] border border-[#2b2620] bg-[#f5f0e3] shadow-[8px_10px_0_rgba(43,38,32,0.18)]">
              <ModalHeader
                eyebrow="INVENTORY ALERT"
                title="OUT OF STOCK"
                subtitle={`${outOfStockItems.length} ${outOfStockItems.length === 1 ? 'item has' : 'items have'} reached zero organizational stock.`}
                onClose={closeDetails}
              />

              <div className="max-h-[65vh] overflow-y-auto">
                {outOfStockItems.length === 0 ? (
                  <EmptyState message="No items are currently out of stock." />
                ) : (
                  outOfStockItems.map((entry) => (
                    <button
                      key={entry.item.id}
                      type="button"
                      onClick={() =>
                        selectOutOfStockItem(entry.item)
                      }
                      className="flex w-full items-center justify-between border-b border-dashed border-[#b7a87e] px-5 py-4 text-left hover:bg-[#eae2ce]"
                    >
                      <div>
                        <div className="font-mono text-[10px]">
                          {entry.item.name}
                        </div>

                        <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                          {entry.item.sku}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono text-[10px] text-[#a63a2e]">
                            0
                          </div>

                          <div className="font-mono text-[7px] text-[#5b5346]">
                            ON HAND
                          </div>
                        </div>

                        <ArrowRight
                          size={15}
                          strokeWidth={1.7}
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <OutOfStockDetailPanel
              entry={selectedOutOfStockItem}
              loading={detailLoading}
              error={detailError}
              onBack={backFromOutOfStockItem}
              onClose={closeDetails}
            />
          )}
        </ModalOverlay>
      )}
    </>
  );
}

/* ================================================== */
/* STAT CARD                                           */
/* ================================================== */

function StatCard({
  value,
  label,
  danger = false,
  critical = false,
  clickable = false,
  onClick,
  valueClassName = 'text-[25px]',
}: {
  value: string;
  label: string;
  danger?: boolean;
  critical?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  valueClassName?: string;
}) {
  const isAlert = critical || danger;

  const textClass = isAlert
    ? 'text-[var(--danger)]'
    : 'text-[var(--navy)]';

  // Full class names are written out so Tailwind can
  // detect them at build time.
  const hoverClass = isAlert
    ? 'hover:bg-[var(--danger-soft)]'
    : 'hover:bg-[var(--surface)]';

  const Component = clickable ? 'button' : 'div';

  return (
    <Component
      type={clickable ? 'button' : undefined}
      onClick={clickable ? onClick : undefined}
      className={`group relative min-h-[118px] rounded-[12px] bg-[var(--surface)] px-4 py-4 text-left ${
        clickable
          ? `cursor-pointer transition-colors duration-150 ${hoverClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30`
          : ''
      }`}
    >
      <div className="font-mono text-[9px] font-medium tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </div>

      <div
        className={`mt-3 font-sans font-semibold leading-none tracking-[-0.025em] ${valueClassName} ${textClass}`}
      >
        {value}
      </div>

      {clickable && (
        <ArrowUpRight
          size={13}
          strokeWidth={1.7}
          className="absolute right-3 top-3 text-[var(--text-soft)] opacity-60 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
    </Component>
  );
}
/* ================================================== */
/* MODAL OVERLAY                                       */
/* ================================================== */

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-[#2b2620]/45"
      />

      <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-4">
        {children}
      </div>
    </>
  );
}

/* ================================================== */
/* MODAL HEADER                                        */
/* ================================================== */

function ModalHeader({
  eyebrow,
  title,
  subtitle,
  onClose,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between border-b border-dashed border-[#b7a87e] px-5 py-4">
      <div>
        <div className="font-mono text-[7px] tracking-widest text-[#a63a2e]">
          {eyebrow}
        </div>

        <h2 className="mt-1 font-mono text-[19px]">
          {title}
        </h2>

        <p className="mt-1 font-mono text-[7px] text-[#5b5346]">
          {subtitle}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-[#5b5346] hover:text-[#2b2620]"
        aria-label="Close"
      >
        <X size={18} strokeWidth={1.7} />
      </button>
    </div>
  );
}

/* ================================================== */
/* REORDER DETAIL                                      */
/* ================================================== */

function ReorderDetailPanel({
  entry,
  onBack,
  onClose,
}: {
  entry: ReorderItem;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="w-full max-w-[820px] border border-[#2b2620] bg-[#f5f0e3] shadow-[8px_10px_0_rgba(43,38,32,0.18)]">
      <ModalHeader
        eyebrow="REORDER DETAIL"
        title={entry.item.name}
        subtitle={`${entry.item.sku} · ${entry.locations.length} location${entry.locations.length === 1 ? '' : 's'} require attention.`}
        onClose={onClose}
      />

      <div className="max-h-[70vh] overflow-y-auto p-5">
        <div className="space-y-3">
          {entry.locations.map((location) => (
            <div
              key={location.locationId}
              className="border border-[#b7a87e]"
            >
              {/* LOCATION */}
              <div className="border-b border-dashed border-[#b7a87e] px-4 py-3">
                <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                  AFFECTED LOCATION
                </div>

                <div className="mt-1 font-mono text-[14px]">
                  {location.locationName}
                </div>
              </div>

              {/* STOCK SUMMARY */}
              <div className="grid gap-2 p-4 sm:grid-cols-4">
                <DetailBox
                  label="CURRENT"
                  value={`${location.quantity} ${entry.item.unitOfMeasure}`}
                />

                <DetailBox
                  label="REORDER LEVEL"
                  value={`${location.reorderLevel} ${entry.item.unitOfMeasure}`}
                />

                <DetailBox
                  label="SHORTFALL"
                  value={`${location.shortfall} ${entry.item.unitOfMeasure}`}
                  danger
                />

                <DetailBox
                  label="UNIT PRICE"
                  value={formatCurrency(
                    entry.item.unitPrice,
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        {/* REPLENISHMENT */}
        <div className="mt-5">
          <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
            REPLENISHMENT REQUIRED
          </div>

          <div className="mt-2 border border-[#b7a87e] bg-[#ddd0b8] p-4">
            <div className="font-mono text-[7px] tracking-widest text-[#9b681b]">
              SUGGESTED PURCHASE
            </div>

            <div className="mt-1 font-mono text-[18px] text-[#9b681b]">
              {entry.totalSuggestedPurchase}{' '}
              {entry.item.unitOfMeasure}
            </div>

            <div className="mt-2 font-mono text-[8px] text-[#5b5346]">
              Replenish the affected location to its
              reorder level.
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-5 flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="border border-[#2b2620] px-3 py-2 font-mono text-[8px] tracking-widest hover:bg-[#eae2ce]"
          >
            ← BACK
          </button>

          <button
            type="button"
            onClick={onClose}
            className="border-2 border-[#2e4057] bg-[#2e4057] px-3 py-2 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================== */
/* OUT OF STOCK DETAIL                                 */
/* ================================================== */

function OutOfStockDetailPanel({
  entry,
  loading,
  error,
  onBack,
  onClose,
}: {
  entry: OutOfStockItem;
  loading: boolean;
  error: string;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="w-full max-w-[760px] border border-[#2b2620] bg-[#f5f0e3] shadow-[8px_10px_0_rgba(43,38,32,0.18)]">
      <ModalHeader
        eyebrow="STOCK-OUT DETAIL"
        title={entry.item.name}
        subtitle={`${entry.item.sku} · organizational stock has reached zero.`}
        onClose={onClose}
      />

      <div className="p-5">
        <div className="grid gap-2 sm:grid-cols-4">
          <DetailBox
            label="CURRENT STOCK"
            value={`0 ${entry.item.unitOfMeasure}`}
            danger
          />

          <DetailBox
            label="REORDER LEVEL"
            value={`${entry.item.reorderLevel} ${entry.item.unitOfMeasure}`}
          />

          <DetailBox
            label="LOCATIONS"
            value={String(entry.item.locations)}
          />

          <DetailBox
            label="UNIT PRICE"
            value={formatCurrency(entry.item.unitPrice)}
          />
        </div>

        <div className="mt-5 border-t border-dashed border-[#b7a87e] pt-4">
          <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
            LAST MOVEMENT
          </div>

          {loading ? (
            <div className="mt-3 border border-dashed border-[#b7a87e] p-4 text-center font-mono text-[8px] text-[#5b5346]">
              LOADING TRANSACTION HISTORY...
            </div>
          ) : error ? (
            <div className="mt-3 border border-[#a63a2e] bg-[#a63a2e]/5 px-3 py-3 font-mono text-[8px] text-[#a63a2e]">
              {error}
            </div>
          ) : !entry.lastMovement ? (
            <div className="mt-3 border border-dashed border-[#b7a87e] p-4 text-center font-mono text-[8px] italic text-[#5b5346]">
              No transaction history was found for this
              item.
            </div>
          ) : (
            <div className="mt-3 border border-[#b7a87e]">
              <div className="grid gap-0 sm:grid-cols-2">
                <DetailBox
                  label="LOCATION"
                  value={entry.lastMovement.locationName}
                />

                <DetailBox
                  label="DATE"
                  value={formatDateTime(
                    entry.lastMovement.transaction
                      .createdAt,
                  )}
                />

                <DetailBox
                  label="ACTION"
                  value={formatAction(
                    entry.lastMovement.transaction.txnType,
                  )}
                />

                <DetailBox
                  label="QUANTITY"
                  value={`${entry.lastMovement.transaction.quantity > 0 ? '+' : ''}${entry.lastMovement.transaction.quantity}`}
                  danger={
                    entry.lastMovement.transaction
                      .quantity < 0
                  }
                />
              </div>

              <div className="border-t border-dashed border-[#b7a87e] p-3">
                <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                  REFERENCE
                </div>

                <div className="mt-1 font-mono text-[9px]">
                  {entry.lastMovement.transaction
                    .reference ?? '—'}
                </div>
              </div>

              {entry.lastMovement.transaction.notes && (
                <div className="border-t border-dashed border-[#b7a87e] p-3">
                  <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                    NOTES
                  </div>

                  <div className="mt-1 font-mono text-[8px]">
                    {entry.lastMovement.transaction.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-dashed border-[#b7a87e] pt-4">
          <div className="flex items-start gap-3 border border-[#a63a2e] bg-[#a63a2e]/5 px-3 py-3">
            <PackageOpen
              size={17}
              className="shrink-0 text-[#a63a2e]"
              strokeWidth={1.7}
            />

            <div>
              <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                REPLENISHMENT REQUIRED
              </div>

              <div className="mt-1 font-mono text-[9px] text-[#a63a2e]">
                Suggested initial replenishment:{' '}
                {entry.item.reorderLevel}{' '}
                {entry.item.unitOfMeasure}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="border border-[#2b2620] px-3 py-2 font-mono text-[8px] tracking-widest hover:bg-[#eae2ce]"
          >
            ← BACK
          </button>

          <button
            type="button"
            onClick={onClose}
            className="border-2 border-[#2e4057] bg-[#2e4057] px-3 py-2 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================== */
/* SMALL DETAIL COMPONENTS                             */
/* ================================================== */

function DetailBox({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="border border-[#b7a87e] p-3">
      <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-[10px] ${
          danger ? 'text-[#a63a2e]' : 'text-[#2b2620]'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-8 text-center">
      <AlertTriangle
        size={22}
        className="mx-auto text-[#5b5346]"
        strokeWidth={1.5}
      />

      <div className="mt-3 font-mono text-[9px] text-[#5b5346]">
        {message}
      </div>
    </div>
  );
}

/* ================================================== */
/* FORMATTERS                                          */
/* ================================================== */

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatAction(action: string) {
  switch (action) {
    case 'receive':
      return 'RECEIVE';

    case 'issue':
      return 'ISSUE';

    case 'transfer':
      return 'TRANSFER';

    case 'adjustment':
      return 'ADJUST';

    case 'opening_balance':
      return 'OPENING';

    default:
      return action.toUpperCase();
  }
}

function extractApiError(message: string) {
  try {
    const parsed = JSON.parse(message);

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }

    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    // Keep original message.
  }

  return message;
}
