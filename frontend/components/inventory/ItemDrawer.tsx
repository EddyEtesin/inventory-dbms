'use client';

import { useEffect, type ElementType, type FormEvent } from 'react';

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
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
  reference: string;
  notes: string;

  submitting: boolean;
  operationError: string;

  transactions: Transaction[];
  transactionLoading: boolean;
  transactionPage: number;
  transactionTotalPages: number;
  hasNextTransactionPage: boolean;
  hasPreviousTransactionPage: boolean;

  onClose: () => void;

  onLocationSelect: (locationId: string) => void;

  onStartOperation: (operation: Operation) => void;

  onOperationSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;

  onOperationCancel: () => void;

  onOperationLocationChange: (locationId: string) => void;

  onTargetLocationChange: (locationId: string) => void;

  onQuantityChange: (quantity: string) => void;

  onReferenceChange: (reference: string) => void;

  onNotesChange: (notes: string) => void;

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
  reference,
  notes,

  submitting,
  operationError,

  transactions,
  transactionLoading,
  transactionPage,
  transactionTotalPages,
  hasNextTransactionPage,
  hasPreviousTransactionPage,

  onClose,

  onLocationSelect,

  onStartOperation,

  onOperationSubmit,

  onOperationCancel,

  onOperationLocationChange,

  onTargetLocationChange,

  onQuantityChange,

  onReferenceChange,

  onNotesChange,

  onPreviousPage,
  onNextPage,

  onEdit,
  onArchive,
  itemArchived = false,
}: ItemDrawerProps) {
  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const previousBodyOverflow =
      document.body.style.overflow;

    const previousHtmlOverflow =
      document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        previousBodyOverflow;

      document.documentElement.style.overflow =
        previousHtmlOverflow;
    };
  }, [selectedItem]);

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
              <div className="grid grid-cols-[1fr_65px] border-b border-[#c8bda5] bg-[#ddd0b8] px-3 py-2 font-mono text-[7px] tracking-widest text-[#5b5346]">
                <span>LOCATION</span>
                <span>QTY</span>
              </div>

              {selectedItem.locationBreakdown.map(
                (location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() =>
                      onLocationSelect(
                        location.locationId,
                      )
                    }
                    className="grid w-full grid-cols-[1fr_65px] border-b border-dashed border-[#d0c4aa] px-3 py-2.5 text-left font-mono text-[8px] last:border-b-0 hover:bg-[#eae2ce]"
                  >
                    <span>
                      {location.locationName}
                    </span>

                    <span>
                      {location.quantity}
                    </span>
                  </button>
                ),
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
                  onStartOperation('receive')
                }
              />

              <OperationButton
                icon={ArrowUpFromLine}
                label="ISSUE"
                onClick={() =>
                  onStartOperation('issue')
                }
              />

              <OperationButton
                icon={FileText}
                label="ADJUST"
                onClick={() =>
                  onStartOperation('adjust')
                }
              />

              <OperationButton
                icon={ArrowLeftRight}
                label="TRANSFER"
                onClick={() =>
                  onStartOperation('transfer')
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
                    {operation === 'receive'
                      ? 'RECEIVE STOCK'
                      : operation === 'issue'
                        ? 'ISSUE STOCK'
                        : operation === 'adjust'
                          ? 'ADJUST STOCK'
                          : 'TRANSFER STOCK'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={onOperationCancel}
                  className="font-mono text-[8px] text-[#5b5346] underline underline-offset-2 hover:text-[#2b2620]"
                >
                  CANCEL
                </button>
              </div>

              {/* LOCATION */}
              <div className="mt-4">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  {operation === 'transfer'
                    ? 'FROM LOCATION'
                    : 'LOCATION'}
                </label>

                <select
                  value={operationLocationId}
                  onChange={(event) =>
                    onOperationLocationChange(
                      event.target.value,
                    )
                  }
                  className="w-full border-0 border-b border-[#b7a87e] bg-transparent px-1 py-2 font-mono text-[10px] outline-none focus:border-[#2e4057]"
                  required
                >
                  <option value="">
                    SELECT LOCATION
                  </option>

                  {selectedItem.locationBreakdown.map(
                    (location) => {
                      const organizationLocation =
                        organizationLocations.find(
                          (entry) =>
                            entry.id ===
                            location.locationId,
                        );

                      const isInactive =
                        organizationLocation?.status !==
                        'active';

                      return (
                        <option
                          key={location.locationId}
                          value={location.locationId}
                          disabled={isInactive}
                        >
                          {location.locationName}
                          {isInactive
                            ? ' · INACTIVE'
                            : ''}
                        </option>
                      );
                    },
                  )}
                </select>
              </div>

              {/* DESTINATION */}
              {operation === 'transfer' && (
                <div className="mt-4">
                  <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                    TO LOCATION
                  </label>

                  <select
                    value={targetLocationId}
                    onChange={(event) =>
                      onTargetLocationChange(
                        event.target.value,
                      )
                    }
                    className="w-full border-0 border-b border-[#b7a87e] bg-transparent px-1 py-2 font-mono text-[10px] outline-none focus:border-[#2e4057]"
                    required
                  >
                    <option value="">
                      SELECT LOCATION
                    </option>

                    {organizationLocations
                      .filter(
                        (location) =>
                          location.id !==
                          operationLocationId,
                      )
                      .map((location) => (
                        <option
                          key={location.id}
                          value={location.id}
                          disabled={
                            location.status !==
                            'active'
                          }
                        >
                          {location.name}
                          {location.status !==
                          'active'
                            ? ' · INACTIVE'
                            : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* QUANTITY */}
              <div className="mt-4">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  {operation === 'adjust'
                    ? 'ADJUSTMENT QUANTITY'
                    : 'QUANTITY'}
                </label>

                <input
                  type="number"
                  min={
                    operation === 'adjust'
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
                    operation === 'adjust'
                      ? 'e.g. -10 or +10'
                      : '0'
                  }
                  className="w-full border-0 border-b border-[#b7a87e] bg-transparent px-1 py-2 font-mono text-[11px] outline-none focus:border-[#2e4057]"
                  required
                />

                {operation === 'adjust' && (
                  <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                    Use a negative number to reduce
                    stock.
                  </div>
                )}
              </div>

              {/* REFERENCE */}
              <div className="mt-4">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  REFERENCE
                </label>

                <input
                  type="text"
                  value={reference}
                  onChange={(event) =>
                    onReferenceChange(
                      event.target.value,
                    )
                  }
                  className="w-full border-0 border-b border-[#b7a87e] bg-transparent px-1 py-2 font-mono text-[10px] outline-none focus:border-[#2e4057]"
                  placeholder="e.g. PO-2026-0042"
                />

                <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                  Optional purchase order, request,
                  issue, or other reference.
                </div>
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
          {(onEdit || onArchive) && (
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

                {onArchive && !itemArchived && (
                  <button
                    type="button"
                    onClick={onArchive}
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
                  LOCATION LEDGER
                </div>

                <h3 className="mt-1 font-mono text-[15px]">
                  TRANSACTIONS
                </h3>
              </div>

              <div className="font-mono text-[7px] text-[#5b5346]">
                {operationLocationId
                  ? `PAGE ${transactionPage} OF ${transactionTotalPages}`
                  : ''}
              </div>
            </div>

            {!operationLocationId ? (
              <div className="mt-3 border border-dashed border-[#c8bda5] p-4 text-center font-mono text-[8px] italic text-[#5b5346]">
                Select a location to view its
                transaction history.
              </div>
            ) : transactionLoading ? (
              <div className="mt-3 p-4 text-center font-mono text-[8px] text-[#5b5346]">
                LOADING TRANSACTIONS...
              </div>
            ) : transactions.length === 0 ? (
              <div className="mt-3 border border-dashed border-[#c8bda5] p-4 text-center font-mono text-[8px] italic text-[#5b5346]">
                No transactions found.
              </div>
            ) : (
              <>
                <div className="mt-3 overflow-hidden border border-[#c8bda5]">
                  <div className="grid grid-cols-[80px_75px_65px_minmax(0,1fr)] gap-2 border-b border-[#c8bda5] bg-[#ddd0b8] px-3 py-2 font-mono text-[7px] tracking-widest text-[#5b5346]">
                    <span>DATE</span>
                    <span>ACTION</span>
                    <span>QTY</span>
                    <span>REFERENCE</span>
                  </div>

                  {transactions.map(
                    (transaction) => (
                      <div
                        key={transaction.id}
                        className="grid grid-cols-[80px_75px_65px_minmax(0,1fr)] gap-2 border-b border-dashed border-[#d0c4aa] px-3 py-2 font-mono text-[7px] last:border-b-0"
                      >
                        <span className="text-[#5b5346]">
                          {formatDate(
                            transaction.createdAt,
                          )}
                        </span>

                        <span>
                          {formatAction(
                            transaction.txnType,
                          )}
                        </span>

                        <span
                          className={
                            transaction.quantity > 0
                              ? 'text-[#3d6b4f]'
                              : 'text-[#a63a2e]'
                          }
                        >
                          {transaction.quantity > 0
                            ? '+'
                            : ''}
                          {transaction.quantity}
                        </span>

                        <span
                          className="truncate text-[#2e4057]"
                          title={
                            transaction.reference ??
                            'No reference'
                          }
                        >
                          {transaction.reference ??
                            '—'}
                        </span>
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-2 flex justify-between">
                  <button
                    type="button"
                    disabled={
                      !hasPreviousTransactionPage ||
                      transactionLoading
                    }
                    onClick={onPreviousPage}
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
                    onClick={onNextPage}
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

function formatDate(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(',', '');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}