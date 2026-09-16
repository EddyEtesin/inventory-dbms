'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { RecentActivity as RecentActivityRecord } from '../../types/inventory';

export default function RecentActivity() {
  const [activity, setActivity] = useState<
    RecentActivityRecord[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        const token =
          window.localStorage.getItem('accessToken');

        if (!token) {
          return;
        }

        const response = await apiFetch<
          RecentActivityRecord[] | {
            data: RecentActivityRecord[];
          }
        >(
          '/inventory/activity/recent?limit=10',
          token,
        );

        const records = Array.isArray(response)
          ? response
          : Array.isArray(response.data)
            ? response.data
            : [];

        setActivity(records);
      } catch (error) {
        console.error(
          'Unable to load recent inventory activity:',
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, []);

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <div className="font-mono text-[8px] text-[#5b5346]">
            CHRONOLOGICAL LEDGER
          </div>

          <h2 className="font-mono text-[17px]">
            RECENT ACTIVITY
          </h2>
        </div>

        <div className="font-mono text-[7px] text-[#5b5346]">
          LAST 10 EVENTS
        </div>
      </div>

      <div className="overflow-hidden border border-[#b7a87e] bg-[#f5f0e3] shadow-[1px_2px_0_#b7a87e]">
        <div className="hidden grid-cols-[72px_85px_minmax(180px,1.6fr)_130px_70px_110px] gap-2 border-b border-[#b7a87e] bg-[#ddd0b8] px-3 py-2 font-mono text-[7px] tracking-widest text-[#5b5346] md:grid">
          <span>TIME</span>
          <span>ACTION</span>
          <span>ITEM</span>
          <span>LOCATION</span>
          <span>QTY</span>
          <span>BY</span>
        </div>

        {loading ? (
          <div className="px-4 py-5 text-center font-mono text-[8px] text-[#5b5346]">
            LOADING ACTIVITY...
          </div>
        ) : activity.length === 0 ? (
          <div className="px-4 py-5 text-center font-mono text-[8px] italic text-[#5b5346]">
            No recent activity found.
          </div>
        ) : (
          activity.map((event, index) => {
            const quantity = event.quantity ?? 0;

            const action = formatAction(
              event.action ??
                event.txnType ??
                '',
            );

            const time = formatTime(
              event.timestamp ??
                event.createdAt ??
                '',
            );

            const itemName =
              event.item?.name ?? '—';

            const locationName =
              event.location?.name ?? '—';

            const actor =
              event.performedBy?.name ??
              event.performedBy?.email ??
              '—';

            return (
              <div
                key={
                  event.id ??
                  `${time}-${action}-${index}`
                }
                className="grid grid-cols-1 gap-1 border-b border-dashed border-[#b7a87e] px-3 py-2.5 last:border-b-0 md:grid-cols-[72px_85px_minmax(180px,1.6fr)_130px_70px_110px] md:items-center md:gap-2"
              >
                <span className="font-mono text-[7px] text-[#5b5346]">
                  {time}
                </span>

                <span className="font-mono text-[7px]">
                  {action}
                </span>

                <span className="truncate font-mono text-[8px]">
                  {itemName}
                </span>

                <span className="truncate font-mono text-[7px] text-[#5b5346]">
                  {locationName}
                </span>

                <span
                  className={`font-mono text-[8px] ${
                    quantity >= 0
                      ? 'text-[#3d6b4f]'
                      : 'text-[#a63a2e]'
                  }`}
                >
                  {quantity > 0 ? '+' : ''}
                  {quantity}
                </span>

                <span className="truncate font-mono text-[7px] text-[#5b5346]">
                  {actor}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function formatAction(action: string) {
  switch (action) {
    case 'receive':
      return 'RECEIVED';

    case 'issue':
      return 'ISSUED';

    case 'transfer':
      return 'TRANSFER';

    case 'adjustment':
      return 'ADJUSTED';

    case 'opening_balance':
      return 'OPENING';

    default:
      return action
        ? action.toUpperCase()
        : 'EVENT';
  }
}

function formatTime(timestamp: string) {
  if (!timestamp) {
    return '—';
  }

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