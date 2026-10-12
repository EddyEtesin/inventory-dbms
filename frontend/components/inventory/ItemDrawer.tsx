'use client';

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
} from 'react';

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ChevronDown,
  FileText,
  X,
} from 'lucide-react';

import type {
  Operation,
  RegisterItem,
  Transaction,
} from '../../types/inventory';

type OrganizationLocation = {
  id: string;
  name: string;
  locationType: string;
  status: string;
};

type ItemDrawerProps = {
  selectedItem: RegisterItem | null;

  organizationLocations: OrganizationLocation[];

  operation: Operation;

  operationLocationId: string;
  targetLocationId: string;

  quantity: string;
  notes: string;

  submitting: boolean;
  operationError: string;

  transactions: Transaction[];
  transactionLoading: boolean;
  transactionLocationId: string | null;
  transactionPage: number;
  transactionTotalPages: number;
  hasNextTransactionPage: boolean;
  hasPreviousTransactionPage: boolean;

  onClose: () => void;

  onViewLocationTransactions: (
    locationId: string,
  ) => void;

  onViewAllTransactions: () => void;

  onStartOperation: (
    operation: Operation,
  ) => void;

  onOperationSubmit: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;

  onOperationCancel: () => void;

  onOperationLocationChange: (
    locationId: string,
  ) => void;

  onTargetLocationChange: (
    locationId: string,
  ) => void;

  onQuantityChange: (
    quantity: string,
  ) => void;

  onNotesChange: (
    notes: string,
  ) => void;

  onPreviousPage: () => void;
  onNextPage: () => void;

  onEdit?: () => void;
  onArchive?: () => void;
  itemArchived?: boolean;
};

export default function ItemDrawer({
  selectedItem,
  organizationLocations,

  operation,
  operationLocationId,
  targetLocationId,

  quantity,
  notes,

  submitting,
  operationError,

  transactions,
  transactionLoading,
  transactionLocationId,
  transactionPage,
  transactionTotalPages,
  hasNextTransactionPage,
  hasPreviousTransactionPage,

  onClose,

  onViewLocationTransactions,
  onViewAllTransactions,

  onStartOperation,
  onOperationSubmit,
  onOperationCancel,

  onOperationLocationChange,
  onTargetLocationChange,

  onQuantityChange,
  onNotesChange,

  onPreviousPage,
  onNextPage,

  onEdit,
  onArchive,
  itemArchived = false,
}: ItemDrawerProps) {
  /*
   * --------------------------------------------------
   * DRAWER SCROLL LOCK
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const previousBodyOverflow =
      document.body.style.overflow;

    const previousHtmlOverflow =
      document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow =
      'hidden';

    return () => {
      document.body.style.overflow =
        previousBodyOverflow;

      document.documentElement.style.overflow =
        previousHtmlOverflow;
    };
  }, [selectedItem]);

  /*
   * --------------------------------------------------
   * OPERATION LOCATION DATA
   * --------------------------------------------------
   */

  const selectedOperationLocation =
    selectedItem?.locationBreakdown.find(
      (location) =>
        location.locationId ===
        operationLocationId,
    );

  const selectedTargetLocation =
    selectedItem?.locationBreakdown.find(
      (location) =>
        location.locationId ===
        targetLocationId,
    );

  const selectedTargetQuantity =
    selectedTargetLocation?.quantity ?? 0;

  /*
   * --------------------------------------------------
   * RENDER
   * --------------------------------------------------
   */

  if (!selectedItem) {
    return null;
  }

  return (
    <>
      {/* DRAWER BACKDROP */}
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[#2b2620]/30"
      />

      {/* DRAWER */}
      <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-[470px] overflow-y-auto border-l border-[#c8bda5] bg-[#f5f0e3] shadow-[-8px_0_24px_rgba(43,38,32,0.12)]">
        <div className="p-5">

          {/* CLOSE */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center text-[#5b5346] hover:bg-[#eae2ce] hover:text-[#2b2620]"
            aria-label="Close"
          >
            <X
              size={18}
              strokeWidth={1.6}
            />
          </button>

          {/* ITEM HEADER */}
          <div className="pr-10">
            <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
              ITEM RECORD
            </div>

            <h2 className="mt-1 font-mono text-[20px] leading-6">
              {selectedItem.name}
            </h2>

            <div className="mt-1 font-mono text-[9px] text-[#5b5346]">
              {selectedItem.sku} ·{' '}
              {selectedItem.category?.name ??
                'UNCATEGORIZED'}
            </div>
          </div>

          {/* STOCK SUMMARY */}
          <div className="mt-5 border-t border-dashed border-[#d0c4aa] pt-4">
            <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
              STOCK SUMMARY
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <DetailBox
                label="TOTAL QTY"
                value={`${selectedItem.quantity} ${selectedItem.unitOfMeasure}`}
              />

              <DetailBox
                label="LOCATIONS"
                value={String(
                  selectedItem.locations,
                )}
              />

              <DetailBox
                label="REORDER LEVEL"
                value={String(
                  selectedItem.reorderLevel,
                )}
              />

              <DetailBox
                label="UNIT PRICE"
                value={formatCurrency(
                  selectedItem.unitPrice,
                )}
              />
            </div>
          </div>

          {/* STOCK BY LOCATION */}
          <div className="mt-5 border-t border-dashed border-[#d0c4aa] pt-4">
            <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
              STOCK BY LOCATION
            </div>

            <div className="mt-2 overflow-hidden border border-[#c8bda5]">
              {/* HEADER */}
              <div className="grid grid-cols-[1fr_65px] border-b border-[#c8bda5] bg-[#ddd0b8] px-3 py-2 font-mono text-[7px] font-bold tracking-widest text-[#5b5346]">
                <span>LOCATION</span>
                <span>QTY</span>
              </div>

              {/* LOCATIONS */}
              {selectedItem.locationBreakdown
                .length === 0 ? (
                <div className="px-3 py-3 font-mono text-[8px] italic text-[#5b5346]">
                  NO LOCATION STOCK RECORDS
                </div>
              ) : (
                selectedItem.locationBreakdown.map(
                  (location) => (
                    <div
                      key={location.id}
                      className="grid grid-cols-[1fr_65px] items-center border-b border-dashed border-[#d0c4aa] px-3 py-2.5 font-mono text-[8px] last:border-b-0 hover:bg-[#eae2ce]"
                    >
                      <span className="min-w-0 truncate">
                        {location.locationName}
                      </span>

                      <span>
                        {location.quantity}
                      </span>
                    </div>
                  ),
                )
              )}
            </div>
          </div>

          {/* STOCK OPERATIONS */}
          <div className="mt-5 border-t border-dashed border-[#d0c4aa] pt-4">
            <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
              STOCK OPERATIONS
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <OperationButton
                icon={ArrowDownToLine}
                label="RECEIVE"
                onClick={() =>
                  onStartOperation(
                    'receive',
                  )
                }
              />

              <OperationButton
                icon={ArrowUpFromLine}
                label="ISSUE"
                onClick={() =>
                  onStartOperation(
                    'issue',
                  )
                }
              />

              <OperationButton
                icon={FileText}
                label="ADJUST"
                onClick={() =>
                  onStartOperation(
                    'adjust',
                  )
                }
              />

              <OperationButton
                icon={ArrowLeftRight}
                label="TRANSFER"
                onClick={() =>
                  onStartOperation(
                    'transfer',
                  )
                }
              />
            </div>
          </div>

          {/* OPERATION FORM */}
          {operation && (
            <form
              onSubmit={onOperationSubmit}
              className="mt-5 border-t border-dashed border-[#d0c4aa] pt-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
                    STOCK ACTION
                  </div>

                  <h3 className="mt-1 font-mono text-[15px]">
                    {operation ===
                    'receive'
                      ? 'RECEIVE STOCK'
                      : operation ===
                          'issue'
                        ? 'ISSUE STOCK'
                        : operation ===
                            'adjust'
                          ? 'ADJUST STOCK'
                          : 'TRANSFER STOCK'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={
                    onOperationCancel
                  }
                  className="font-mono text-[8px] text-[#5b5346] underline underline-offset-2 hover:text-[#2b2620]"
                >
                  CANCEL
                </button>
              </div>

              {/* SOURCE / OPERATION LOCATION */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                    {operation ===
                    'transfer'
                      ? 'FROM LOCATION'
                      : 'LOCATION'}
                  </label>

                  {selectedOperationLocation && (
                    <span className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                      STOCK{' '}
                      {
                        selectedOperationLocation.quantity
                      }{' '}
                      {
                        selectedItem.unitOfMeasure
                      }
                    </span>
                  )}
                </div>

                <LocationDropdown
                  value={
                    operationLocationId
                  }
                  onChange={
                    onOperationLocationChange
                  }
                  placeholder="SELECT LOCATION"
                  options={selectedItem.locationBreakdown.map(
                    (location) => {
                      const organizationLocation =
                        organizationLocations.find(
                          (entry) =>
                            entry.id ===
                            location.locationId,
                        );

                      return {
                        id:
                          location.locationId,
                        name:
                          location.locationName,
                        quantity:
                          location.quantity,
                        disabled:
                          organizationLocation?.status !==
                          'active',
                        suffix:
                          organizationLocation?.status !==
                          'active'
                            ? 'INACTIVE'
                            : undefined,
                      };
                    },
                  )}
                  unit={
                    selectedItem.unitOfMeasure
                  }
                />
              </div>

              {/* DESTINATION */}
              {operation ===
                'transfer' && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between">
                    <label className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                      TO LOCATION
                    </label>

                    <span className="font-mono text-[7px] tracking-widest text-[#5b5346]">
                      STOCK{' '}
                      {
                        selectedTargetQuantity
                      }{' '}
                      {
                        selectedItem.unitOfMeasure
                      }
                    </span>
                  </div>

                  <LocationDropdown
                    value={
                      targetLocationId
                    }
                    onChange={
                      onTargetLocationChange
                    }
                    placeholder="SELECT DESTINATION"
                    options={organizationLocations
                      .filter(
                        (location) =>
                          location.id !==
                          operationLocationId,
                      )
                      .map(
                        (location) => {
                          const itemLocation =
                            selectedItem.locationBreakdown.find(
                              (entry) =>
                                entry.locationId ===
                                location.id,
                            );

                          return {
                            id:
                              location.id,
                            name:
                              location.name,
                            quantity:
                              itemLocation?.quantity ??
                              0,
                            disabled:
                              location.status !==
                              'active',
                            suffix:
                              location.status !==
                              'active'
                                ? 'INACTIVE'
                                : undefined,
                          };
                        },
                      )}
                    unit={
                      selectedItem.unitOfMeasure
                    }
                  />
                </div>
              )}

              {/* QUANTITY */}
              <div className="mt-4">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  {operation ===
                  'adjust'
                    ? 'ADJUSTMENT QUANTITY'
                    : 'QUANTITY'}
                </label>

                <input
                  type="number"
                  min={
                    operation ===
                    'adjust'
                      ? undefined
                      : '1'
                  }
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    onQuantityChange(
                      event.target.value,
                    )
                  }
                  placeholder={
                    operation ===
                    'adjust'
                      ? 'e.g. -10 or +10'
                      : '0'
                  }
                  className="w-full border-0 border-b border-[#b7a87e] bg-transparent px-1 py-2 font-mono text-[11px] outline-none focus:border-[#2e4057]"
                  required
                />

                {operation ===
                  'adjust' && (
                  <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                    Use a negative
                    number to reduce
                    stock.
                  </div>
                )}
              </div>

              {/* NOTES */}
              <div className="mt-4">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  NOTES
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    onNotesChange(
                      event.target.value,
                    )
                  }
                  rows={3}
                  className="w-full resize-none border border-dashed border-[#c8bda5] bg-transparent p-2 font-mono text-[9px] outline-none focus:border-[#2e4057]"
                  placeholder="Optional notes..."
                />
              </div>

              {/* ERROR */}
              {operationError && (
                <div className="mt-4 border border-[#c57b71] bg-[#a63a2e]/5 px-3 py-2">
                  <div className="font-mono text-[8px] text-[#a63a2e]">
                    {operationError}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 w-full border border-[#2e4057] bg-[#2e4057] px-4 py-3 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#38506d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'PROCESSING...'
                  : 'POST TO LEDGER'}
              </button>
            </form>
          )}

          {/* ITEM MANAGEMENT */}
          {(onEdit ||
            onArchive) && (
            <div className="mt-5 border-t border-dashed border-[#d0c4aa] pt-4">
              <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                ITEM MANAGEMENT
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="border border-[#b7a87e] px-3 py-2.5 font-mono text-[8px] tracking-widest text-[#2e4057] hover:border-[#2e4057] hover:bg-[#eae2ce]"
                  >
                    EDIT ITEM
                  </button>
                )}

                {onArchive &&
                  !itemArchived && (
                    <button
                      type="button"
                      onClick={
                        onArchive
                      }
                      className="border border-[#c57b71] px-3 py-2.5 font-mono text-[8px] tracking-widest text-[#a63a2e] hover:bg-[#a63a2e]/5"
                    >
                      ARCHIVE ITEM
                    </button>
                  )}
              </div>
            </div>
          )}

          {/* TRANSACTION HISTORY */}
          <div className="mt-5 border-t border-dashed border-[#d0c4aa] pt-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
                  TRANSACTION HISTORY
                </div>

                <h3 className="mt-1 font-mono text-[15px]">
                  TRANSACTIONS
                </h3>
              </div>

              <div className="font-mono text-[7px] text-[#5b5346]">
                PAGE {transactionPage} OF{' '}
                {transactionTotalPages}
              </div>
            </div>

            {/* HISTORY DROPDOWN */}
            <div className="mt-3">
              <HistoryDropdown
                value={
                  transactionLocationId
                }
                selectedLabel={
                  transactionLocationId
                    ? getLocationName(
                        selectedItem,
                        transactionLocationId,
                      )
                    : 'ALL LOCATIONS'
                }
                locations={selectedItem.locationBreakdown.map(
                  (location) => ({
                    id:
                      location.locationId,
                    name:
                      location.locationName,
                  }),
                )}
                onSelect={(locationId) => {
                  if (
                    locationId ===
                    null
                  ) {
                    onViewAllTransactions();
                  } else {
                    onViewLocationTransactions(
                      locationId,
                    );
                  }
                }}
              />
            </div>

            {/* LOADING */}
            {transactionLoading ? (
              <div className="mt-3 p-4 text-center font-mono text-[8px] text-[#5b5346]">
                LOADING TRANSACTIONS...
              </div>
            ) : transactions.length ===
              0 ? (
              <div className="mt-3 border border-dashed border-[#c8bda5] p-4 text-center font-mono text-[8px] italic text-[#5b5346]">
                No transactions found.
              </div>
            ) : (
              <>
                {/* TRANSACTION TABLE */}
                <div className="mt-3 overflow-hidden border border-[#c8bda5]">
                  <div className="grid grid-cols-[82px_minmax(0,1fr)_68px_44px] gap-2 border-b border-[#c8bda5] bg-[#ddd0b8] px-3 py-2 font-mono text-[7px] font-bold tracking-widest text-[#5b5346]">
                    <span>DATE</span>
                    <span>LOCATION</span>
                    <span>ACTION</span>
                    <span>QTY</span>
                  </div>

                  {transactions.map(
                    (transaction) => (
                      <div
                        key={
                          transaction.id
                        }
                        className="grid grid-cols-[82px_minmax(0,1fr)_68px_44px] gap-2 border-b border-dashed border-[#d0c4aa] px-3 py-2.5 font-mono text-[7px] last:border-b-0"
                      >
                        <span className="text-[#5b5346]">
                          {formatDate(
                            transaction.createdAt,
                          )}
                        </span>

                        <span
                          className="truncate"
                          title={
                            transaction.location?.name ??
                            getLocationName(
                              selectedItem,
                              transactionLocationId ??
                                selectedItem
                                  .locationBreakdown[0]
                                  ?.locationId ??
                                '',
                            )
                          }
                        >
                          {transaction.location?.name ??
                            getLocationName(
                              selectedItem,
                              transactionLocationId ??
                                selectedItem
                                  .locationBreakdown[0]
                                  ?.locationId ??
                                '',
                            )}
                        </span>

                        <span className="truncate">
                          {formatAction(
                            transaction.txnType,
                          )}
                        </span>

                        <span
                          className={
                            transaction.quantity >
                            0
                              ? 'text-[#3d6b4f]'
                              : 'text-[#a63a2e]'
                          }
                        >
                          {transaction.quantity >
                          0
                            ? '+'
                            : ''}
                          {
                            transaction.quantity
                          }
                        </span>
                      </div>
                    ),
                  )}
                </div>

                {/* PAGINATION */}
                <div className="mt-2 flex justify-between">
                  <button
                    type="button"
                    disabled={
                      !hasPreviousTransactionPage ||
                      transactionLoading
                    }
                    onClick={
                      onPreviousPage
                    }
                    className="border border-[#b7a87e] px-2 py-1 font-mono text-[7px] text-[#2e4057] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ← PREVIOUS
                  </button>

                  <button
                    type="button"
                    disabled={
                      !hasNextTransactionPage ||
                      transactionLoading
                    }
                    onClick={
                      onNextPage
                    }
                    className="border border-[#b7a87e] px-2 py-1 font-mono text-[7px] text-[#2e4057] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    NEXT →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/*
 * =========================================================
 * HISTORY DROPDOWN
 * =========================================================
 */

function HistoryDropdown({
  value,
  selectedLabel,
  locations,
  onSelect,
}: {
  value: string | null;
  selectedLabel: string;
  locations: {
    id: string;
    name: string;
  }[];
  onSelect: (
    locationId: string | null,
  ) => void;
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const rootRef =
    useRef<HTMLDivElement>(
      null,
    );

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === 'Escape'
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown,
    );

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      );

      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
        className="flex w-full items-center justify-between gap-3 border border-[#b7a87e] bg-[#f5f0e3] px-3 py-2.5 text-left font-mono text-[8px] text-[#2b2620] hover:border-[#2e4057]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate tracking-widest">
          {selectedLabel}
        </span>

        <ChevronDown
          size={13}
          strokeWidth={1.7}
          className={`shrink-0 text-[#5b5346] transition-transform ${
            open
              ? 'rotate-180'
              : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden border border-[#b7a87e] bg-[#f5f0e3] shadow-[0_8px_20px_rgba(43,38,32,0.14)]">
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className={`flex w-full border-b border-dashed border-[#d0c4aa] px-3 py-2.5 text-left font-mono text-[8px] ${
              value === null
                ? 'bg-[#ddd0b8] text-[#2e4057]'
                : 'text-[#2b2620] hover:bg-[#eae2ce]'
            }`}
          >
            ALL LOCATIONS
          </button>

          <div className="max-h-56 overflow-y-auto">
            {locations.length ===
            0 ? (
              <div className="px-3 py-3 font-mono text-[8px] text-[#5b5346]">
                NO LOCATIONS
              </div>
            ) : (
              locations.map(
                (location) => (
                  <button
                    key={
                      location.id
                    }
                    type="button"
                    onClick={() => {
                      onSelect(
                        location.id,
                      );

                      setOpen(false);
                    }}
                    className={`flex w-full border-b border-dashed border-[#d0c4aa] px-3 py-2.5 text-left font-mono text-[8px] last:border-b-0 ${
                      value ===
                      location.id
                        ? 'bg-[#ddd0b8] text-[#2e4057]'
                        : 'text-[#2b2620] hover:bg-[#eae2ce]'
                    }`}
                  >
                    {location.name}
                  </button>
                ),
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * =========================================================
 * OPERATION LOCATION DROPDOWN
 * =========================================================
 */

function LocationDropdown({
  value,
  onChange,
  options,
  placeholder,
  unit,
}: {
  value: string;

  onChange: (
    value: string,
  ) => void;

  options: {
    id: string;
    name: string;
    quantity: number;
    disabled?: boolean;
    suffix?: string;
  }[];

  placeholder: string;

  unit: string;
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const rootRef =
    useRef<HTMLDivElement>(
      null,
    );

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === 'Escape'
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown,
    );

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      );

      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, []);

  const selected =
    options.find(
      (option) =>
        option.id === value,
    ) ?? null;

  return (
    <div
      ref={rootRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
        className="flex w-full items-center justify-between gap-3 border border-[#b7a87e] bg-[#f5f0e3] px-3 py-2.5 text-left hover:border-[#2e4057]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate font-mono text-[9px] text-[#2b2620]">
          {selected
            ? selected.name
            : placeholder}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {selected && (
            <span className="font-mono text-[8px] tracking-wide text-[#5b5346]">
              {selected.quantity}{' '}
              {unit}
            </span>
          )}

          <ChevronDown
            size={13}
            strokeWidth={1.7}
            className={`text-[#5b5346] transition-transform ${
              open
                ? 'rotate-180'
                : ''
            }`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 border border-[#b7a87e] bg-[#f5f0e3] shadow-[0_8px_20px_rgba(43,38,32,0.14)]">
          <div className="max-h-56 overflow-y-auto">
            {options.length ===
            0 ? (
              <div className="px-3 py-2.5 font-mono text-[8px] text-[#5b5346]">
                NO LOCATIONS
                AVAILABLE
              </div>
            ) : (
              options.map(
                (option) => (
                  <button
                    key={
                      option.id
                    }
                    type="button"
                    disabled={
                      option.disabled
                    }
                    onClick={() => {
                      if (
                        option.disabled
                      ) {
                        return;
                      }

                      onChange(
                        option.id,
                      );

                      setOpen(
                        false,
                      );
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left font-mono text-[8px] ${
                      option.disabled
                        ? 'cursor-not-allowed opacity-40'
                        : option.id ===
                            value
                          ? 'bg-[#ddd0b8] text-[#2e4057]'
                          : 'text-[#2b2620] hover:bg-[#eae2ce]'
                    }`}
                  >
                    <span className="min-w-0 truncate">
                      {option.name}

                      {option.suffix
                        ? ` · ${option.suffix}`
                        : ''}
                    </span>

                    <span className="shrink-0 text-[7px] text-[#5b5346]">
                      {option.quantity}{' '}
                      {unit}
                    </span>
                  </button>
                ),
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * =========================================================
 * DETAIL BOX
 * =========================================================
 */

function DetailBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#c8bda5] p-3">
      <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
        {label}
      </div>

      <div className="mt-1 font-mono text-[11px] text-[#2b2620]">
        {value}
      </div>
    </div>
  );
}

/*
 * =========================================================
 * OPERATION BUTTON
 * =========================================================
 */

function OperationButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 border border-[#b7a87e] px-3 py-2.5 font-mono text-[8px] tracking-widest text-[#2e4057] hover:border-[#2e4057] hover:bg-[#eae2ce]"
    >
      <Icon
        size={14}
        strokeWidth={1.7}
      />

      {label}
    </button>
  );
}

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function getLocationName(
  item: RegisterItem | null,
  locationId: string,
) {
  if (!item) {
    return 'Unknown location';
  }

  return (
    item.locationBreakdown.find(
      (location) =>
        location.locationId ===
        locationId,
    )?.locationName ??
    'Unknown location'
  );
}

function formatAction(
  action: string,
) {
  switch (
    action.trim().toLowerCase()
  ) {
    case 'receive':
      return 'RECEIVE';

    case 'issue':
      return 'ISSUE';

    case 'transfer':
      return 'TRANSFER';

    case 'adjustment':
    case 'adjust':
      return 'ADJUST';

    case 'opening_balance':
      return 'OPENING';

    default:
      return action.toUpperCase();
  }
}

function formatDate(
  timestamp: string,
) {
  const date = new Date(
    timestamp,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(
    'en-NG',
    {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
  )
    .format(date)
    .replace(',', '');
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    },
  ).format(value);
}