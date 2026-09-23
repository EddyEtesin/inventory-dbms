'use client';

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ClipboardPenLine,
  History,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiFetch } from '../../lib/api';

import type {
  RecentActivity as RecentActivityRecord,
} from '../../types/inventory';

const PAGE_SIZE = 5;
const FETCH_LIMIT = 20;

export default function RecentActivity() {
  const [activity, setActivity] =
    useState<RecentActivityRecord[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [error, setError] =
    useState('');

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        setError('');

        const token =
          window.localStorage.getItem(
            'accessToken',
          );

        if (!token) {
          setLoading(false);
          return;
        }

        const response =
          await apiFetch<
            RecentActivityRecord[] | {
              data: RecentActivityRecord[];
            }
          >(
            `/inventory/activity/recent?limit=${FETCH_LIMIT}`,
            token,
          );

        const records =
          Array.isArray(response)
            ? response
            : Array.isArray(
                response.data,
              )
              ? response.data
              : [];

        setActivity(records);
        setCurrentPage(1);
      } catch (err) {
        console.error(
          'Unable to load recent inventory activity:',
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load recent activity.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(
      activity.length /
        PAGE_SIZE,
    ),
  );

  const visibleActivity = useMemo(() => {
    const start =
      (currentPage - 1) *
      PAGE_SIZE;

    return activity.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [
    activity,
    currentPage,
  ]);

  useEffect(() => {
    setCurrentPage((page) =>
      Math.min(
        page,
        totalPages,
      ),
    );
  }, [totalPages]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-3">
        <div className="flex items-center gap-2 font-mono text-[7px] tracking-[0.2em] text-[#a63a2e]">
          <History
            size={12}
            strokeWidth={1.7}
          />

          LIVE INVENTORY FEED
        </div>

        <h2 className="mt-1 font-mono text-[20px]">
          Recent Activity
        </h2>

        <p className="mt-1 font-mono text-[7px] text-[#5b5346]">
          Latest stock movements across
          the organization.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#b7a87e] bg-[#f5f0e3] shadow-[0_2px_0_#b7a87e]">
        {loading ? (
          <ActivityLoading />
        ) : error ? (
          <div className="flex flex-1 items-center justify-center px-5 py-10 text-center">
            <div className="font-mono text-[8px] text-[#a63a2e]">
              {error}
            </div>
          </div>
        ) : activity.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-5 py-10 text-center">
            <div className="font-mono text-[8px] text-[#5b5346]">
              No recent inventory activity.
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1">
              {visibleActivity.map(
                (event, index) => (
                  <ActivityRow
                    key={
                      event.id ??
                      `${event.timestamp ?? event.createdAt}-${index}`
                    }
                    event={event}
                    index={index}
                  />
                ),
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-dashed border-[#b7a87e] bg-[#eae2ce] px-4 py-3">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.max(
                        1,
                        page - 1,
                      ),
                  )
                }
                disabled={
                  currentPage === 1
                }
                className="font-mono text-[7px] tracking-[0.12em] text-[#2e4057] transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
              >
                ‹ PREVIOUS
              </button>

              <div className="font-mono text-[7px] tracking-[0.12em] text-[#5b5346]">
                {currentPage} /{' '}
                {totalPages}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.min(
                        totalPages,
                        page + 1,
                      ),
                  )
                }
                disabled={
                  currentPage ===
                  totalPages
                }
                className="font-mono text-[7px] tracking-[0.12em] text-[#2e4057] transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
              >
                NEXT ›
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ActivityRow({
  event,
  index,
}: {
  event: RecentActivityRecord;
  index: number;
}) {
  const quantity =
    event.quantity ?? 0;

  const rawAction =
    event.action ??
    event.txnType ??
    '';

  const action =
    formatAction(rawAction);

  const timestamp =
    formatDateTime(
      event.timestamp ??
        event.createdAt ??
        '',
    );

  const itemName =
    event.item?.name ??
    'Unknown item';

  const itemSku =
    event.item?.sku ??
    '—';

  const locationName =
    event.location?.name ??
    'Unknown location';

  const actor =
    event.performedBy?.name ??
    event.performedBy?.email ??
    'System';

  const reference =
    event.reference ??
    null;

  const isNegative =
    quantity < 0;

  return (
    <div
      className="border-b border-dashed border-[#b7a87e] px-4 py-4 last:border-b-0 transition-colors hover:bg-[#eee7d8]"
      style={{
        animationDelay: `${Math.min(
          index * 55,
          500,
        )}ms`,
      }}
    >
      <div className="flex items-start gap-3">

        {/* ICON */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center border ${
            isNegative
              ? 'border-[#a63a2e]/40 bg-[#a63a2e]/5 text-[#a63a2e]'
              : 'border-[#3d6b4f]/40 bg-[#3d6b4f]/5 text-[#3d6b4f]'
          }`}
        >
          {getActionIcon(
            rawAction,
          )}
        </div>

        <div className="min-w-0 flex-1">

          {/* MAIN LINE */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] leading-5">

              <span
                className={`shrink-0 font-semibold ${
                  isNegative
                    ? 'text-[#a63a2e]'
                    : 'text-[#2e4057]'
                }`}
              >
                {action}
              </span>

              <span className="text-[#8a7f6b]">
                ·
              </span>

              <span className="font-semibold text-[#2b2620]">
                {itemName}
              </span>
            </div>

            {/* TIME */}
            <span className="shrink-0 whitespace-nowrap font-mono text-[8px] font-semibold text-[#5b5346]">
              {timestamp}
            </span>
          </div>

          {/* STOCK DETAILS */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[8px] leading-4">

            <span
              className={
                isNegative
                  ? 'font-semibold text-[#a63a2e]'
                  : 'font-semibold text-[#3d6b4f]'
              }
            >
              {formatQuantity(
                quantity,
              )}{' '}
              units
            </span>

            <span className="text-[#8a7f6b]">
              ·
            </span>

            <span className="text-[#5b5346]">
              {locationName}
            </span>

            <span className="text-[#8a7f6b]">
              ·
            </span>

            <span className="text-[#8a7f6b]">
              SKU {itemSku}
            </span>
          </div>

          {/* ACTOR + REFERENCE */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[7px] leading-4 text-[#8a7f6b]">

            <span>
              BY {actor}
            </span>

            <span>
              ·
            </span>

            <span>
              REF {reference ?? '—'}
            </span>
          </div>


        </div>
      </div>
    </div>
  );
}

function ActivityLoading() {
  return (
    <div className="flex-1">
      {Array.from({
        length: PAGE_SIZE,
      }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[110px] items-center gap-4 border-b border-dashed border-[#b7a87e] px-4 py-4 last:border-b-0"
        >
          <div className="h-9 w-9 shrink-0 animate-pulse border border-[#b7a87e] bg-[#eae2ce]" />

          <div className="flex-1">
            <div className="h-2.5 w-[65%] animate-pulse bg-[#eae2ce]" />

            <div className="mt-2 h-2 w-[45%] animate-pulse bg-[#eae2ce]" />

            <div className="mt-2 h-2 w-[55%] animate-pulse bg-[#eae2ce]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getActionIcon(
  action: string,
) {
  switch (
    action
      .trim()
      .toLowerCase()
  ) {
    case 'receive':
      return (
        <ArrowDownToLine
          size={16}
          strokeWidth={1.6}
        />
      );

    case 'issue':
      return (
        <ArrowUpFromLine
          size={16}
          strokeWidth={1.6}
        />
      );

    case 'transfer':
      return (
        <ArrowLeftRight
          size={16}
          strokeWidth={1.6}
        />
      );

    case 'adjustment':
    case 'adjust':
      return (
        <ClipboardPenLine
          size={16}
          strokeWidth={1.6}
        />
      );

    case 'opening_balance':
      return (
        <ArrowDownToLine
          size={16}
          strokeWidth={1.6}
        />
      );

    default:
      return (
        <History
          size={16}
          strokeWidth={1.6}
        />
      );
  }
}

function formatAction(
  action: string,
) {
  switch (
    action
      .trim()
      .toLowerCase()
  ) {
    case 'receive':
      return 'Received stock';

    case 'issue':
      return 'Issued stock';

    case 'transfer':
      return 'Transferred stock';

    case 'adjustment':
    case 'adjust':
      return 'Adjusted stock';

    case 'opening_balance':
      return 'Opening stock';

    default:
      return action
        ? action
            .replace(/_/g, ' ')
            .replace(
              /\b\w/g,
              (character) =>
                character.toUpperCase(),
            )
        : 'Inventory activity';
  }
}

function formatQuantity(
  quantity: number,
) {
  if (quantity > 0) {
    return `+${new Intl.NumberFormat(
      'en-NG',
    ).format(quantity)}`;
  }

  return new Intl.NumberFormat(
    'en-NG',
  ).format(quantity);
}

function formatDateTime(
  timestamp: string,
) {
  if (!timestamp) {
    return '—';
  }

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return timestamp;
  }

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const year =
    date.getFullYear();

  const hours = String(
    date.getHours(),
  ).padStart(2, '0');

  const minutes = String(
    date.getMinutes(),
  ).padStart(2, '0');

  const seconds = String(
    date.getSeconds(),
  ).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}