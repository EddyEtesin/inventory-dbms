'use client';

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  FileText,
  X,
} from 'lucide-react';

import {
  type ElementType,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiFetch } from '../../lib/api';
import type { RegisterItem } from '../../types/inventory';

type QuickActionType =
  | 'receive'
  | 'issue'
  | 'transfer'
  | 'adjust'
  | null;

type OrganizationLocation = {
  id: string;
  name: string;
  locationType: string;
};

type QuickActionsProps = {
  items: RegisterItem[];
  locations: OrganizationLocation[];
  onCompleted: () => Promise<void> | void;
  compact?: boolean;
  loading?: boolean;
};

export default function QuickActions({
  items,
  locations,
  onCompleted,
  compact = false,
  loading = false,
}: QuickActionsProps) {
  const [action, setAction] =
    useState<QuickActionType>(null);

  const [itemId, setItemId] =
    useState('');

  const [locationId, setLocationId] =
    useState('');

  const [targetLocationId, setTargetLocationId] =
    useState('');

  const [quantity, setQuantity] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState('');

  const selectedItem = useMemo(
    () =>
      items.find(
        (item) => item.id === itemId,
      ) ?? null,
    [items, itemId],
  );

  const itemLocations =
    selectedItem?.locationBreakdown ?? [];

  useEffect(() => {
    if (!selectedItem) {
      setLocationId('');
      setTargetLocationId('');
      return;
    }

    const firstLocation =
      selectedItem.locationBreakdown[0];

    setLocationId(
      firstLocation?.locationId ?? '',
    );

    setTargetLocationId('');
  }, [selectedItem]);

  useEffect(() => {
    if (!action) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [action]);

  function openAction(
    nextAction:
      | 'receive'
      | 'issue'
      | 'transfer'
      | 'adjust',
  ) {
    setAction(nextAction);
    setError('');
    setQuantity('');
    setNotes('');

    const firstItem = items[0];

    if (firstItem) {
      setItemId(firstItem.id);

      setLocationId(
        firstItem.locationBreakdown[0]
          ?.locationId ?? '',
      );
    } else {
      setItemId('');
      setLocationId('');
    }

    setTargetLocationId('');
  }

  function closeAction() {
    if (submitting) {
      return;
    }

    setAction(null);
    setError('');
    setQuantity('');
    setNotes('');
    setItemId('');
    setLocationId('');
    setTargetLocationId('');
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!action) {
      return;
    }

    if (!selectedItem) {
      setError('Select an item.');
      return;
    }

    const amount =
      Number(quantity);

    const validAmount =
      Number.isInteger(amount) &&
      (action === 'adjust'
        ? amount !== 0
        : amount > 0);

    if (!validAmount) {
      setError(
        action === 'adjust'
          ? 'Enter a non-zero whole number. Use a negative value to reduce stock.'
          : 'Enter a valid positive whole number.',
      );

      return;
    }

    if (!locationId) {
      setError('Select a location.');
      return;
    }

    if (
      action === 'transfer' &&
      !targetLocationId
    ) {
      setError(
        'Select a destination location.',
      );

      return;
    }

    if (
      action === 'transfer' &&
      locationId === targetLocationId
    ) {
      setError(
        'Source and destination must be different.',
      );

      return;
    }

    try {
      setSubmitting(true);
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

      let endpoint = '';

      let body: Record<
        string,
        unknown
      >;

      if (action === 'receive') {
        endpoint =
          `/inventory/items/${selectedItem.id}/locations/${locationId}/receive`;

        body = {
          quantity: amount,
          idempotencyKey:
            crypto.randomUUID(),
          ...(notes
            ? { notes }
            : {}),
        };
      } else if (action === 'issue') {
        endpoint =
          `/inventory/items/${selectedItem.id}/locations/${locationId}/issue`;

        body = {
          quantity: amount,
          idempotencyKey:
            crypto.randomUUID(),
          ...(notes
            ? { notes }
            : {}),
        };
      } else if (action === 'adjust') {
        endpoint =
          `/inventory/items/${selectedItem.id}/locations/${locationId}/adjust`;

        body = {
          quantity: amount,
          ...(notes
            ? { notes }
            : {}),
        };
      } else {
        endpoint =
          `/inventory/items/${selectedItem.id}/transfer`;

        body = {
          fromLocationId:
            locationId,
          toLocationId:
            targetLocationId,
          quantity: amount,
          idempotencyKey:
            crypto.randomUUID(),
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

      await onCompleted();

      closeAction();
    } catch (err) {
      setError(
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

  const actionTitle =
    action === 'receive'
      ? 'RECEIVE STOCK'
      : action === 'issue'
        ? 'ISSUE STOCK'
        : action === 'adjust'
          ? 'ADJUST STOCK'
          : action === 'transfer'
            ? 'TRANSFER STOCK'
            : '';

  const actionDescription =
    action === 'receive'
      ? 'Add stock to a selected location.'
      : action === 'issue'
        ? 'Remove stock from a selected location.'
        : action === 'adjust'
          ? 'Record a stock correction.'
          : action === 'transfer'
            ? 'Move stock between locations.'
            : '';

  const actionButtons = (
    <>
      <ActionButton
        icon={ArrowDownToLine}
        label="RECEIVE STOCK"
        disabled={
          loading || items.length === 0
        }
        onClick={() =>
          openAction('receive')
        }
        compact={compact}
      />

      <ActionButton
        icon={ArrowUpFromLine}
        label="ISSUE STOCK"
        disabled={
          loading || items.length === 0
        }
        onClick={() =>
          openAction('issue')
        }
        compact={compact}
      />

      <ActionButton
        icon={ArrowLeftRight}
        label="TRANSFER"
        disabled={
          loading || items.length === 0
        }
        onClick={() =>
          openAction('transfer')
        }
        compact={compact}
      />

      <ActionButton
        icon={FileText}
        label="ADJUST STOCK"
        disabled={
          loading || items.length === 0
        }
        onClick={() =>
          openAction('adjust')
        }
        compact={compact}
      />
    </>
  );

  return (
    <>
      {compact ? (
        <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_6px_18px_rgba(23,23,23,0.045)]">
          <div className="flex flex-col gap-1">
            {actionButtons}
          </div>
        </section>
      ) : (
        <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_6px_18px_rgba(23,23,23,0.045)]">
          <div className="px-4 py-4">
            <div className="font-mono text-[9px] tracking-[0.15em] text-[var(--accent)]">
              OPERATIONS
            </div>

            <h2 className="mt-1 font-sans text-[18px] font-semibold tracking-[-0.02em] text-[var(--text)]">
              Quick Actions
            </h2>
          </div>

          {actionButtons}

          <div className="px-4 py-3 text-[10px] text-[var(--muted)]">
            {items.length > 0
              ? 'Select an action to post to the ledger.'
              : 'Add an inventory item first.'}
          </div>
        </section>
      )}

      {/* QUICK ACTION MODAL */}
      {action && (
        <>
          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close stock action"
            onClick={closeAction}
            className="fixed inset-0 z-[60] bg-[rgba(23,23,23,0.38)]"
          />

          {/* MODAL CONTAINER */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
            <form
              onSubmit={handleSubmit}
              className="my-auto w-full max-w-[520px] rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_20px_50px_rgba(23,23,23,0.16)]"
            >
              {/* HEADER */}
              <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.15em] text-[var(--accent)]">
                    STOCK ACTION
                  </div>

                  <h3 className="mt-1 font-sans text-[21px] font-semibold tracking-[-0.025em] text-[var(--text)]">
                    {actionTitle}
                  </h3>

                  <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
                    {actionDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAction}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-[9px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
                >
                  <X
                    size={18}
                    strokeWidth={1.7}
                  />
                </button>
              </div>

              {/* ITEM */}
              <div className="mt-5">
                <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-[var(--muted)]">
                  ITEM
                </label>

                <select
                  value={itemId}
                  onChange={(event) =>
                    setItemId(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5 text-[12px] text-[var(--text)] outline-none transition focus:border-[var(--border-strong)] focus:bg-[var(--surface)]"
                  required
                >
                  <option value="">
                    SELECT ITEM
                  </option>

                  {items.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name} ·{' '}
                      {item.sku}
                    </option>
                  ))}
                </select>
              </div>

              {/* LOCATION */}
              <div className="mt-4">
                <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-[var(--muted)]">
                  {action === 'transfer'
                    ? 'FROM LOCATION'
                    : 'LOCATION'}
                </label>

                <select
                  value={locationId}
                  onChange={(event) =>
                    setLocationId(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5 text-[12px] text-[var(--text)] outline-none transition focus:border-[var(--border-strong)] focus:bg-[var(--surface)]"
                  required
                >
                  <option value="">
                    SELECT LOCATION
                  </option>

                  {itemLocations.map(
                    (location) => (
                      <option
                        key={
                          location.locationId
                        }
                        value={
                          location.locationId
                        }
                      >
                        {
                          location.locationName
                        }{' '}
                        ·{' '}
                        {
                          location.quantity
                        }{' '}
                        {
                          selectedItem?.unitOfMeasure
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* DESTINATION */}
              {action === 'transfer' && (
                <div className="mt-4">
                  <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-[var(--muted)]">
                    TO LOCATION
                  </label>

                  <select
                    value={
                      targetLocationId
                    }
                    onChange={(event) =>
                      setTargetLocationId(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5 text-[12px] text-[var(--text)] outline-none transition focus:border-[var(--border-strong)] focus:bg-[var(--surface)]"
                    required
                  >
                    <option value="">
                      SELECT DESTINATION
                    </option>

                    {locations
                      .filter(
                        (location) =>
                          location.id !==
                          locationId,
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
                <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-[var(--muted)]">
                  {action === 'adjust'
                    ? 'ADJUSTMENT QUANTITY'
                    : 'QUANTITY'}
                </label>

                <input
                  type="number"
                  min={
                    action === 'adjust'
                      ? undefined
                      : '1'
                  }
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      event.target.value,
                    )
                  }
                  placeholder={
                    action === 'adjust'
                      ? 'e.g. -10 or +10'
                      : '0'
                  }
                  className="w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5 font-mono text-[12px] text-[var(--text)] outline-none transition focus:border-[var(--border-strong)] focus:bg-[var(--surface)]"
                  required
                />

                {action === 'adjust' && (
                  <div className="mt-1.5 text-[10px] text-[var(--muted)]">
                    Use a negative number to reduce stock.
                  </div>
                )}
              </div>

              {/* NOTES */}
              <div className="mt-4">
                <label className="mb-2 block font-mono text-[9px] tracking-[0.14em] text-[var(--muted)]">
                  NOTES
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full resize-none rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-[12px] text-[var(--text)] outline-none transition focus:border-[var(--border-strong)] focus:bg-[var(--surface)]"
                />
              </div>

              {/* ERROR */}
              {error && (
                <div className="mt-4 rounded-[9px] bg-[var(--danger-soft)] px-3 py-2.5">
                  <div className="text-[11px] text-[var(--danger)]">
                    {error}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={closeAction}
                  disabled={submitting}
                  className="min-h-[44px] flex-1 rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[11px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-40"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] flex-1 rounded-[9px] bg-[var(--accent)] px-4 text-[11px] font-medium text-white transition-colors hover:bg-[#9f4334] disabled:opacity-50"
                >
                  {submitting
                    ? 'PROCESSING...'
                    : 'POST TO LEDGER'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}

function ActionButton({
  icon: Icon,
  label,
  disabled,
  onClick,
  compact,
}: {
  icon: ElementType;
  label: string;
  disabled: boolean;
  onClick: () => void;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        group
        flex w-full items-center gap-3
        rounded-[10px]
        text-left
        transition-colors
        disabled:cursor-not-allowed
        disabled:opacity-40
        ${
          compact
            ? 'min-h-[54px] px-3'
            : 'min-h-[52px] border-t border-[var(--border)] px-4'
        }
        ${
          !disabled
            ? 'hover:bg-[var(--surface-soft)]'
            : ''
        }
      `}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[var(--surface-soft)] text-[var(--navy)] transition-colors group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]">
        <Icon
          size={16}
          strokeWidth={1.7}
        />
      </span>

      <span className="font-sans text-[12px] font-medium tracking-[-0.01em] text-[var(--text)]">
        {label}
      </span>

      <span className="ml-auto text-[14px] text-[var(--text-soft)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]">
        →
      </span>
    </button>
  );
}

function extractApiError(
  message: string,
) {
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
    // Keep the original message.
  }

  return message;
}