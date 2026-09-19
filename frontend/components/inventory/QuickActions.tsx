'use client';

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  FileText,
  X,
} from 'lucide-react';
import {
  FormEvent,
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
  status: string;
};

type QuickActionsProps = {
  items: RegisterItem[];
  locations: OrganizationLocation[];
  onCompleted: () => Promise<void> | void;
};

export default function QuickActions({
  items,
  locations,
  onCompleted,
}: QuickActionsProps) {
  const [action, setAction] =
    useState<QuickActionType>(null);

  const [itemId, setItemId] = useState('');
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

    const activeLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.status === 'active',
      ),
    [locations],
  );

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

  /*
   * LOCK BACKGROUND SCROLL WHILE
   * QUICK ACTION MODAL IS OPEN.
   */
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

    const amount = Number(quantity);

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

  return (
    <>
      {/* QUICK ACTIONS */}
      <section className="border border-[#b7a87e] bg-[#f5f0e3] shadow-[1px_2px_0_#b7a87e]">
        <div className="bg-[#2e4057] px-4 py-3 text-[#f5f0e3]">
          <div className="font-mono text-[7px] tracking-widest">
            OPERATIONS
          </div>

          <h2 className="mt-1 font-mono text-[17px]">
            QUICK ACTIONS
          </h2>
        </div>

        <ActionButton
          icon={ArrowDownToLine}
          label="RECEIVE STOCK"
          disabled={items.length === 0}
          onClick={() =>
            openAction('receive')
          }
        />

        <ActionButton
          icon={ArrowUpFromLine}
          label="ISSUE STOCK"
          disabled={items.length === 0}
          onClick={() =>
            openAction('issue')
          }
        />

        <ActionButton
          icon={ArrowLeftRight}
          label="TRANSFER STOCK"
          disabled={items.length === 0}
          onClick={() =>
            openAction('transfer')
          }
        />

        <ActionButton
          icon={FileText}
          label="ADJUST STOCK"
          disabled={items.length === 0}
          onClick={() =>
            openAction('adjust')
          }
        />

        <div className="border-t border-dashed border-[#b7a87e] px-4 py-2 font-mono text-[7px] text-[#5b5346]">
          {items.length > 0
            ? 'Select an action to post to the ledger.'
            : 'Add an inventory item first.'}
        </div>
      </section>

      {/* QUICK ACTION MODAL */}
      {action && (
        <>
          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close stock action"
            onClick={closeAction}
            className="fixed inset-0 z-[60] bg-[#2b2620]/45"
          />

          {/* MODAL CONTAINER */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
            <form
              onSubmit={handleSubmit}
              className="my-auto w-full max-w-[520px] border border-[#2b2620] bg-[#f5f0e3] p-5 shadow-[8px_10px_0_rgba(43,38,32,0.18)]"
            >
              {/* HEADER */}
              <div className="flex items-start justify-between border-b border-dashed border-[#b7a87e] pb-4">
                <div>
                  <div className="font-mono text-[7px] tracking-widest text-[#a63a2e]">
                    STOCK ACTION
                  </div>

                  <h3 className="mt-1 font-mono text-[19px]">
                    {actionTitle}
                  </h3>

                  <p className="mt-1 font-mono text-[7px] text-[#5b5346]">
                    {actionDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAction}
                  aria-label="Close"
                  className="text-[#5b5346] hover:text-[#2b2620]"
                >
                  <X
                    size={18}
                    strokeWidth={1.7}
                  />
                </button>
              </div>

              {/* ITEM */}
              <div className="mt-4">
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
                  ITEM
                </label>

                <select
                  value={itemId}
                  onChange={(event) =>
                    setItemId(
                      event.target.value,
                    )
                  }
                  className="w-full border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[10px] outline-none"
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
                <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
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
                  className="w-full border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[10px] outline-none"
                  required
                >
                  <option value="">
                    SELECT LOCATION
                  </option>

                  {itemLocations.map(
                  (location) => {
                    const organizationLocation =
                      locations.find(
                        (entry) =>
                          entry.id ===
                          location.locationId,
                      );

                    const isInactive =
                      organizationLocation?.status !==
                      'active';

                    return (
                      <option
                        key={
                          location.locationId
                        }
                        value={
                          location.locationId
                        }
                        disabled={
                          isInactive
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
              {action === 'transfer' && (
                <div className="mt-4">
                  <label className="mb-1 block font-mono text-[8px] tracking-widest text-[#5b5346]">
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
                    className="w-full border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[10px] outline-none"
                    required
                  >
                    <option value="">
                      SELECT DESTINATION
                    </option>

                    {locations
                        .filter(
                          (location) =>
                            location.id !== locationId,
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
                  className="w-full border-b border-[#2b2620] bg-transparent px-1 py-2 font-mono text-[11px] outline-none"
                  required
                />

                {action === 'adjust' && (
                  <div className="mt-1 font-mono text-[7px] text-[#5b5346]">
                    Use a negative number to
                    reduce stock.
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
                    setNotes(
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full resize-none border border-dashed border-[#b7a87e] bg-transparent p-2 font-mono text-[9px] outline-none"
                />
              </div>

              {/* ERROR */}
              {error && (
                <div className="mt-4 border border-[#a63a2e] bg-[#a63a2e]/5 px-3 py-2">
                  <div className="font-mono text-[8px] text-[#a63a2e]">
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
                  className="flex-1 border border-[#2b2620] px-4 py-2.5 font-mono text-[8px] tracking-widest disabled:opacity-40"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 border-2 border-[#2e4057] bg-[#2e4057] px-4 py-2.5 font-mono text-[8px] tracking-widest text-[#f5f0e3] hover:bg-[#c68a2e] hover:text-[#2b2620] disabled:opacity-50"
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
}: {
  icon: React.ElementType;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[#b7a87e] px-4 py-3 text-left font-mono text-[8px] tracking-widest hover:bg-[#eae2ce] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon
        size={16}
        strokeWidth={1.7}
      />

      <span>{label}</span>
    </button>
  );
}

function extractApiError(
  message: string,
) {
  try {
    const parsed = JSON.parse(
      message,
    );

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