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

export default function DashboardPage() {
  const [collapsed, setCollapsed] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState('');

  const [items, setItems] =
    useState<RegisterItem[]>([]);

  const [organizationLocations, setOrganizationLocations] =
    useState<OrganizationLocation[]>([]);

  const [dashboardLoading, setDashboardLoading] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState('');

  const [movement, setMovement] =
    useState<MovementTrendResponse | null>(null);

  const [movementLoading, setMovementLoading] =
    useState(true);

  const [movementError, setMovementError] =
    useState('');

  useEffect(() => {
    function updateClock() {
      setCurrentTime(
        new Intl.DateTimeFormat(
          'en-NG',
          {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          },
        ).format(new Date()),
      );
    }

    updateClock();

    const interval =
      window.setInterval(
        updateClock,
        1000,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
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
      } catch (err) {
        setDashboardError(
          err instanceof Error
            ? err.message
            : 'Unable to load dashboard data.',
        );
      } finally {
        setDashboardLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  useEffect(() => {
    async function loadMovement() {
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
            '/inventory/movement-trend?days=7',
            token,
          );

        setMovement(response);
      } catch (err) {
        setMovementError(
          err instanceof Error
            ? err.message
            : 'Unable to load stock movement.',
        );
      } finally {
        setMovementLoading(false);
      }
    }

    loadMovement();
  }, []);

  const movementTotals =
    movement?.totals ?? {
      received: 0,
      issued: 0,
      adjusted: 0,
      transferred: 0,
    };

  const chartData = useMemo(() => {
    const data =
      movement?.data ?? [];

    const step = Math.max(
      1,
      Math.ceil(
        data.length / 10,
      ),
    );

    return data.filter(
      (_, index) =>
        index % step === 0 ||
        index === data.length - 1,
    );
  }, [movement]);

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

  async function handleQuickActionCompleted() {
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-[#d5c8ae] text-[#2b2620]">
      <InventorySidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed(
            (current) => !current,
          )
        }
      />

      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          collapsed
            ? 'md:pl-[68px]'
            : 'md:pl-[205px]'
        }`}
      >
        <div className="p-3 md:p-5">
          <div className="mx-auto max-w-[1450px]">

            {/* COMMAND CENTRE HEADER */}
            <section className="overflow-hidden border border-[#2e4057] bg-[#f5f0e3] shadow-[0_3px_0_#2e4057,0_14px_30px_rgba(43,38,32,0.12)]">
              <div className="flex flex-col gap-4 bg-[#2e4057] px-5 py-5 text-[#f5f0e3] md:flex-row md:items-center md:justify-between md:px-7">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[7px] tracking-[0.25em] text-[#d5c8ae]">
                    <Activity
                      size={11}
                      strokeWidth={1.8}
                    />

                    INVENTORY COMMAND CENTRE
                  </div>

                  <h1 className="mt-2 font-mono text-[27px] leading-none tracking-[0.03em]">
                    DASHBOARD
                  </h1>

                  <p className="mt-2 max-w-[650px] font-mono text-[8px] leading-5 text-[#ddd0b8]">
                    A live overview of your
                    inventory position, stock
                    health and the latest
                    activity across your
                    organization.
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <div className="flex items-center gap-2 border border-[#d5c8ae]/40 px-3 py-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8db596]" />

                    <span className="font-mono text-[7px] tracking-widest">
                      SYSTEM OPERATIONAL
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[7px] text-[#d5c8ae]">
                    <Clock3
                      size={11}
                      strokeWidth={1.6}
                    />

                    {currentTime
                      ? `SYNC ${currentTime}`
                      : 'SYNCING...'}
                  </div>
                </div>
              </div>
            </section>

            {/* INVENTORY SNAPSHOT */}
            <section className="mt-5">
              <div className="mb-3">
                <div className="font-mono text-[7px] tracking-[0.2em] text-[#a63a2e]">
                  INVENTORY SNAPSHOT
                </div>
              </div>

              <div className="overflow-hidden border border-[#b7a87e] bg-[#f5f0e3] shadow-[0_2px_0_#b7a87e]">
                <InventoryStats />
              </div>
            </section>

            {/* RECENT ACTIVITY + QUICK ACTIONS */}
            <section className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
                <RecentActivity />
              </div>

              <div className="min-w-0">
                <div className="mb-3">
                  <div className="flex items-center gap-2 font-mono text-[7px] tracking-[0.2em] text-[#a63a2e]">
                    <History
                      size={12}
                      strokeWidth={1.7}
                    />

                    QUICK ACTIONS
                  </div>

                  <h2 className="mt-1 font-mono text-[20px]">
                    Quick Actions
                  </h2>

                  <p className="mt-1 font-mono text-[7px] text-[#5b5346]">
                    Perform stock operations
                    quickly.
                  </p>
                </div>

                {dashboardError ? (
                  <div className="border border-[#a63a2e]/30 bg-[#f5f0e3] px-4 py-4 font-mono text-[8px] text-[#a63a2e]">
                    {dashboardError}
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

            {/* STOCK MOVEMENT */}
            <section className="mt-6 border border-[#b7a87e] bg-[#f5f0e3] shadow-[0_2px_0_#b7a87e]">
              <div className="border-b border-dashed border-[#b7a87e] px-4 py-4 md:px-5">
                <div className="font-mono text-[7px] tracking-[0.2em] text-[#a63a2e]">
                  STOCK MOVEMENT
                </div>

                <h2 className="mt-1 font-mono text-[20px]">
                  Movement overview
                </h2>
              </div>

              <div className="grid border-b border-[#b7a87e] sm:grid-cols-2 lg:grid-cols-4">
                <MovementMetric
                  label="RECEIVED"
                  value={
                    movementLoading
                      ? '—'
                      : formatQuantity(
                          movementTotals.received,
                        )
                  }
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
                />
              </div>

              <div className="p-5">
                {movementError ? (
                  <div className="border border-[#a63a2e]/30 bg-[#eae2ce] px-4 py-4 font-mono text-[8px] text-[#a63a2e]">
                    {movementError}
                  </div>
                ) : movementLoading ? (
                  <div className="flex min-h-[220px] items-center justify-center border border-dashed border-[#b7a87e] bg-[#eae2ce]">
                    <div className="font-mono text-[8px] tracking-[0.18em] text-[#5b5346]">
                      LOADING MOVEMENT DATA...
                    </div>
                  </div>
                ) : (
                  <MovementChart
                    data={chartData}
                    max={chartMax}
                  />
                )}
              </div>
            </section>

            <footer className="mt-6 border-t border-dashed border-[#b7a87e] pt-3">
              <div className="flex flex-col gap-1 font-mono text-[7px] text-[#5b5346] md:flex-row md:items-center md:justify-between">
                <span>
                  STOCKPILE · INVENTORY
                  COMMAND CENTRE
                </span>

                <span>
                  LIVE DATABASE
                </span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

function MovementMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-[#b7a87e] px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="font-mono text-[7px] tracking-[0.16em] text-[#8a7f6b]">
        {label}
      </div>

      <div className="mt-2 font-mono text-[22px] text-[#2e4057]">
        {value}
      </div>
    </div>
  );
}

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
      <div className="flex min-h-[220px] items-center justify-center border border-dashed border-[#b7a87e] bg-[#eae2ce]">
        <div className="text-center">
          <div className="font-mono text-[8px] tracking-[0.18em] text-[#5b5346]">
            MOVEMENT TREND
          </div>

          <div className="mt-2 font-mono text-[7px] leading-4 text-[#8a7f6b]">
            No stock movement recorded
            in the selected period.
          </div>
        </div>
      </div>
    );
  }

  const chartWidth = 1100;
  const chartHeight = 320;

  const paddingLeft = 48;
  const paddingRight = 18;
  const paddingTop = 20;
  const paddingBottom = 48;

  const innerWidth =
    chartWidth - paddingLeft - paddingRight;

  const innerHeight =
    chartHeight - paddingTop - paddingBottom;

  const groupWidth =
    innerWidth / data.length;

  const barGap = 2;

  const barWidth = Math.max(
    4,
    Math.min(
      14,
      (groupWidth - 10) / 4,
    ),
  );

  const groupBarWidth =
    barWidth * 4 + barGap * 3;

  const y = (value: number) => {
    return (
      paddingTop +
      innerHeight -
      (value / Math.max(max, 1)) *
        innerHeight
    );
  };

  const yTicks = Array.from(
    { length: 5 },
    (_, index) =>
      Math.round((max / 4) * index),
  );

  return (
    <div className="relative border border-dashed border-[#b7a87e] bg-[#eae2ce] p-4">
      <div className="mb-4 flex flex-wrap items-center gap-4 font-mono text-[7px] tracking-[0.08em] text-[#5b5346]">
        <LegendMark
          label="RECEIVED"
          className="bg-[#3d6b4f]"
        />

        <LegendMark
          label="ISSUED"
          className="bg-[#a63a2e]"
        />

        <LegendMark
          label="ADJUSTED"
          className="bg-[#2e4057]"
        />

        <LegendMark
          label="TRANSFERRED"
          className="bg-[#c68a2e]"
        />

        <span className="ml-auto">
          {formatChartDate(data[0].date)} –{' '}
          {formatChartDate(
            data[data.length - 1].date,
          )}
        </span>
      </div>

      <div
        className="relative w-full overflow-visible"
        onMouseLeave={() => {
          setTooltipVisible(false);
        }}
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-[300px] w-full overflow-visible"
          role="img"
          aria-label="Stock movement bar chart"
        >
          {yTicks.map((tick, index) => {
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
                  stroke="#b7a87e"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.4"
                />

                <text
                  x={paddingLeft - 8}
                  y={tickY + 3}
                  textAnchor="end"
                  fill="#8a7f6b"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {formatQuantity(tick)}
                </text>
              </g>
            );
          })}

          <line
            x1={paddingLeft}
            x2={paddingLeft}
            y1={paddingTop}
            y2={
              paddingTop +
              innerHeight
            }
            stroke="#b7a87e"
            strokeWidth="1"
            opacity="0.6"
          />

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
            stroke="#b7a87e"
            strokeWidth="1"
            opacity="0.6"
          />

          {data.map((bucket, index) => {
            const groupCenter =
              paddingLeft +
              index * groupWidth +
              groupWidth / 2;

            const groupStart =
              groupCenter -
              groupBarWidth / 2;

            const values = [
              {
                label: 'Received',
                value: bucket.received,
                color: '#3d6b4f',
              },
              {
                label: 'Issued',
                value: bucket.issued,
                color: '#a63a2e',
              },
              {
                label: 'Adjusted',
                value: bucket.adjusted,
                color: '#2e4057',
              },
              {
                label: 'Transferred',
                value: bucket.transferred,
                color: '#c68a2e',
              },
            ];

            return (
              <g key={bucket.date}>
                {values.map(
                  (
                    entry,
                    barIndex,
                  ) => {
                    const barHeight =
                      entry.value > 0
                        ? Math.max(
                            1,
                            (entry.value /
                              Math.max(
                                max,
                                1,
                              )) *
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
                        width={barWidth}
                        height={barHeight}
                        rx="1"
                        fill={
                          entry.color
                        }
                        opacity={
                          hoveredBucket?.date ===
                          bucket.date
                            ? 1
                            : 0.85
                        }
                        onMouseEnter={() => {
                          setHoveredBucket(
                            bucket,
                          );

                          setTooltipVisible(
                            true,
                          );

                          setTooltipPosition(
                            {
                              x: groupCenter,
                              y: Math.max(
                                12,
                                barY - 8,
                              ),
                            },
                          );
                        }}
                      />
                    );
                  },
                )}

                <text
                  x={groupCenter}
                  y={chartHeight - 16}
                  textAnchor="middle"
                  fill="#8a7f6b"
                  fontSize="7"
                  fontFamily="monospace"
                >
                  {formatChartDate(
                    bucket.date,
                  )}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredBucket && (
          <div
            aria-hidden={!tooltipVisible}
            className="pointer-events-none absolute z-20 w-[205px] rounded-[3px] border border-[#b7a87e]/70 bg-[#f5f0e3] px-3 py-3 shadow-[0_5px_14px_rgba(43,38,32,0.10)] transition-[left,top,opacity,transform] duration-150 ease-out"
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
                tooltipVisible ? '-6px' : '-2px'
              }) scale(${
                tooltipVisible ? 1 : 0.97
              })`,
            }}
          >
            <div className="border-b border-dashed border-[#b7a87e]/60 pb-2">
              <div className="font-mono text-[9px] font-bold tracking-[0.06em] text-[#2e4057]">
                {formatLongChartDate(
                  hoveredBucket.date,
                )}
              </div>

              <div className="mt-1 font-mono text-[6px] tracking-[0.14em] text-[#8a7f6b]">
                DAILY STOCK MOVEMENT
              </div>
            </div>

            <div className="mt-2 space-y-1.5">
              <TooltipMetric
                label="RECEIVED"
                value={
                  hoveredBucket.received
                }
                className="bg-[#3d6b4f]"
              />

              <TooltipMetric
                label="ISSUED"
                value={
                  hoveredBucket.issued
                }
                className="bg-[#a63a2e]"
              />

              <TooltipMetric
                label="ADJUSTED"
                value={
                  hoveredBucket.adjusted
                }
                className="bg-[#2e4057]"
              />

              <TooltipMetric
                label="TRANSFERRED"
                value={
                  hoveredBucket.transferred
                }
                className="bg-[#c68a2e]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 font-mono text-[6px] leading-4 text-[#8a7f6b]">
        Hover a bar to view daily movement
        details.
      </div>
    </div>
  );
}

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
      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-[1px] ${className}`}
        />

        <span className="font-mono text-[7px] tracking-[0.06em] text-[#5b5346]">
          {label}
        </span>
      </div>

      <span className="font-mono text-[8px] font-bold text-[#2b2620]">
        {formatQuantity(value)}
      </span>
    </div>
  );
}

function formatLongChartDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'en-NG',
    {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(
    new Date(
      `${value}T00:00:00Z`,
    ),
  );
}

function LegendMark({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 ${className}`}
      />

      {label}
    </span>
  );
}

function formatQuantity(
  value: number,
) {
  return new Intl.NumberFormat(
    'en-NG',
  ).format(value);
}

function formatChartDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'en-NG',
    {
      day: '2-digit',
      month: 'short',
    },
  ).format(
    new Date(
      `${value}T00:00:00Z`,
    ),
  );
}