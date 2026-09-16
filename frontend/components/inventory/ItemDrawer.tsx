'use client';

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

  onClose: () => void;

  onLocationSelect: (
    locationId: string,
  ) => void;

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

  onReferenceChange: (
    reference: string,
  ) => void;

  onNotesChange: (
    notes: string,
  ) => void;

  onPreviousPage: () => void;
  onNextPage: () => void;
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
}: ItemDrawerProps) {
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
        className="fixed inset-0 z-40 bg-[#2b2620]/45"
      />

      {/* DRAWER */}
      <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-[470px] overflow-y-auto border-l-2 border-[#2b2620] bg-[#f5f0e3] p-5 shadow-[-12px_0_30px_rgba(0,0,0,0.22)]">
        {/* CLOSE */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4"
          aria-label="Close"
        >
          <X
            size={19}
            strokeWidth={1.7}
          />
        </button>

        {/* ITEM HEADER */}
        <div className="pr-8">
          <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">
            ITEM RECORD
          </div>

          <h2 className="mt-1 font-mono text-[20px]">
            {selectedItem.name}
          </h2>

          <div className="mt-1 font-mono text-[9px] text-[#5b5346]">
            {selectedItem.sku} ·{' '}
            {selectedItem.category?.name ??
              'UNCATEGORIZED'}
          </div>
        </div>

        {/* STOCK SUMMARY */}
        <div className="mt-5 border-t border-dashed border-[#b7a87e] pt-4">
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
        <div className="mt-5 border-t border-dashed border-[#b7a87e] pt-4">
          <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">
            STOCK BY LOCATION
          </div>

          <div className="mt-2 border border-[#b7a87e]">
            <div className="grid grid-cols-[1fr_65px_65px] border-b border-[#2b2620] bg-[#ddd0b8] px-3 py-2 font-mono text-[7px] tracking-widest">
              <span>LOCATION</span>
              <span>QTY</span>
              <span>REORDER</span>
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
                  className="grid w-full grid-cols-[1fr_65px_65px] border-b border-dashed border-[#b7a87e] px-3 py-2 text-left font-mono text-[8px] last:border-b-0 hover:bg-[#eae2ce]"
                >
                  <span>
                    {location.locationName}
                  </span>

                  <span
                    className={
                      location.quantity <=
                      location.reorderLevel
                        ? 'text-[#a63a2e]'
                        : ''
                    }
                  >
                    {location.quantity}
                  </span>

                  <span>
                    {location.reorderLevel}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>

        {/* STOCK OPERATIONS */}
        <div className="mt-5 border-t border-dashed border-[#b7a87e] pt-4">
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
            className="mt-5 border-t border-dashed border-[#b7a87e] pt-4"
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
                      : operation ===
                          'adjust'
                        ? 'ADJUST STOCK'
                        : 'TRANSFER STOCK'}
                </h3>
              </div>

              <button
                type="button"
                onClick={onOperationCancel}
                className="font-mono text-[8px] text-[#5b5346] underline"
              >
                CANCEL
              </button>
            </div>

            {/* FROM / LOCATION */}
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
                className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[10px] outline-none"
                required
              >
                <option value="">
                  SELECT LOCATION
                </option>

                {selectedItem.locationBreakdown.map(
                  (location) => (
                    <option
                      key={
                        location.locationId
                      }
                      value={
                        location.locationId
                      }
                    >
                      {location.locationName}
                    </option>
                  ),
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
                  className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[10px] outline-none"
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
                      >
                        {location.name}
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
                className="w-full border-0 border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] outline-none"
                required
              />

              {operation === 'adjust' && (
                <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                  Use a negative number to reduce
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
                className="w-full resize-none border border-dashed border-[#b7a87e] bg-transparent p-2 font-mono text-[9px] outline-none"
                placeholder="Optional notes..."
              />
            </div>

            {/* ERROR */}
            {operationError && (
              <div className="mt-4 border border-[#a63a2e] bg-[#a63a2e]/5 px-3 py-2">
                <div className="font-mono text-[8px] text-[#a63a2e]">
                  {operationError}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full border-2 border-[#2e4057] bg-[#2e4057] px-4 py-3 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620] disabled:opacity-50"
            >
              {submitting
                ? 'PROCESSING...'
                : 'POST TO LEDGER'}
            </button>
          </form>
        )}

        {/* TRANSACTION HISTORY */}
        <div className="mt-5 border-t border-dashed border-[#b7a87e] pt-4">
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
                ? `PAGE ${transactionPage}`
                : ''}
            </div>
          </div>

          {!operationLocationId ? (
            <div className="mt-3 border border-dashed border-[#b7a87e] p-4 text-center font-mono text-[8px] italic text-[#5b5346]">
              Select a location to view its
              transaction history.
            </div>
          ) : transactionLoading ? (
            <div className="mt-3 p-4 text-center font-mono text-[8px] text-[#5b5346]">
              LOADING TRANSACTIONS...
            </div>
          ) : transactions.length === 0 ? (
            <div className="mt-3 border border-dashed border-[#b7a87e] p-4 text-center font-mono text-[8px] italic text-[#5b5346]">
              No transactions found.
            </div>
          ) : (
            <>
              <div className="mt-3 border border-[#b7a87e]">
                <div className="grid grid-cols-[80px_75px_65px_minmax(0,1fr)] gap-2 border-b border-[#2b2620] bg-[#ddd0b8] px-3 py-2 font-mono text-[7px] tracking-widest text-[#5b5346]">
                  <span>DATE</span>
                  <span>ACTION</span>
                  <span>QTY</span>
                  <span>REFERENCE</span>
                </div>

                {transactions.map(
                  (transaction) => (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-[80px_75px_65px_minmax(0,1fr)] gap-2 border-b border-dashed border-[#b7a87e] px-3 py-2 font-mono text-[7px] last:border-b-0"
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
                        {transaction.quantity}
                      </span>

                      <span
                        className="truncate text-[#2e4057] underline-offset-2 hover:underline"
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
                    transactionPage <= 1
                  }
                  onClick={onPreviousPage}
                  className="border border-[#2b2620] px-2 py-1 font-mono text-[7px] disabled:opacity-30"
                >
                  ← PREVIOUS
                </button>

                <button
                  type="button"
                  onClick={onNextPage}
                  disabled={
                    transactions.length === 0
                  }
                  className="border border-[#2b2620] px-2 py-1 font-mono text-[7px] disabled:opacity-30"
                >
                  NEXT →
                </button>
              </div>
            </>
          )}
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
    <div className="border border-[#b7a87e] p-3">
      <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">
        {label}
      </div>

      <div className="mt-1 font-mono text-[11px]">
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
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 border border-[#2e4057] px-3 py-2.5 font-mono text-[8px] tracking-widest text-[#2e4057] hover:bg-[#2e4057] hover:text-[#f5f0e3]"
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