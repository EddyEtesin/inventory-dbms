'use client';

import {
  Activity,
  Clock3,
  History,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import InventorySidebar from '../components/inventory/InventorySidebar';
import InventoryStats from '../components/inventory/InventoryStats';
import QuickActions from '../components/inventory/QuickActions';
import RecentActivity from '../components/inventory/RecentActivity';

import { apiFetch } from '../lib/api';

import type {
  RegisterItem,
  RegisterResponse,
} from '../types/inventory';

type OrganizationLocation = {
  id: string;
  name: string;
  locationType: string;
  status?: string;
};

type MovementBucket = {
  date: string;
  received: number;
  issued: number;
  adjusted: number;
  transferred: number;
};

type MovementTrendResponse = {
  days: number;
  fromDate: string;
  toDate: string;
  totals: {
    received: number;
    issued: number;
    adjusted: number;
    transferred: number;
  };
  data: MovementBucket[];
};

const SIDEBAR_STORAGE_KEY =
  'stockpile.sidebar.collapsed';

export default function DashboardPage() {
  const [collapsed, setCollapsed] =
    useState(false);

  const [lastSyncedAt, setLastSyncedAt] =
    useState<Date | null>(null);

  const [items, setItems] =
    useState<RegisterItem[]>([]);

  const [
    organizationLocations,
    setOrganizationLocations,
  ] = useState<OrganizationLocation[]>(
    [],
  );

  const [dashboardLoading, setDashboardLoading] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState('');

  const [movement, setMovement] =
    useState<MovementTrendResponse | null>(
      null,
    );

  const [movementLoading, setMovementLoading] =
    useState(true);

  const [movementError, setMovementError] =
    useState('');

  /*
   * --------------------------------------------------
   * SIDEBAR
   * --------------------------------------------------
   */

  useEffect(() => {
    const savedState =
      window.localStorage.getItem(
        SIDEBAR_STORAGE_KEY,
      );

    if (savedState !== null) {
      setCollapsed(
        savedState === 'true',
      );
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;

      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        String(next),
      );

      return next;
    });
  }

  /*
   * --------------------------------------------------
   * LOAD INVENTORY + LOCATIONS
   * --------------------------------------------------
   */

  async function loadDashboardData(): Promise<boolean> {
    try {
      setDashboardLoading(true);
      setDashboardError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        throw new Error(
          'Please sign in first.',
        );
      }

      const [
        registerResponse,
        locationResponse,
      ] = await Promise.all([
        apiFetch<RegisterResponse>(
          '/inventory/register',
          token,
        ),

        apiFetch<
          OrganizationLocation[] | {
            data: OrganizationLocation[];
          }
        >(
          '/locations',
          token,
        ),
      ]);

      setItems(
        registerResponse.data,
      );

      const locations =
        Array.isArray(
          locationResponse,
        )
          ? locationResponse
          : Array.isArray(
              locationResponse.data,
            )
            ? locationResponse.data
            : [];

      setOrganizationLocations(
        locations,
      );

      return true;
    } catch (err) {
      setDashboardError(
        err instanceof Error
          ? err.message
          : 'Unable to load dashboard data.',
      );

      return false;
    } finally {
      setDashboardLoading(false);
    }
  }

  /*
   * --------------------------------------------------
   * LOAD STOCK MOVEMENT
   * --------------------------------------------------
   */

  async function loadMovement(): Promise<boolean> {
    try {
      setMovementLoading(true);
      setMovementError('');

      const token =
        window.localStorage.getItem(
          'accessToken',
        );

      if (!token) {
        throw new Error(
          'Please sign in first.',
        );
      }

      const response =
        await apiFetch<MovementTrendResponse>(
          '/inventory/movement-trend?days=30',
          token,
        );

      if (
        !response ||
        !response.totals ||
        !Array.isArray(response.data)
      ) {
        throw new Error(
          'Stock movement response is incomplete.',
        );
      }

      const normalized: MovementTrendResponse = {
        days: Number(
          response.days,
        ),

        fromDate:
          response.fromDate,

        toDate:
          response.toDate,

        totals: {
          received: Number(
            response.totals.received ??
              0,
          ),

          issued: Number(
            response.totals.issued ??
              0,
          ),

          adjusted: Number(
            response.totals.adjusted ??
              0,
          ),

          transferred: Number(
            response.totals.transferred ??
              0,
          ),
        },

        data: response.data.map(
          (bucket) => ({
            date: bucket.date,

            received: Number(
              bucket.received ?? 0,
            ),

            issued: Number(
              bucket.issued ?? 0,
            ),

            adjusted: Number(
              bucket.adjusted ?? 0,
            ),

            transferred: Number(
              bucket.transferred ?? 0,
            ),
          }),
        ),
      };

      setMovement(normalized);

      return true;
    } catch (err) {
      setMovementError(
        err instanceof Error
          ? err.message
          : 'Unable to load stock movement.',
      );

      return false;
    } finally {
      setMovementLoading(false);
    }
  }

  /*
   * --------------------------------------------------
   * REFRESH DASHBOARD
   *
   * One refresh function is used both on first load
   * and after a successful stock operation.
   * --------------------------------------------------
   */

  async function refreshDashboard() {
    const [
      dashboardSuccess,
      movementSuccess,
    ] = await Promise.all([
      loadDashboardData(),
      loadMovement(),
    ]);

    if (
      dashboardSuccess &&
      movementSuccess
    ) {
      setLastSyncedAt(
        new Date(),
      );
    }
  }

  useEffect(() => {
    refreshDashboard();
  }, []);

  /*
   * --------------------------------------------------
   * MOVEMENT DATA
   * --------------------------------------------------
   */

  const movementTotals =
    movement?.totals ?? {
      received: 0,
      issued: 0,
      adjusted: 0,
      transferred: 0,
    };

  /*
   * Keep every daily bucket.
   * MovementChart is responsible only for
   * thinning the date labels.
   */
  const chartData =
    movement?.data ?? [];

  const chartMax = useMemo(() => {
    return Math.max(
      1,
      ...(movement?.data ?? []).flatMap(
        (bucket) => [
          bucket.received,
          bucket.issued,
          bucket.adjusted,
          bucket.transferred,
        ],
      ),
    );
  }, [movement]);

  /*
   * --------------------------------------------------
   * QUICK ACTION COMPLETION
   *
   * Do not reload the entire browser.
   * --------------------------------------------------
   */

  async function handleQuickActionCompleted() {
    await refreshDashboard();
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={
          toggleCollapsed
        }
      />

      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          collapsed
            ? 'md:pl-[68px]'
            : 'md:pl-[205px]'
        }`}
      >
        <div className="px-4 py-5 md:px-7 md:py-7">
          <div className="mx-auto max-w-[1500px]">

            {/* ================================================== */}
            {/* DASHBOARD HEADER                                   */}
            {/* ================================================== */}

            <header className="mb-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

                <div className="min-w-0">

                  <div className="mb-3 flex items-center gap-2">

                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />

                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--accent)]">

                      Inventory command centre

                    </span>

                  </div>

                  <h1 className="font-sans text-[38px] font-semibold leading-none tracking-[-0.045em] md:text-[46px]">

                    Dashboard

                  </h1>

                  <p className="mt-3 max-w-[680px] text-[13px] leading-6 text-[var(--text-muted)]">

                    A live overview of your

                    inventory position,

                    stock health and

                    recent operations

                    across your

                    organization.

                  </p>

                </div>

                <div

                  className="flex flex-col items-start gap-2 lg:items-end"

                  aria-live="polite"

                >

                  <div className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 shadow-[0_3px_12px_rgba(23,23,23,0.03)]">

                    <Clock3

                      size={13}

                      strokeWidth={1.7}

                      className="text-[var(--text-muted)]"

                    />

                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text)]">

                      {lastSyncedAt

                        ? `Last updated · ${formatLastSync(
                            lastSyncedAt,
                          )}`

                        : 'Loading data...'}

                    </span>

                  </div>

                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">

                    Register + movement data

                  </span>

                </div>

              </div>

            </header>

            {/* ================================================== */}
            {/* INVENTORY SNAPSHOT                                 */}
            {/* ================================================== */}

            <section className="mb-8">

              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  <div className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">

                    Inventory snapshot

                  </div>

                  <h2 className="mt-1 font-sans text-[19px] font-semibold tracking-[-0.02em]">

                    Current position

                  </h2>

                </div>

                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">

                  Live database

                </div>

              </div>

              <div className="overflow-hidden">

                <InventoryStats />

              </div>

            </section>

            {/* ================================================== */}
            {/* RECENT ACTIVITY + QUICK ACTIONS                    */}
            {/* ================================================== */}

            <section className="mb-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">

              <div className="min-w-0">

                <RecentActivity />

              </div>

              <div className="min-w-0">

                <div className="mb-4">

                  <div className="mb-2 flex items-center gap-2">

                    <History

                      size={14}

                      strokeWidth={1.7}

                      className="text-[var(--accent)]"

                    />

                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">

                      Operations

                    </span>

                  </div>

                  <h2 className="font-sans text-[23px] font-semibold tracking-[-0.025em]">

                    Quick Actions

                  </h2>

                  <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-muted)]">

                    Perform common stock

                    operations without leaving

                    the dashboard.

                  </p>

                </div>

                {dashboardError ? (

                  <div className="rounded-[12px] border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-4">

                    <div className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--danger)]">

                      Dashboard error

                    </div>

                    <div className="mt-1.5 text-[12px] leading-5 text-[var(--danger)]">

                      {dashboardError}

                    </div>

                  </div>

                ) : (

                  <QuickActions

                    items={items}

                    locations={
                      organizationLocations
                    }

                    onCompleted={
                      handleQuickActionCompleted
                    }

                    compact

                    loading={
                      dashboardLoading
                    }

                  />

                )}

              </div>

            </section>

            {/* ================================================== */}
            {/* STOCK MOVEMENT                                     */}
            {/* ================================================== */}

            <section className="mt-6 overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_6px_18px_rgba(23,23,23,0.045)]">

              <div className="px-5 py-5 md:px-6">

                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">

                  <div>

                    <div className="font-mono text-[9px] tracking-[0.18em] text-[var(--accent)]">

                      STOCK MOVEMENT

                    </div>

                    <h2 className="mt-1 font-sans text-[23px] font-semibold tracking-[-0.025em] text-[var(--text)]">

                      Movement overview

                    </h2>

                    <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">

                      Stock activity across the last 30 days.

                    </p>

                  </div>

                  {!movementLoading && movement?.fromDate && movement?.toDate && (

                    <div className="font-mono text-[9px] tracking-[0.08em] text-[var(--text-soft)]">

                      {formatChartDate(movement.fromDate)} –{' '}

                      {formatChartDate(movement.toDate)}

                    </div>

                  )}

                </div>

              </div>

              <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">

                <MovementMetric

                  label="RECEIVED"

                  value={

                    movementLoading

                      ? '—'

                      : formatQuantity(
                          movementTotals.received,
                        )

                  }

                  tone="success"

                />

                <MovementMetric

                  label="ISSUED"

                  value={

                    movementLoading

                      ? '—'

                      : formatQuantity(
                          movementTotals.issued,
                        )

                  }

                  tone="danger"

                />

                <MovementMetric

                  label="ADJUSTED"

                  value={

                    movementLoading

                      ? '—'

                      : formatQuantity(
                          movementTotals.adjusted,
                        )

                  }

                  tone="neutral"

                />

                <MovementMetric

                  label="TRANSFERRED"

                  value={

                    movementLoading

                      ? '—'

                      : formatQuantity(
                          movementTotals.transferred,
                        )

                  }

                  tone="warning"

                />

              </div>

              <div className="px-4 pb-4 md:px-5 md:pb-5">

                {movementError ? (

                  <div className="rounded-[12px] bg-[var(--danger-soft)] px-4 py-4 text-[11px] text-[var(--danger)]">

                    {movementError}

                  </div>

                ) : movementLoading ? (

                  <MovementChartSkeleton />

                ) : (

                  <MovementChart

                    data={chartData}

                    max={chartMax}

                  />

                )}

              </div>

            </section>

            {/* ================================================== */}
            {/* FOOTER                                             */}
            {/* ================================================== */}

            <footer className="mt-7 border-t border-[var(--border)] pt-4">

              <div className="flex flex-col gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--text-soft)] md:flex-row md:items-center md:justify-between">

                <span>

                  Stockpile · Inventory command centre

                </span>

                <span>

                  Live database

                </span>

              </div>

            </footer>

          </div>

        </div>

      </div>

    </main>

  );
}

/* ================================================== */
/* MOVEMENT METRIC                                    */
/* ================================================== */

function MovementMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | 'success'
    | 'danger'
    | 'neutral'
    | 'warning';
}) {
  const valueClass =
    tone === 'success'
      ? 'text-[var(--success)]'
      : tone === 'danger'
        ? 'text-[var(--danger)]'
        : tone === 'warning'
          ? 'text-[var(--warning)]'
          : 'text-[var(--navy)]';

  return (
    <div className="rounded-[12px] bg-[var(--surface-soft)] px-4 py-4">

      <div className="font-mono text-[9px] tracking-[0.14em] text-[var(--text-soft)]">

        {label}

      </div>

      <div

        className={`

          mt-2

          font-sans

          text-[25px]

          font-semibold

          leading-none

          tracking-[-0.025em]

          ${valueClass}

        `}

      >

        {value}

      </div>

    </div>
  );
}

/* ================================================== */
/* MOVEMENT CHART                                     */
/* ================================================== */

function MovementChart({
  data,
  max,
}: {
  data: MovementBucket[];
  max: number;
}) {
  const [hoveredBucket, setHoveredBucket] =
    useState<MovementBucket | null>(null);

  const [tooltipVisible, setTooltipVisible] =
    useState(false);

  const [tooltipPosition, setTooltipPosition] =
    useState({
      x: 0,
      y: 0,
    });

  if (data.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-[12px] bg-[var(--surface-soft)]">

        <div className="text-center">

          <div className="font-mono text-[9px] tracking-[0.16em] text-[var(--text-muted)]">

            MOVEMENT TREND

          </div>

          <div className="mt-2 text-[11px] text-[var(--text-soft)]">

            No stock movement recorded in the selected period.

          </div>

        </div>

      </div>
    );
  }

  const chartWidth = 1100;
  const chartHeight = 320;

  const paddingLeft = 56;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 48;

  const innerWidth =
    chartWidth -
    paddingLeft -
    paddingRight;

  const innerHeight =
    chartHeight -
    paddingTop -
    paddingBottom;

  const groupWidth =
    innerWidth / data.length;

  const barGap = 3;

  const labelStep = Math.max(
    1,
    Math.ceil(data.length / 10),
  );

  const barWidth = Math.max(
    5,
    Math.min(
      15,
      (groupWidth - 12) / 4,
    ),
  );

  const groupBarWidth =
    barWidth * 4 +
    barGap * 3;

  const scale =
    getNiceChartScale(max);

  const y = (value: number) => {
    return (
      paddingTop +
      innerHeight -
      (value / scale.max) *
        innerHeight
    );
  };

  function showTooltip(
    bucket: MovementBucket,
    groupCenter: number,
    pointY: number,
  ) {
    setHoveredBucket(bucket);
    setTooltipVisible(true);

    setTooltipPosition({
      x: groupCenter,
      y: Math.max(16, pointY),
    });
  }

  function hideTooltip() {
    setTooltipVisible(false);
  }

  return (
    <div className="overflow-hidden rounded-[12px] bg-[var(--surface-soft)] p-4">

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[var(--muted)]">

          <LegendMark
            label="RECEIVED"
            className="bg-[var(--success)]"
          />

          <LegendMark
            label="ISSUED"
            className="bg-[var(--danger)]"
          />

          <LegendMark
            label="ADJUSTED"
            className="bg-[var(--navy)]"
          />

          <LegendMark
            label="TRANSFERRED"
            className="bg-[var(--warning)]"
          />

        </div>

        <div className="font-mono text-[9px] tracking-[0.08em] text-[var(--text-soft)]">

          DAILY VOLUME

        </div>

      </div>

      <div className="overflow-x-auto overscroll-x-contain">

        <div className="min-w-[760px]">

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-[300px] w-full overflow-visible"
            role="img"
            aria-label="Stock movement over the last 30 days"
          >

            {scale.ticks.map(
              (tick, index) => {
                const tickY = y(tick);

                return (
                  <g
                    key={`y-tick-${index}`}
                  >

                    <line
                      x1={paddingLeft}
                      x2={
                        chartWidth -
                        paddingRight
                      }
                      y1={tickY}
                      y2={tickY}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray="2 5"
                      opacity="0.75"
                    />

                    <text
                      x={
                        paddingLeft -
                        10
                      }
                      y={tickY + 4}
                      textAnchor="end"
                      fill="var(--text-soft)"
                      fontSize="10"
                      fontFamily="monospace"
                    >

                      {formatQuantity(
                        tick,
                      )}

                    </text>

                  </g>
                );
              },
            )}

            <line
              x1={paddingLeft}
              x2={
                chartWidth -
                paddingRight
              }
              y1={
                paddingTop +
                innerHeight
              }
              y2={
                paddingTop +
                innerHeight
              }
              stroke="var(--border-strong)"
              strokeWidth="1"
            />

            {data.map(
              (bucket, index) => {
                const groupCenter =
                  paddingLeft +
                  index *
                    groupWidth +
                  groupWidth / 2;

                const groupStart =
                  groupCenter -
                  groupBarWidth /
                    2;

                const entries = [
                  {
                    label: 'Received',
                    value:
                      bucket.received,
                    color:
                      'var(--success)',
                  },
                  {
                    label: 'Issued',
                    value:
                      bucket.issued,
                    color:
                      'var(--danger)',
                  },
                  {
                    label: 'Adjusted',
                    value:
                      bucket.adjusted,
                    color:
                      'var(--navy)',
                  },
                  {
                    label: 'Transferred',
                    value:
                      bucket.transferred,
                    color:
                      'var(--warning)',
                  },
                ];

                return (
                  <g
                    key={
                      bucket.date
                    }
                  >
                    {entries.map(
                      (
                        entry,
                        barIndex,
                      ) => {
                        const barHeight =
                          entry.value >
                          0
                            ? Math.max(
                                2,
                                (entry.value /
                                  scale.max) *
                                  innerHeight,
                              )
                            : 0;

                        const barX =
                          groupStart +
                          barIndex *
                            (barWidth +
                              barGap);

                        const barY =
                          paddingTop +
                          innerHeight -
                          barHeight;

                        return (
                          <rect
                            key={`${bucket.date}-${entry.label}`}
                            x={barX}
                            y={barY}
                            width={
                              barWidth
                            }
                            height={
                              barHeight
                            }
                            rx="2"
                            fill={
                              entry.color
                            }
                            opacity={
                              hoveredBucket?.date ===
                              bucket.date
                                ? 1
                                : 0.82
                            }
                            className="cursor-pointer transition-opacity"
                            tabIndex={0}
                            role="img"
                            aria-label={`${entry.label}: ${entry.value} on ${formatLongChartDate(bucket.date)}`}
                            onMouseEnter={() =>
                              showTooltip(
                                bucket,
                                groupCenter,
                                barY,
                              )
                            }
                            onFocus={() =>
                              showTooltip(
                                bucket,
                                groupCenter,
                                barY,
                              )
                            }
                            onMouseLeave={
                              hideTooltip
                            }
                            onBlur={
                              hideTooltip
                            }
                          />
                        );
                      },
                    )}

                    {(data.length - 1 - index) % labelStep === 0 && (
                      <text
                        x={groupCenter}
                        y={chartHeight - 16}
                        textAnchor="middle"
                        fill="var(--text-soft)"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {formatChartDate(bucket.date)}
                      </text>
                    )}

                  </g>
                );
              },
            )}

          </svg>

        </div>

      </div>

      {hoveredBucket && (

        <div
          aria-hidden={!tooltipVisible}
          className="pointer-events-none absolute z-20 w-[220px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-[0_10px_24px_rgba(23,23,23,0.12)] transition-[left,top,opacity,transform] duration-150"
          style={{
            left: `${
              (tooltipPosition.x /
                chartWidth) *
              100
            }%`,
            top: `${
              (tooltipPosition.y /
                chartHeight) *
              100
            }%`,
            opacity:
              tooltipVisible ? 1 : 0,
            transform: `translate(-50%, -100%) translateY(${
              tooltipVisible
                ? '-8px'
                : '-3px'
            }) scale(${
              tooltipVisible
                ? 1
                : 0.98
            })`,
          }}
        >

          <div className="border-b border-[var(--border)] pb-2">

            <div className="font-sans text-[12px] font-semibold text-[var(--text)]">

              {formatLongChartDate(
                hoveredBucket.date,
              )}

            </div>

            <div className="mt-1 font-mono text-[8px] tracking-[0.12em] text-[var(--text-soft)]">

              DAILY STOCK MOVEMENT

            </div>

          </div>

          <div className="mt-3 space-y-2">

            <TooltipMetric
              label="RECEIVED"
              value={
                hoveredBucket.received
              }
              className="bg-[var(--success)]"
            />

            <TooltipMetric
              label="ISSUED"
              value={
                hoveredBucket.issued
              }
              className="bg-[var(--danger)]"
            />

            <TooltipMetric
              label="ADJUSTED"
              value={
                hoveredBucket.adjusted
              }
              className="bg-[var(--navy)]"
            />

            <TooltipMetric
              label="TRANSFERRED"
              value={
                hoveredBucket.transferred
              }
              className="bg-[var(--warning)]"
            />

          </div>

        </div>
      )}

      <div className="mt-2 text-[10px] text-[var(--text-soft)]">

        Hover or focus a bar to view the daily breakdown.

      </div>

    </div>
  );
}

/* ================================================== */
/* nice chart scale                                   */
/* ================================================== */

function getNiceChartScale(
  maxValue: number,
) {
  const safeMax =
    Math.max(1, maxValue);

  const roughStep =
    safeMax / 4;

  const magnitude =
    Math.pow(
      10,
      Math.floor(
        Math.log10(
          roughStep,
        ),
      ),
    );

  const normalized =
    roughStep / magnitude;

  let niceNormalized: number;

  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  } else {
    niceNormalized = 10;
  }

  const step =
    niceNormalized *
    magnitude;

  const max =
    Math.max(
      step * 4,
      Math.ceil(
        safeMax / step,
      ) * step,
    );

  return {
    max,
    step,
    ticks: Array.from(
      { length: 5 },
      (_, index) =>
        index * step,
    ),
  };
}

/* ================================================== */
/* MOVEMENT CHART SKELETON                            */
/* ================================================== */

function MovementChartSkeleton() {
  return (
    <div className="rounded-[12px] bg-[var(--surface-soft)] p-4">

      <div className="mb-4 flex gap-4">

        {[0, 1, 2, 3].map((index) => (

          <div
            key={index}
            className="h-3 w-20 animate-pulse rounded bg-[var(--surface-muted)]"
          />

        ))}

      </div>

      <div className="relative h-[300px] overflow-hidden rounded-[8px]">

        <div className="absolute inset-x-0 top-[15%] h-px bg-[var(--border)]" />

        <div className="absolute inset-x-0 top-[38%] h-px bg-[var(--border)]" />

        <div className="absolute inset-x-0 top-[61%] h-px bg-[var(--border)]" />

        <div className="absolute inset-x-0 bottom-[12%] h-px bg-[var(--border)]" />

        <div className="absolute bottom-[12%] left-[12%] h-[18%] w-5 animate-pulse rounded-t-[3px] bg-[var(--surface-muted)]" />

        <div className="absolute bottom-[12%] left-[22%] h-[38%] w-5 animate-pulse rounded-t-[3px] bg-[var(--surface-muted)]" />

        <div className="absolute bottom-[12%] left-[34%] h-[25%] w-5 animate-pulse rounded-t-[3px] bg-[var(--surface-muted)]" />

        <div className="absolute bottom-[12%] left-[46%] h-[52%] w-5 animate-pulse rounded-t-[3px] bg-[var(--surface-muted)]" />

        <div className="absolute bottom-[12%] left-[58%] h-[31%] w-5 animate-pulse rounded-t-[3px] bg-[var(--surface-muted)]" />

        <div className="absolute bottom-[12%] left-[70%] h-[44%] w-5 animate-pulse rounded-t-[3px] bg-[var(--surface-muted)]" />

        <div className="absolute bottom-[12%] left-[82%] h-[20%] w-5 animate-pulse rounded-t-[3px] bg-[var(--surface-muted)]" />

      </div>

    </div>
  );
}

/* ================================================== */
/* CHART SCALE                                        */
/* ================================================== */

function getChartScale(
  maxValue: number,
) {
  if (maxValue <= 5) {
    return {
      step: 1,
      max: Math.max(
        1,
        Math.ceil(maxValue),
      ),
    };
  }

  const roughStep =
    maxValue / 4;

  const magnitude =
    10 **
    Math.floor(
      Math.log10(
        roughStep,
      ),
    );

  const normalized =
    roughStep /
    magnitude;

  const niceNormalized =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 5
          ? 5
          : 10;

  const step =
    niceNormalized *
    magnitude;

  const axisMax =
    Math.ceil(
      maxValue / step,
    ) * step;

  return {
    step,
    max: axisMax,
  };
}

/* ================================================== */
/* TOOLTIP METRIC                                    */
/* ================================================== */

function TooltipMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">

      <div className="flex items-center gap-2">

        <span
          className={`h-2 w-2 shrink-0 rounded-full ${className}`}
        />

        <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-[var(--text-muted)]">

          {label}

        </span>

      </div>

      <span className="font-mono text-[10px] font-semibold text-[var(--text)]">

        {formatQuantity(value)}

      </span>

    </div>
  );
}

/* ================================================== */
/* LAST SYNC                                          */
/* ================================================== */

function formatLastSync(
  value: Date,
) {
  return new Intl.DateTimeFormat(
    'en-NG',
    {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
  ).format(value);
}

/* ================================================== */
/* LONG DATE                                         */
/* ================================================== */

function formatLongChartDate(
  value: string,
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-NG',
    {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date);
}

/* ================================================== */
/* LEGEND                                            */
/* ================================================== */

function LegendMark({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className="flex items-center gap-2">

      <span
        className={`h-2 w-2 rounded-full ${className}`}
      />

      {label}

    </span>
  );
}

/* ================================================== */
/* QUANTITY                                          */
/* ================================================== */

function formatQuantity(
  value: number,
) {
  return new Intl.NumberFormat(
    'en-NG',
  ).format(value);
}

/* ================================================== */
/* CHART DATE                                        */
/* ================================================== */

function formatChartDate(
  value: string,
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-NG',
    {
      day: '2-digit',
      month: 'short',
    },
  ).format(date);
}