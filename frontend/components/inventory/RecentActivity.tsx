'use client';

import {
  Activity as ActivityIcon,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ClipboardPenLine,
  CircleDot,
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
const FETCH_LIMIT = 50;

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

  const visibleActivity =
    useMemo(() => {
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

  const firstVisible =
    activity.length === 0
      ? 0
      : (currentPage - 1) *
          PAGE_SIZE +
        1;

  const lastVisible =
    Math.min(
      currentPage * PAGE_SIZE,
      activity.length,
    );

  useEffect(() => {
    setCurrentPage(
      (page) =>
        Math.min(
          page,
          totalPages,
        ),
    );
  }, [totalPages]);

  function goToPreviousPage() {
    setCurrentPage(
      (page) =>
        Math.max(1, page - 1),
    );
  }

  function goToNextPage() {
    setCurrentPage(
      (page) =>
        Math.min(
          totalPages,
          page + 1,
        ),
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-[var(--accent)]">
            <History
              size={13}
              strokeWidth={1.7}
            />

            LIVE INVENTORY FEED
          </div>

          <h2 className="mt-1 font-sans text-[23px] font-semibold tracking-[-0.025em]">
            Recent Activity
          </h2>

          <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
            Latest stock movements
            across the organization.
          </p>
        </div>

        {!loading &&
          !error &&
          activity.length > 0 && (
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-soft)]">
              Showing {firstVisible}–
              {lastVisible} of{' '}
              {activity.length}
            </div>
          )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-[var(--surface)] shadow-[0_6px_18px_rgba(23,23,23,0.045)]">
        {loading ? (
          <ActivityLoading />
        ) : error ? (
          <div className="flex flex-1 items-center justify-center px-5 py-10 text-center">
            <div>
              <CircleDot
                size={22}
                strokeWidth={1.4}
                className="mx-auto text-[var(--danger)]"
              />

              <div className="mt-3 text-[12px] text-[var(--danger)]">
                {error}
              </div>
            </div>
          </div>
        ) : activity.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-5 py-10 text-center">
            <div>
              <CircleDot
                size={22}
                strokeWidth={1.4}
                className="mx-auto text-[var(--text-soft)]"
              />

              <div className="mt-3 text-[12px] text-[var(--text-muted)]">
                No recent inventory
                activity.
              </div>
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

            {totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                <button
                  type="button"
                  onClick={
                    goToPreviousPage
                  }
                  disabled={
                    currentPage === 1
                  }
                  className="min-h-[36px] rounded-[8px] px-3 font-mono text-[9px] tracking-[0.08em] text-[var(--navy)] transition-colors hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ← PREVIOUS
                </button>

                <span className="rounded-[8px] bg-[var(--surface)] px-3 py-2 font-mono text-[9px] font-medium tracking-[0.1em] text-[var(--text-muted)]">
                  PAGE {currentPage}{' '}
                  OF {totalPages}
                </span>

                <button
                  type="button"
                  onClick={
                    goToNextPage
                  }
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  className="min-h-[36px] rounded-[8px] px-3 font-mono text-[9px] tracking-[0.08em] text-[var(--navy)] transition-colors hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  NEXT →
                </button>
              </div>
            )}
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
    Number(event.quantity ?? 0);

  const action =
    formatAction(
      event.action ??
        event.txnType ??
        '',
    );

  const timestamp =
    formatDateTime(
      event.timestamp ??
        event.createdAt ??
        '',
    );

  const itemName =
    event.item?.name ??
    'Unknown item';

  const locationName =
    event.location?.name ??
    'Unknown location';

  const actor =
    event.performedBy?.name ??
    event.performedBy?.email ??
    'System';

  const actionIcon =
    getActionIcon(
      event.action ??
        event.txnType ??
        '',
    );

  const isNegative =
    quantity < 0;

  return (
    <div
      className="border-b border-[var(--border)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-soft)]"
      style={{
        animationDelay: `${Math.min(
          index * 55,
          500,
        )}ms`,
      }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ${
            isNegative
              ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
              : 'bg-[var(--success-soft)] text-[var(--success)]'
          }`}
        >
          {actionIcon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-5">
            <span
              className={`font-medium ${
                isNegative
                  ? 'text-[var(--danger)]'
                  : 'text-[var(--navy)]'
              }`}
            >
              {action}
            </span>

            <span className="text-[var(--text-soft)]">
              ·
            </span>

            <span className="font-medium text-[var(--text)]">
              {itemName}
            </span>

            <span className="text-[var(--text-soft)]">
              ·
            </span>

            <span
              className={
                isNegative
                  ? 'text-[var(--danger)]'
                  : 'text-[var(--success)]'
              }
            >
              {quantity > 0
                ? `+${quantity}`
                : quantity}{' '}
              units
            </span>

            <span className="text-[var(--text-soft)]">
              ·
            </span>

            <span className="text-[var(--text-muted)]">
              {locationName}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-[var(--text-soft)]">
            <span>
              {timestamp}
            </span>

            <span>
              BY {actor}
            </span>

            {event.reference && (
              <>
                <span>·</span>
                <span>
                  REF {event.reference}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityLoading() {
  return (
    <div className="flex-1">
      {[0, 1, 2, 3, 4].map(
        (index) => (
          <div
            key={index}
            className="flex min-h-[86px] items-center gap-4 border-b border-[var(--border)] px-4 py-4"
          >
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-[9px] bg-[var(--surface-soft)]" />

            <div className="flex-1 space-y-2">
              <div className="h-3 w-[72%] animate-pulse rounded bg-[var(--surface-soft)]" />

              <div className="h-2.5 w-[38%] animate-pulse rounded bg-[var(--surface-soft)]" />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function getActionIcon(action: string) {
  switch (action) {
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
      return (
        <ClipboardPenLine
          size={16}
          strokeWidth={1.6}
        />
      );

    default:
      return (
        <ActivityIcon
          size={16}
          strokeWidth={1.6}
        />
      );
  }
}

function formatAction(
  action: string,
) {
  switch (action) {
    case 'receive':
      return 'Received stock';

    case 'issue':
      return 'Issued stock';

    case 'transfer':
      return 'Transferred stock';

    case 'adjustment':
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

  return new Intl.DateTimeFormat(
    'en-NG',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    },
  ).format(date);
}